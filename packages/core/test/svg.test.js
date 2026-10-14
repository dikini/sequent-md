import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { create } from 'fontkit';
import test from 'node:test';
import { SaxesParser } from 'saxes';
import { renderSvg } from '@sequent-md/core/svg';
import { parse, renderHast } from '../src/index.js';
import { loadTypography } from '../src/svg-fonts.js';
import { layoutDocument } from '../src/svg-layout.js';
import { paragraphContext } from '../src/svg-shaping.js';

const corpus = JSON.parse(await readFile(new URL('./fixtures/ash-pinned-corpus.json', import.meta.url)));
const continued = await readFile(new URL('./fixtures/sequent-continuation.sequent', import.meta.url), 'utf8');
const axiom = 'T-Int :=\n  ===>\n  GAMMA |- n ⇒ Int';
const options = { fontSize: 17, maxWidth: 320 };

function xml(source) {
  const nodes = [];
  const texts = [];
  const parser = new SaxesParser({ xmlns: true });
  parser.on('opentag', (node) => nodes.push(node));
  parser.on('text', (value) => texts.push(value));
  parser.write(source).close();
  return { nodes, text: texts.join('') };
}

function assertPortable(result) {
  assert.deepEqual(result.diagnostics, []);
  assert.ok(Number.isFinite(result.width) && result.width > 0);
  assert.ok(Number.isFinite(result.height) && result.height > 0);
  const { nodes } = xml(result.svg);
  assert.equal(nodes[0].name, 'svg');
  assert.equal(nodes[0].uri, 'http://www.w3.org/2000/svg');
  assert.equal(nodes[0].attributes.width.value, String(result.width));
  assert.equal(nodes[0].attributes.height.value, String(result.height));
  const allowed = new Set(['svg', 'title', 'desc', 'defs', 'path', 'g', 'use', 'line']);
  const ids = new Set(nodes.flatMap((n) => n.attributes.id ? [n.attributes.id.value] : []));
  for (const node of nodes) {
    assert.ok(allowed.has(node.local), node.local);
    for (const attr of Object.values(node.attributes)) {
      assert.ok(!attr.local.startsWith('on'));
      if (attr.local === 'href') {
        assert.ok(attr.value.startsWith('#'));
        assert.ok(ids.has(attr.value.slice(1)));
      }
    }
  }
}

test('SVG export works with default fonts and leaves the AST unchanged', async () => {
  const result = await renderSvg(axiom);
  assertPortable(result);
  assert.deepEqual(result.tree, parse(axiom).tree);
  assert.match(result.svg, /<path\b/);
  assert.match(result.svg, /<use\b/);
  assert.ok(xml(result.svg).text.includes(axiom));
});

test('all 36 pinned Ash fences export without missing glyphs or invalid bounds', async () => {
  const failures = [];
  for (const { path, fenceLine, source } of corpus.fences) {
    try { assertPortable(await renderSvg(source)); }
    catch (error) { failures.push(`${path}:${fenceLine}: ${error.message}`); }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('same source and pinned options produce byte-identical assets', async () => {
  const first = await renderSvg(continued, { title: 'Kind check', description: 'Continued judgment.' });
  assert.deepEqual(first, await renderSvg(continued, { title: 'Kind check', description: 'Continued judgment.' }));
});

test('invalid sequents return parser diagnostics without a successful SVG', async () => {
  const source = 'Broken :=\n  A';
  const result = await renderSvg(source);
  assert.deepEqual(result.tree, parse(source).tree);
  assert.deepEqual(result.diagnostics, parse(source).diagnostics);
  assert.equal(result.svg, null);
  assert.equal(result.width, null);
  assert.equal(result.height, null);
});

test('empty documents have positive transparent bounds', async () => {
  const result = await renderSvg('');
  assertPortable(result);
  assert.ok(result.width >= 17 && result.height >= 17);
});

test('small positive font sizes retain nonzero glyph transforms', async () => {
  const result = await renderSvg(axiom, { fontSize: 0.0001 });
  assertPortable(result);
  const { nodes } = xml(result.svg);
  const scales = nodes.filter((n) => n.local === 'use').map((n) =>
    Number(/scale\((\S+)/.exec(n.attributes.transform.value)[1]));
  assert.ok(scales.every((scale) => scale > 0));
});

test('packaged font assets match their recorded hashes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../fonts/manifest.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(manifest.files)) {
    const bytes = await readFile(new URL(`../fonts/${file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, file);
  }
});

test('the VS Code preview bundle excludes SVG code, font assets and fontkit', async () => {
  const result = await build({ entryPoints: [new URL('../../vscode/src/extension.js', import.meta.url).pathname],
    bundle: true, write: false, platform: 'node', format: 'cjs', target: 'node18', metafile: true });
  assert.ok(Object.keys(result.metafile.inputs).every((path) => !/fontkit|svg-(fonts|layout)|core\/src\/svg\.js|\.ttf$/.test(path)));
});

test('metadata preserves hostile literals without executable SVG elements', async () => {
  const source = 'Literal :=\n  ===>\n  <script> & https://example.org/a';
  const result = await renderSvg(source, { title: '"<unsafe>&', description: 'onload="bad"' });
  assertPortable(result);
  const text = xml(result.svg).text;
  assert.ok(text.includes(source));
  assert.ok(text.includes('"<unsafe>&'));
  assert.ok(text.includes('onload="bad"'));
});

test('canonical source retains CRLF through XML parsing', async () => {
  const source = 'Line-Endings :=\r\n  ===>\r\n  GAMMA |- A\r\n';
  const result = await renderSvg(source);
  assert.ok(xml(result.svg).text.includes(source));
});

for (const source of ['R :=\n  ===>\n  A\u0000B', 'R :=\n  ===>\n  \ud800']) {
  test('invalid XML characters fail explicitly', async () => {
    await assert.rejects(renderSvg(source), /XML|character|text/i);
  });
}

test('missing glyphs fail with the unsupported code point', async () => {
  await assert.rejects(renderSvg('R :=\n  ===>\n  \u{10ffff}'), /U\+10FFFF/i);
});

test('malformed supplied fonts fail with their face name', async () => {
  await assert.rejects(renderSvg(axiom, { fonts: { regular: new Uint8Array([1, 2, 3]) } }), /regular.*font|font.*regular/i);
});

test('custom font bytes replace a face and are used deterministically', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const result = await renderSvg(axiom, { fonts: { regular } });
  assertPortable(result);
  assert.notEqual(result.svg, (await renderSvg(axiom)).svg);
  assert.equal(result.svg, (await renderSvg(axiom, { fonts: { regular } })).svg);
});

test('explicit fallback arrays replace defaults and retain caller order', async () => {
  const serif = await readFile(new URL('../fonts/DejaVuSerif.ttf', import.meta.url));
  const mono = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const font = await typography({ fonts: { fallback: [serif, mono] } });
  assert.equal(font.shape('⊸').glyphs[0].fontKey, 'fallback-1');
  await assert.rejects(renderSvg('R :=\n  ===>\n  A -* B', { fonts: { fallback: [] } }), /U\+22B8/);
});

for (const [key, value] of [['fontSize', 0], ['fontSize', NaN], ['maxWidth', Infinity], ['maxWidth', -10]]) {
  test(`rejects invalid ${key} ${value}`, async () => {
    await assert.rejects(renderSvg(axiom, { [key]: value }), /positive|finite/i);
  });
}

const typography = async (overrides = {}) => loadTypography({ fontSize: 17, ...overrides });
const layout = async (source, overrides = {}) => layoutDocument(parse(source).tree, await typography(overrides), { ...options, ...overrides });

test('normalization matches HAST and covers built-in aliases including fallback lollipop', async () => {
  const notation = 'GAMMA DELTA TAU PI THETA SIGMA alpha beta gamma delta epsilon theta lambda mu pi tau eta rho sigma phi omega forall exists box diamond always eventually next until release tensor par with plus one zero bottom bot top union intersect <- -> <-> |- |= /\\ \\/ ~ -* -o';
  const source = `Aliases :=\n  ===>\n  ${notation}`;
  const scene = await layout(source, { symbols: { alpha: 'Ω' } });
  const text = scene.texts.filter((t) => t.role === 'formula').map((t) => t.text).join('');
  const hast = renderHast(source, { symbols: { alpha: 'Ω' } });
  function strings(n) { return n.type === 'text' ? n.value : (n.children ?? []).map(strings).join(''); }
  assert.equal(text, strings(hast.hast).replace('Aliases', ''));
  assert.ok(scene.glyphs.some((g) => g.fontKey === 'fallback-0'));
});

test('layout packs premises into rows and preserves source order', async () => {
  const source = 'Rows :=\n  first premise here\n  second premise here\n  third premise here\n  fourth premise here\n  ===>\n  conclusion';
  const scene = await layout(source);
  const premises = scene.regions.filter((r) => r.role === 'premise' && r.depth === 0);
  assert.equal(premises.length, 4);
  assert.ok(new Set(premises.map((p) => p.y + p.height)).size > 1);
  assert.deepEqual(premises.map((p) => p.text), ['first premise here', 'second premise here', 'third premise here', 'fourth premise here']);
  assert.ok(scene.width <= 320.001);
});

test('explicit continuation breaks and indentation survive additional wrapping', async () => {
  const source = 'Wrap :=\n  for each corresponding very long argument list,\n    GAMMA |- continued judgment with several words\n  ===>\n  result';
  const scene = await layout(source);
  const lines = scene.texts.filter((t) => t.role === 'formula');
  assert.ok(lines.length > 3);
  assert.ok(lines.some((t) => t.text.startsWith('  Γ')));
  assert.equal(parse(source).tree.children[0].premises.length, 1);
});

test('unbreakable tokens expand bounds rather than clipping or shrinking', async () => {
  const scene = await layout('Long :=\n  ===>\n  ' + 'unbreakable'.repeat(15));
  assert.ok(scene.width > 320);
});

test('breakable formulae honor target width despite spaces at inserted wraps', async () => {
  const scene = await layout('Quantified :=\n  for each corresponding argument and parameter in the environment,\n    DELTA; OMEGA; XI |- argument => kind(parameter)\n  GAMMA |- another premise with enough words to wrap across a narrow page\n  ===>\n  GAMMA |- the resulting expression has the expected computation type\n    with preserved hanging indentation');
  assert.ok(scene.width <= 320.000001, `breakable layout is ${scene.width}px wide`);
});

test('wrapped RTL glyphs use the same shaped run as their measured bounds', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const source = 'R :=\n  ===>\n  ا        ا';
  const scene = layoutDocument(parse(source).tree, await typography({ fonts: { regular } }),
    { fontSize: 17, maxWidth: 100 });
  assert.ok(scene.glyphs.every((g) => g.ink.minX >= 0 && g.ink.maxX <= scene.width),
    JSON.stringify({ width: scene.width, glyphs: scene.glyphs.map((g) => g.ink) }));
  assert.equal(scene.texts.filter((t) => t.role === 'formula').map((t) => t.text).join(''), 'ا        ا');
  assertPortable(await renderSvg(source, { maxWidth: 100, fonts: { regular } }));
});

test('same-face mixed-script text preserves Arabic joining and visual run order', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const font = create(regular);
  const t = await typography({ fonts: { regular } });
  const arabic = font.layout('سلام').glyphs.map((g) => g.id);
  const x = font.glyphForCodePoint('x'.codePointAt(0)).id;
  assert.deepEqual(t.shape('x سلام').glyphs.map((g) => g.glyphId), [x, ...arabic]);
  assert.deepEqual(t.shape('سلام x').glyphs.map((g) => g.glyphId), [x, ...arabic]);
  assertPortable(await renderSvg('R :=\n  ===>\n  x سلام', { fonts: { regular } }));
});

test('inserted wraps retain the original source line bidi context', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const font = create(regular);
  const scene = await layout('R :=\n  ===>\n  abcabcabcabc سلام def', { maxWidth: 170, fonts: { regular } });
  const lines = scene.texts.filter((t) => t.role === 'formula');
  assert.deepEqual(lines.map((t) => t.text), ['abcabcabcabc ', 'سلام def']);
  const glyphs = scene.glyphs.filter((g) => g.y >= lines[1].y && g.y < lines[1].y + lines[1].height);
  assert.deepEqual(glyphs.map((g) => g.glyphId), [...font.layout('سلام').glyphs.map((g) => g.id),
    ...font.layout('def').glyphs.map((g) => g.id)]);
});

test('supplementary bidi classes resolve as scalars and map to both surrogate offsets', () => {
  // AL, R, NSM, EN, L and ON, including paragraph and isolate boundaries.
  const scalars = ['\u{1EE00}', '\u{1E900}', '\u{1E944}', '\u{1D7CE}', '\u{1D400}', '\u{1F600}'];
  const bmp = ['ا', 'א', '\u0300', '0', 'A', '!'];
  for (const surround of [['x (', ') 12'], ['ا ', ' x'], ['x \u2067', '\u2069 x'], ['', '\nא']]) {
    const source = surround[0] + scalars.join('') + surround[1];
    const reference = surround[0] + bmp.join('') + surround[1];
    const actual = paragraphContext(source);
    const expected = paragraphContext(reference);
    let offset = 0;
    for (const [index, character] of [...source].entries()) {
      assert.deepEqual([...actual.levels.slice(offset, offset + character.length)],
        Array(character.length).fill(expected.levels[index]));
      offset += character.length;
    }
    assert.deepEqual(actual.paragraphs.map((p) => p.level), expected.paragraphs.map((p) => p.level));
  }
});

test('supplementary RTL scalars preserve glyph order in mixed text and inserted wraps', async () => {
  // Extend the bundled static font's cmap in memory, retaining its layout
  // tables and mapping mathematical Arabic scalars to covered Arabic outlines.
  const original = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const base = create(original);
  const letters = '\u{1EE00}\u{1EE01}\u{1EE02}';
  const mappings = [...base.characterSet.map((cp) => [cp, base.glyphForCodePoint(cp).id]),
    ...[...letters].map((char, i) => [char.codePointAt(0), base.glyphForCodePoint(0x627 + i).id])];
  const cmap = Buffer.alloc(28 + mappings.length * 12);
  cmap.writeUInt16BE(1, 2); cmap.writeUInt16BE(3, 4); cmap.writeUInt16BE(10, 6);
  cmap.writeUInt32BE(12, 8); cmap.writeUInt16BE(12, 12);
  cmap.writeUInt32BE(cmap.length - 12, 16); cmap.writeUInt32BE(mappings.length, 24);
  mappings.forEach(([cp, id], i) => {
    const offset = 28 + i * 12;
    cmap.writeUInt32BE(cp, offset); cmap.writeUInt32BE(cp, offset + 4); cmap.writeUInt32BE(id, offset + 8);
  });
  const regular = Buffer.concat([original, cmap]);
  for (let i = 0; i < regular.readUInt16BE(4); i += 1) {
    const offset = 12 + i * 16;
    if (regular.toString('ascii', offset, offset + 4) === 'cmap') {
      regular.writeUInt32BE(original.length, offset + 8); regular.writeUInt32BE(cmap.length, offset + 12);
    }
  }
  const font = create(regular);
  const expected = font.layout(letters, {}, undefined, undefined, 'rtl').glyphs.map((g) => g.id);
  const t = await typography({ fonts: { regular } });
  assert.deepEqual(t.shape(letters).glyphs.map((g) => g.glyphId), expected);
  const x = font.glyphForCodePoint(120).id;
  assert.deepEqual(t.shape('x ' + letters).glyphs.map((g) => g.glyphId), [x, ...expected]);
  assert.deepEqual(t.shape(letters + ' x').glyphs.map((g) => g.glyphId), [x, ...expected]);
  const scene = await layout('R :=\n  ===>\n  abcabcabcabc ' + letters + ' def', { maxWidth: 170, fonts: { regular } });
  const lines = scene.texts.filter((t) => t.role === 'formula');
  assert.deepEqual(lines.map((t) => t.text), ['abcabcabcabc ', letters + ' def']);
  assert.deepEqual(scene.glyphs.filter((g) => g.y >= lines[1].y && g.y < lines[1].y + lines[1].height)
    .map((g) => g.glyphId), [...expected, ...font.layout('def').glyphs.map((g) => g.id)]);
  assertPortable(await renderSvg('R :=\n  ===>\n  ' + letters, { fonts: { regular } }));
});

test('bidi runs retain LTR digits inside an RTL paragraph', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const font = create(regular);
  const t = await typography({ fonts: { regular } });
  const digits = font.layout('123').glyphs.map((g) => g.id);
  const arabic = font.layout('سلام').glyphs.map((g) => g.id);
  assert.deepEqual(t.shape('سلام 123').glyphs.map((g) => g.glyphId), [...digits, ...arabic]);
});

test('paired punctuation is mirrored once around LTR digits in RTL text', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const font = create(regular);
  const t = await typography({ fonts: { regular } });
  const expected = [font.glyphForCodePoint(40).id, ...font.layout('123').glyphs.map((g) => g.id),
    font.glyphForCodePoint(41).id, ...font.layout('سلام').glyphs.map((g) => g.id)];
  assert.deepEqual(t.shape('سلام (123)').glyphs.map((g) => g.glyphId), expected);
});

test('combining sequences stay together across same-face script boundaries', async () => {
  const regular = await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url));
  const font = create(regular);
  const t = await typography({ fonts: { regular } });
  const text = 'سَلام';
  const arabic = font.layout(text).glyphs.filter((g) => g.path.toSVG()).map((g) => g.id);
  const x = font.glyphForCodePoint('x'.codePointAt(0)).id;
  assert.deepEqual(t.shape('x ' + text).glyphs.map((g) => g.glyphId), [x, ...arabic]);
});

test('supplied fonts without a shaping engine fail explicitly for RTL text', async () => {
  const regular = Buffer.from(await readFile(new URL('../fonts/DejaVuSansMono.ttf', import.meta.url)));
  for (let i = 0; i < regular.readUInt16BE(4); i += 1) {
    const offset = 12 + i * 16;
    if (['GSUB', 'GPOS'].includes(regular.toString('ascii', offset, offset + 4))) {
      regular.write('none', offset, 4, 'ascii');
    }
  }
  const t = await typography({ fonts: { regular } });
  assert.ok(t.shape('abc').glyphs.length);
  assert.throws(() => t.shape('اب'), /RTL shaping requires.*regular/);
});

test('whitespace, tabs, combining glyphs and italic bearings are measured', async () => {
  const font = await typography();
  assert.ok(font.shape('A  B', 'regular').width > font.shape('A B', 'regular').width);
  assert.equal(font.shape('A\tB', 'regular').width, font.shape('A       B', 'regular').width);
  assert.ok(font.shape('e\u0301', 'regular').glyphs.length > 0);
  const italic = font.shape('f', 'italic');
  assert.ok(italic.width >= italic.ink.maxX - italic.ink.minX);
});

test('Unicode whitespace retains its advances and nonbreaking spaces stay within words', async () => {
  const scene = await layout('Space :=\n  ===>\n  A\u00a0B C\u2009D');
  assert.equal(scene.texts.filter((t) => t.role === 'formula').map((t) => t.text).join(''), 'A\u00a0B C\u2009D');
  const narrow = await layout('Space :=\n  ===>\n  aaaaa\u00a0bbbbb', { maxWidth: 90 });
  assert.deepEqual(narrow.texts.filter((t) => t.role === 'formula').map((t) => t.text), ['aaaaa\u00a0bbbbb']);
});

test('different normalized glyphs have distinct definition identifiers', async () => {
  const source = 'R :=\n  ===>\n  A';
  const first = xml((await renderSvg(source)).svg).nodes.filter((n) => n.local === 'path').map((n) => n.attributes.id.value);
  const second = xml((await renderSvg(source, { symbols: { A: 'B' } })).svg).nodes.filter((n) => n.local === 'path').map((n) => n.attributes.id.value);
  assert.ok(first.every((id) => !second.includes(id)));
});

test('nested premises and nested conclusions remain contained and aligned', async () => {
  const source = 'Outer :=\n  [ A\n    ===>\n    B ]\n  sibling\n  ===>\n  [ C\n    ===>\n    D ]';
  const scene = await layout(source);
  assert.equal(scene.bars.length, 3);
  for (const region of scene.regions) {
    assert.ok(region.x >= 0 && region.y >= 0);
    assert.ok(region.x + region.width <= scene.width + 0.001);
    assert.ok(region.y + region.height <= scene.height + 0.001);
  }
  for (const g of scene.glyphs) {
    assert.ok(g.ink.minX >= -0.001 && g.ink.maxX <= scene.width + 0.001);
    assert.ok(g.ink.minY >= -0.001 && g.ink.maxY <= scene.height + 0.001);
  }
  for (const bar of scene.bars) {
    const conclusion = scene.regions.find((r) => r.role === 'conclusion' && r.owner === bar.owner);
    assert.ok(conclusion.y > bar.y);
    assert.ok(Math.abs(conclusion.x + conclusion.width / 2 - (bar.x1 + bar.x2) / 2) < 0.001);
    const label = scene.regions.find((r) => r.role === 'label' && r.owner === bar.owner);
    if (label) assert.ok(label.x > bar.x2);
  }
});

test('families stack rules vertically beneath measured bold headings', async () => {
  const scene = await layout('family primitives:\n  Axiom :=\n    ===>\n    A\n\n  Second :=\n    ===>\n    B');
  const heading = scene.regions.find((r) => r.role === 'heading');
  const rules = scene.regions.filter((r) => r.role === 'rule');
  assert.ok(heading.y + heading.height < rules[0].y);
  assert.ok(rules[0].y + rules[0].height < rules[1].y);
  assert.ok(scene.glyphs.some((g) => g.fontKey === 'bold'));
});

test('long rule labels are outside the bar and inside the expanded viewport', async () => {
  const scene = await layout('Very-Long-Rule-Label-'.repeat(12) + 'End :=\n  ===>\n  A');
  const label = scene.regions.find((r) => r.role === 'label');
  assert.ok(label.x > scene.bars[0].x2);
  assert.ok(label.x + label.width <= scene.width);
  assert.ok(scene.width > 320);
});

test('unequal-height siblings in the same row align their bottom edges', async () => {
  const scene = await layout('Alignment :=\n  A\n    B\n  C\n  ===>\n  D', { maxWidth: 640 });
  const premises = scene.regions.filter((r) => r.role === 'premise' && r.depth === 0);
  assert.equal(premises.length, 2);
  assert.notEqual(premises[0].height, premises[1].height);
  assert.equal(premises[0].y + premises[0].height, premises[1].y + premises[1].height);
});
