import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { create } from 'fontkit';

const defaultFiles = {
  regular: 'DejaVuSerif.ttf', italic: 'DejaVuSerif-Italic.ttf',
  bold: 'DejaVuSerif-Bold.ttf', 'fallback-0': 'DejaVuSansMono.ttf'
};
let defaultFonts;

function decodeFont(bytes, name) {
  try {
    if (!(bytes instanceof Uint8Array)) throw new Error('expected font bytes');
    const buffer = Buffer.from(bytes);
    const font = create(buffer);
    if (typeof font.layout !== 'function' || Object.keys(font.variationAxes ?? {}).length) {
      throw new Error('a static outline font is required; collections and variable fonts are unsupported');
    }
    return { font, key: name, hash: createHash('sha256').update(buffer).digest('hex') };
  } catch (error) {
    throw new Error(`Invalid ${name} font: ${error.message}`, { cause: error });
  }
}

async function defaults() {
  defaultFonts ??= Promise.all(Object.entries(defaultFiles).map(async ([name, file]) =>
    [name, decodeFont(await readFile(new URL(`../fonts/${file}`, import.meta.url)), name)]
  )).then(Object.fromEntries);
  return defaultFonts;
}

function expandTabs(text) {
  let column = 0;
  return [...text].map((character) => {
    if (character === '\t') {
      const count = 8 - column % 8;
      column += count;
      return ' '.repeat(count);
    }
    column += 1;
    return character;
  }).join('');
}

/** Internal font service; never imported by the HTML preview entry point. */
export async function loadTypography({ fontSize = 17, fonts = {} } = {}) {
  const bundled = await defaults();
  const faces = {};
  for (const name of ['regular', 'italic', 'bold']) {
    faces[name] = fonts[name] === undefined ? bundled[name] : decodeFont(fonts[name], name);
  }
  if (fonts.fallback !== undefined && !Array.isArray(fonts.fallback)) {
    throw new Error('Invalid fallback fonts: expected an ordered array of font bytes.');
  }
  const fallbacks = fonts.fallback === undefined ? [bundled['fallback-0']]
    : fonts.fallback.map((bytes, index) => decodeFont(bytes, `fallback-${index}`));
  const cache = new Map();
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

  function shape(input, role = 'regular') {
    const text = expandTabs(input);
    const key = `${role}\0${text}`;
    if (cache.has(key)) return cache.get(key);
    const runs = [];
    for (const { segment } of segmenter.segment(text)) {
      const points = [...segment].map((character) => character.codePointAt(0));
      const face = [faces[role], ...fallbacks].find(({ font }) =>
        points.every((point) => font.hasGlyphForCodePoint(point)));
      if (!face) {
        const missing = points.filter((point) => ![faces[role], ...fallbacks]
          .some(({ font }) => font.hasGlyphForCodePoint(point)));
        const names = (missing.length ? missing : points).map((point) => `U+${point.toString(16).toUpperCase().padStart(4, '0')}`);
        throw new Error(`Missing glyph coverage for ${names.join(', ')} in ${role} text: ${JSON.stringify(input)}`);
      }
      if (runs.at(-1)?.face === face) runs.at(-1).text += segment;
      else runs.push({ face, text: segment });
    }

    const glyphs = [];
    let advance = 0;
    let ascent = faces[role].font.ascent / faces[role].font.unitsPerEm * fontSize;
    let descent = -faces[role].font.descent / faces[role].font.unitsPerEm * fontSize;
    const ink = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    for (const { face, text: runText } of runs) {
      const run = face.font.layout(runText);
      const scale = fontSize / face.font.unitsPerEm;
      ascent = Math.max(ascent, face.font.ascent * scale);
      descent = Math.max(descent, -face.font.descent * scale);
      for (let i = 0; i < run.glyphs.length; i += 1) {
        const glyph = run.glyphs[i];
        if (glyph.id === 0) throw new Error(`Missing shaped glyph in ${role} text: ${JSON.stringify(input)}`);
        const position = run.positions[i];
        const x = advance + position.xOffset * scale;
        const y = -position.yOffset * scale;
        const path = glyph.path.toSVG();
        if (path) {
          const bounds = glyph.bbox;
          const box = { minX: x + bounds.minX * scale, maxX: x + bounds.maxX * scale,
            minY: y - bounds.maxY * scale, maxY: y - bounds.minY * scale };
          glyphs.push({ fontKey: face.key, fontHash: face.hash, glyphId: glyph.id, path, x, y, scale, ink: box });
          ink.minX = Math.min(ink.minX, box.minX);
          ink.maxX = Math.max(ink.maxX, box.maxX);
          ink.minY = Math.min(ink.minY, box.minY);
          ink.maxY = Math.max(ink.maxY, box.maxY);
        } else if (glyph.codePoints.some((point) => !/\s/u.test(String.fromCodePoint(point)))) {
          throw new Error(`Glyph U+${glyph.codePoints[0]?.toString(16).toUpperCase()} has no supported outline in ${role} font.`);
        }
        advance += position.xAdvance * scale;
      }
    }
    const left = -Math.min(0, ink.minX);
    const baseline = Math.max(ascent, -ink.minY);
    const width = Math.max(advance, ink.maxX) + left;
    const height = Math.max(fontSize * 1.3, baseline + descent, baseline + ink.maxY);
    for (const glyph of glyphs) {
      glyph.x += left; glyph.y += baseline;
      glyph.ink = { minX: glyph.ink.minX + left, maxX: glyph.ink.maxX + left,
        minY: glyph.ink.minY + baseline, maxY: glyph.ink.maxY + baseline };
    }
    const result = { text, width, height, baseline, glyphs,
      ink: { minX: ink.minX + left, maxX: ink.maxX + left, minY: ink.minY + baseline, maxY: ink.maxY + baseline } };
    cache.set(key, result);
    return result;
  }
  return { shape, expandTabs, fontSize };
}
