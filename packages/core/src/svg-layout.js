import { normalizeFormula } from './symbols.js';

function box(width = 0, height = 0) {
  return { width, height, glyphs: [], bars: [], texts: [], regions: [] };
}

function place(target, child, x, y) {
  target.glyphs.push(...child.glyphs.map((g) => ({ ...g, x: g.x + x, y: g.y + y,
    ink: { minX: g.ink.minX + x, maxX: g.ink.maxX + x, minY: g.ink.minY + y, maxY: g.ink.maxY + y } })));
  target.bars.push(...child.bars.map((b) => ({ ...b, x1: b.x1 + x, x2: b.x2 + x, y: b.y + y })));
  target.texts.push(...child.texts.map((t) => ({ ...t, x: t.x + x, y: t.y + y })));
  target.regions.push(...child.regions.map((r) => ({ ...r, x: r.x + x, y: r.y + y })));
}

/** Measured SVG scene, internal to core. All positions include glyph ink bounds. */
export function layoutDocument(tree, typography, { maxWidth = 320, fontSize = 17, symbols } = {}) {
  const em = fontSize;
  const padding = em * 0.5;
  const gap = em;
  const thickness = em / 17;
  let nextOwner = 0;

  function textBox(text, face, role, context) {
    // Draw and measure exactly the same run. Trailing separators at an inserted
    // wrap remain in the logical text, but are excluded before shaping; in RTL
    // text they would otherwise move the visible glyphs as well as the advance.
    const shaped = typography.shape(role === 'formula' ? text.trimEnd() : text, face, context);
    const result = box(shaped.width, shaped.height);
    result.glyphs = shaped.glyphs;
    result.texts.push({ text: typography.expandTabs(text), role, x: 0, y: 0,
      width: shaped.width, height: shaped.height });
    return result;
  }

  function formula(value, width) {
    const normalized = normalizeFormula(value, symbols);
    const result = box();
    // Preserve every source break. Extra wraps keep the source line's indent.
    for (const raw of normalized.split('\n')) {
      const line = typography.expandTabs(raw);
      const indent = line.match(/^ */)[0];
      const embedding = typography.paragraphContext(line);
      let offset = indent.length;
      const tokens = [];
      for (const character of line.slice(indent.length)) {
        const breakable = /\s/u.test(character) && character !== '\u00a0' && character !== '\u202f';
        if (tokens.at(-1)?.breakable === breakable) tokens.at(-1).text += character;
        else tokens.push({ text: character, breakable, start: offset });
        offset += character.length;
      }
      const lines = [];
      let current = indent;
      let pending = '';
      let context = { embedding, start: 0, indent: 0 };
      for (const token of tokens) {
        if (token.breakable) { pending += token.text; continue; }
        const candidate = current + pending + token.text;
        if (current !== indent && typography.shape(candidate, 'regular', context).width > width) {
          // Spaces at an inserted wrap stay at the end of the preceding line.
          lines.push({ text: current + pending, context });
          current = indent + token.text;
          context = { embedding, start: token.start, indent: indent.length };
        } else current = candidate;
        pending = '';
      }
      lines.push({ text: current + pending, context });
      for (const { text, context } of lines) {
        const child = textBox(text, 'regular', 'formula', context);
        place(result, child, 0, result.height);
        result.width = Math.max(result.width, child.width);
        result.height += child.height;
      }
    }
    return result;
  }

  function inference(node, width, depth) {
    const owner = nextOwner++;
    const label = node.name ? textBox(node.name, 'italic', 'label') : null;
    const labelSpace = label ? label.width + em * 0.5 : 0;
    const available = Math.max(em * 3, width - labelSpace);
    const premises = node.premises.map((premise) => expression(premise, available, depth + 1));
    const conclusion = expression(node.conclusion, available, depth + 1);
    const rows = [];
    for (const [index, premise] of premises.entries()) {
      let row = rows.at(-1);
      if (!row || row.width + gap + premise.width > available) {
        row = { width: 0, height: 0, children: [] }; rows.push(row);
      }
      if (row.children.length) row.width += gap;
      row.children.push({ box: premise, index, x: row.width });
      row.width += premise.width;
      row.height = Math.max(row.height, premise.height);
    }
    const bodyWidth = Math.max(em * 3, conclusion.width, ...rows.map((r) => r.width));
    const result = box(bodyWidth + labelSpace);
    let y = 0;
    for (const row of rows) {
      for (const item of row.children) {
        const x = (bodyWidth - row.width) / 2 + item.x;
        const top = y + row.height - item.box.height;
        place(result, item.box, x, top);
        result.regions.push({ role: 'premise', owner, depth, text: node.premises[item.index].value ?? null,
          x, y: top, width: item.box.width, height: item.box.height });
      }
      y += row.height + gap;
    }
    if (rows.length) y -= gap;
    y += em * 0.5;
    // Leave enough room for a full label line above and below the bar.
    const barY = y + (label ? label.height / 2 : thickness / 2);
    result.bars.push({ owner, x1: 0, x2: bodyWidth, y: barY, thickness });
    if (label) {
      const x = bodyWidth + em * 0.5;
      place(result, label, x, barY - label.height / 2);
      result.regions.push({ role: 'label', owner, depth, x, y: barY - label.height / 2,
        width: label.width, height: label.height });
    }
    const conclusionY = barY + Math.max(thickness / 2, label ? label.height / 2 : thickness / 2) + em * 0.25;
    const conclusionX = (bodyWidth - conclusion.width) / 2;
    place(result, conclusion, conclusionX, conclusionY);
    result.regions.push({ role: 'conclusion', owner, depth, x: conclusionX, y: conclusionY,
      width: conclusion.width, height: conclusion.height });
    result.height = conclusionY + conclusion.height;
    result.regions.push({ role: 'rule', owner, depth, x: 0, y: 0, width: result.width, height: result.height });
    return result;
  }

  function expression(node, width, depth) {
    return node.type === 'formula' ? formula(node.value, width) : inference(node, width, depth);
  }

  const content = box();
  for (const node of tree.children) {
    const children = node.type === 'family' ? [
      textBox(node.name, 'bold', 'heading'),
      ...node.rules.map((rule) => inference(rule, maxWidth - 2 * padding, 0))
    ] : [inference(node, maxWidth - 2 * padding, 0)];
    for (const [index, child] of children.entries()) {
      if (content.height) content.height += em * (node.type === 'family' && index === 1 ? 0.75 : 1.5);
      place(content, child, 0, content.height);
      if (node.type === 'family' && index === 0) {
        content.regions.push({ role: 'heading', x: 0, y: content.height, width: child.width, height: child.height });
      }
      content.height += child.height;
      content.width = Math.max(content.width, child.width);
    }
  }
  const result = box(Math.max(em, content.width + padding * 2), Math.max(em, content.height + padding * 2));
  place(result, content, padding, padding);
  return result;
}
