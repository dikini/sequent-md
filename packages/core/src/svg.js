import { createHash } from 'node:crypto';
import { parse } from './index.js';
import { loadTypography } from './svg-fonts.js';
import { layoutDocument } from './svg-layout.js';

const escapeXml = (value) => String(value).replace(/[&<>"'\r]/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;', '\r': '&#13;'
})[c]);
const number = (value) => String(Number(value.toPrecision(15)));

function validateText(value) {
  for (const character of value) {
    const point = character.codePointAt(0);
    if (!(point === 9 || point === 10 || point === 13 || (point >= 0x20 && point <= 0xd7ff)
      || (point >= 0xe000 && point <= 0xfffd) || (point >= 0x10000 && point <= 0x10ffff))) {
      throw new Error(`Invalid XML character U+${point.toString(16).toUpperCase()} in export text.`);
    }
  }
}

function describe(tree) {
  const lines = [];
  function visit(node) {
    if (node.type === 'formula') return node.value;
    if (node.type === 'family') {
      lines.push(`Family ${node.name}.`);
      node.rules.forEach(visit);
      return;
    }
    lines.push(`${node.name ?? 'Nested inference'}: ${node.premises.length} premise(s).`);
    node.premises.forEach((p, i) => lines.push(`Premise ${i + 1}: ${p.type === 'formula' ? p.value : 'nested inference'}.`));
    lines.push(`Conclusion: ${node.conclusion.type === 'formula' ? node.conclusion.value : 'nested inference'}.`);
    node.premises.filter((p) => p.type !== 'formula').forEach(visit);
    if (node.conclusion.type !== 'formula') visit(node.conclusion);
  }
  tree.children.forEach(visit);
  return lines.join('\n') || 'Empty sequent document.';
}

/** Export a self-contained outlined SVG. Only this entry point loads fonts. */
export async function renderSvg(source, options = {}) {
  source = String(source);
  const result = parse(source);
  if (result.diagnostics.length) return { ...result, svg: null, width: null, height: null };
  const fontSize = options.fontSize ?? 17;
  const maxWidth = options.maxWidth ?? 320;
  for (const [name, value] of Object.entries({ fontSize, maxWidth })) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a finite positive number.`);
    }
  }
  const title = String(options.title ?? (result.tree.children.length === 1
    ? result.tree.children[0].name : 'Sequent proof document'));
  const description = `${options.description ?? describe(result.tree)}\n\nSource (sequent):\n${source}`;
  [source, title, description].forEach(validateText);
  const typography = await loadTypography({ fontSize, fonts: options.fonts });
  const scene = layoutDocument(result.tree, typography, { ...options, fontSize, maxWidth });
  const width = Math.ceil(scene.width * 1e6) / 1e6;
  const height = Math.ceil(scene.height * 1e6) / 1e6;
  if (![width, height].every((n) => Number.isFinite(n) && n > 0)) throw new Error('Export layout has invalid bounds.');
  const prefix = 'sq-' + createHash('sha256').update(source + title + description)
    .update(JSON.stringify(scene.glyphs.map((g) => [g.fontHash, g.glyphId]))).digest('hex').slice(0, 16);
  const definitions = new Map();
  const uses = scene.glyphs.map((glyph) => {
    const key = `${glyph.fontHash}-${glyph.glyphId}`;
    if (!definitions.has(key)) definitions.set(key, { id: `${prefix}-g${definitions.size}`, path: glyph.path });
    return `<use href="#${definitions.get(key).id}" transform="translate(${number(glyph.x)} ${number(glyph.y)}) scale(${number(glyph.scale)} ${number(-glyph.scale)})"/>`;
  }).join('');
  const paths = [...definitions.values()].map(({ id, path }) => `<path id="${id}" d="${escapeXml(path)}"/>`).join('');
  const bars = scene.bars.map((bar) => `<line x1="${number(bar.x1)}" y1="${number(bar.y)}" x2="${number(bar.x2)}" y2="${number(bar.y)}" stroke="#111" stroke-width="${number(bar.thickness)}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${prefix}-title" aria-describedby="${prefix}-desc">`
    + `<title id="${prefix}-title">${escapeXml(title)}</title><desc id="${prefix}-desc">${escapeXml(description)}</desc>`
    + `<defs>${paths}</defs><g fill="#111">${uses}</g>${bars}</svg>`;
  return { ...result, svg, width, height };
}
