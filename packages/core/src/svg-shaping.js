import bidiFactory from 'bidi-js';
import { getScript } from 'unicode-properties';

const bidi = bidiFactory();
const neutralScripts = new Set(['Common', 'Inherited', 'Unknown']);
const representatives = new Map();
let nextRepresentative = 0;

function scalarView(text) {
  const offsets = [];
  let offset = 0;
  const characters = [...text].map((character) => {
    offsets.push(offset);
    offset += character.length;
    if (character.length === 1) return character;
    // bidi-js's classifier accepts scalars, but its UBA loops index UTF-16
    // units. Give those loops one BMP character per scalar, preserving each
    // bidi class. Retain real BMP punctuation for bracket-pair resolution.
    const type = bidi.getBidiCharTypeName(character);
    while (!representatives.has(type) && nextRepresentative <= 0xffff) {
      const candidate = String.fromCharCode(nextRepresentative++);
      const name = bidi.getBidiCharTypeName(candidate);
      if (!representatives.has(name)) representatives.set(name, candidate);
    }
    if (!representatives.has(type)) throw new Error(`Unsupported bidi class: ${type}`);
    return representatives.get(type);
  });
  offsets.push(offset);
  return { text: characters.join(''), offsets };
}

/** Resolve bidi once per explicit source line, before inserting visual wraps. */
export function paragraphContext(text) {
  const scalars = scalarView(text);
  const resolved = bidi.getEmbeddingLevels(scalars.text);
  const levels = new Uint8Array(text.length);
  resolved.levels.forEach((level, index) => levels.fill(level, scalars.offsets[index], scalars.offsets[index + 1]));
  return { levels, paragraphs: resolved.paragraphs.map(({ start, end, level }) => ({
    start: scalars.offsets[start], end: scalars.offsets[end + 1] - 1, level
  })) };
}

// Synthetic hanging indentation uses the original paragraph base level.
export function sliceContext(context, start, length, indent = 0) {
  const level = context.paragraphs[0]?.level ?? 0;
  const levels = new Uint8Array(length).fill(level);
  levels.set(context.levels.slice(start, start + length - indent), indent);
  return { levels, paragraphs: [{ start: 0, end: length - 1, level }] };
}

/** Resolve logical graphemes into homogeneous shaping runs in visual order. */
export function shapingRuns(text, segmenter, selectFace, embedding = paragraphContext(text)) {
  const clusters = [...segmenter.segment(text)].map(({ segment, index }) => {
    let offset = index;
    const rendered = [...segment].map((character) => {
      const replacement = embedding.levels[offset] % 2 ? bidi.getMirroredCharacter(character) ?? character : character;
      offset += character.length;
      return replacement;
    }).join('');
    const points = [...rendered].map((character) => character.codePointAt(0));
    const script = points.map(getScript).find((name) => !neutralScripts.has(name)) ?? null;
    return { text: rendered, start: index, end: index + segment.length,
      level: embedding.levels[index], script, face: selectFace(points) };
  });

  // Common/inherited characters stay with a neighboring strong script at the
  // same embedding level. This keeps spaces and marks from breaking joining.
  const previousScripts = new Map();
  for (const cluster of clusters) {
    if (cluster.script) previousScripts.set(cluster.level, cluster.script);
    else cluster.script = previousScripts.get(cluster.level) ?? null;
  }
  const nextScripts = new Map();
  for (let i = clusters.length - 1; i >= 0; i -= 1) {
    const cluster = clusters[i];
    if (cluster.script) nextScripts.set(cluster.level, cluster.script);
    else cluster.script = nextScripts.get(cluster.level) ?? null;
  }

  const logical = [];
  const runAtIndex = [];
  for (const cluster of clusters) {
    let run = logical.at(-1);
    if (!run || run.face !== cluster.face || run.script !== cluster.script || run.level !== cluster.level) {
      run = { face: cluster.face, script: cluster.script, level: cluster.level,
        direction: cluster.level % 2 ? 'rtl' : 'ltr', text: '' };
      logical.push(run);
    }
    run.text += cluster.text;
    for (let index = cluster.start; index < cluster.end; index += 1) runAtIndex[index] = logical.length - 1;
  }

  // Reorder whole runs, not graphemes or UTF-16 code units: Fontkit shapes each
  // original logical run and handles its glyph order using explicit direction.
  const seen = new Set();
  const visual = [];
  const scalars = scalarView(text);
  const scalarIndices = new Map(scalars.offsets.map((offset, index) => [offset, index]));
  const scalarEmbedding = {
    levels: Uint8Array.from(scalars.offsets.slice(0, -1), (offset) => embedding.levels[offset]),
    paragraphs: embedding.paragraphs.map(({ start, end, level }) => ({
      start: scalarIndices.get(start), end: scalarIndices.get(end + 1) - 1, level
    }))
  };
  for (const scalarIndex of bidi.getReorderedIndices(scalars.text, scalarEmbedding)) {
    const index = scalars.offsets[scalarIndex];
    const runIndex = runAtIndex[index];
    if (!seen.has(runIndex)) {
      seen.add(runIndex);
      visual.push(logical[runIndex]);
    }
  }
  return visual;
}
