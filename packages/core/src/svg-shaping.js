import bidiFactory from 'bidi-js';
import { getScript } from 'unicode-properties';

const bidi = bidiFactory();
const neutralScripts = new Set(['Common', 'Inherited', 'Unknown']);

/** Resolve bidi once per explicit source line, before inserting visual wraps. */
export function paragraphContext(text) {
  return bidi.getEmbeddingLevels(text);
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
  const mirrored = bidi.getMirroredCharactersMap(text, embedding.levels);
  const clusters = [...segmenter.segment(text)].map(({ segment, index }) => {
    let offset = index;
    const rendered = [...segment].map((character) => {
      const replacement = mirrored.get(offset) ?? character;
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
  for (const index of bidi.getReorderedIndices(text, embedding)) {
    const runIndex = runAtIndex[index];
    if (!seen.has(runIndex)) {
      seen.add(runIndex);
      visual.push(logical[runIndex]);
    }
  }
  return visual;
}
