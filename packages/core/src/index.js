const DEFAULT_SYMBOLS = {
  '<->': '↔',
  '->': '→',
  '<-': '←',
  '|-': '⊢',
  '|=': '⊨',
  '/\\': '∧',
  '\\/': '∨',
  '~': '¬',
  forall: '∀',
  exists: '∃',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  tau: 'τ',
  eta: 'η',
  box: '□',
  diamond: '◇',
  union: '∪',
  intersect: '∩'
};

const identifier = '[A-Za-z_][A-Za-z0-9_]*';
const ruleHeader = new RegExp(`^(${identifier})\\s*(?::=|::=)$`);
const familyHeader = new RegExp(`^family\\s+(${identifier}):$`);

export const styles = `
.sequent-document { display: grid; gap: 1.5rem; }
.sequent-family { display: grid; gap: .75rem; }
.sequent-family > h3 { margin: 0; font: inherit; font-weight: 600; }
.sequent-family-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--sequent-family-min-width, 22rem)), 1fr)); }
.sequent-proof { display: inline-grid; justify-items: stretch; min-width: max-content; margin: 0; padding: .5rem; }
.sequent-premises { display: flex; align-items: end; justify-content: center; gap: 1rem; }
.sequent-inference { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .5rem; width: 100%; min-height: 1.25rem; }
.sequent-bar { border-top: 1px solid currentColor; min-width: 3rem; }
.sequent-rule-label { font-style: italic; white-space: nowrap; }
.sequent-conclusion { justify-self: center; margin-top: .25rem; white-space: pre-wrap; }
.sequent-formula { white-space: pre-wrap; }
.sequent-proof-container { overflow-x: auto; }
.sequent-diagnostic { border-left: .25rem solid #b42318; background: #fff1f0; color: #5c1111; padding: .75rem; white-space: pre-wrap; }
`;

export function parse(source) {
  const state = createState(source);
  const children = parseRules(state, 0);

  return {
    tree: { type: 'document', children },
    diagnostics: state.diagnostics
  };
}

export function render(source, options = {}) {
  const result = parse(source);
  if (result.diagnostics.length > 0) {
    return {
      ...result,
      html: renderDiagnostic(source, result.diagnostics)
    };
  }

  return {
    ...result,
    html: `<div class="sequent-document">${result.tree.children.map((node) => renderNode(node, options)).join('')}</div>`
  };
}

export function renderHast(source, options = {}) {
  const result = parse(source);
  return {
    ...result,
    hast: result.diagnostics.length > 0
      ? element('pre', { className: ['sequent-diagnostic'], role: 'alert' }, [text(`${result.diagnostics.map(({ line, column, message }) => `Line ${line}, column ${column}: ${message}`).join('\n')}\n\n${source}`)])
      : element('div', { className: ['sequent-document'] }, result.tree.children.map((node) => renderHastNode(node, options)))
  };
}

function createState(source) {
  return {
    lines: String(source).replace(/\r\n?/g, '\n').split('\n').map((raw, index) => ({
      raw,
      text: raw.trim(),
      indent: raw.match(/^ */)[0].length,
      line: index + 1
    })),
    cursor: 0,
    diagnostics: []
  };
}

function parseRules(state, indent) {
  const nodes = [];

  while (state.cursor < state.lines.length) {
    const current = state.lines[state.cursor];
    if (current.text === '') {
      state.cursor += 1;
      continue;
    }
    if (current.indent < indent) break;
    if (current.indent > indent) {
      diagnostic(state, current, 'Unexpected indentation; a rule header must align with its siblings.');
      skipIndentedBlock(state, indent);
      continue;
    }

    const family = current.text.match(familyHeader);
    if (family) {
      nodes.push(parseFamily(state, family[1], indent));
      continue;
    }

    const header = current.text.match(ruleHeader);
    if (header) {
      const node = parseNamedRule(state, header[1], indent);
      if (node) nodes.push(node);
      continue;
    }

    diagnostic(state, current, 'Expected a rule definition or a family declaration.');
    state.cursor += 1;
  }

  return nodes;
}

function parseFamily(state, name, parentIndent) {
  const header = state.lines[state.cursor];
  state.cursor += 1;
  const childIndent = nextContentIndent(state);
  if (childIndent === null || childIndent <= parentIndent) {
    diagnostic(state, header, 'A family must contain indented rule definitions.');
    return { type: 'family', name, rules: [] };
  }

  const rules = parseRules(state, childIndent).filter((node) => node.type === 'inference');
  return { type: 'family', name, rules };
}

function parseNamedRule(state, name, parentIndent) {
  const header = state.lines[state.cursor];
  state.cursor += 1;
  const childIndent = nextContentIndent(state);
  if (childIndent === null || childIndent <= parentIndent) {
    diagnostic(state, header, 'A rule definition must contain an indented inference.');
    return null;
  }

  const body = [];
  while (state.cursor < state.lines.length) {
    const current = state.lines[state.cursor];
    if (current.text !== '' && current.indent <= parentIndent) break;
    state.cursor += 1;
    if (current.text !== '') body.push(current);
  }

  const tokenized = tokenizeBody(body);
  if (!validateBodyIndentation(body, childIndent, tokenized.depthByLine, state)) return null;
  const node = parseInferenceTokens(tokenized.tokens, state, header.line);
  if (node) node.name = name;
  return node;
}

function nextContentIndent(state) {
  let index = state.cursor;
  while (index < state.lines.length && state.lines[index].text === '') index += 1;
  return index < state.lines.length ? state.lines[index].indent : null;
}

function skipIndentedBlock(state, parentIndent) {
  while (state.cursor < state.lines.length) {
    const current = state.lines[state.cursor];
    if (current.text !== '' && current.indent <= parentIndent) return;
    state.cursor += 1;
  }
}

function tokenizeBody(lines) {
  const tokens = [];
  const depthByLine = new Map();
  let depth = 0;
  for (const line of lines) {
    depthByLine.set(line.line, depth);
    const result = tokenizeLine(line.text, line.line, depth);
    tokens.push(...result.tokens);
    depth = result.depth;
  }
  return { tokens, depthByLine };
}

function tokenizeLine(text, line, initialDepth) {
  if (text === '=>' || text === '===>') return { tokens: [{ type: 'deduction', line }], depth: initialDepth };
  const tokens = [];
  let buffer = '';
  let depth = initialDepth;
  const flush = () => {
    const value = buffer.trim();
    if (value) tokens.push({ type: 'formula', value, line });
    buffer = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const previous = text[index - 1] ?? ' ';
    const next = text[index + 1] ?? ' ';
    const hasSpaceBefore = /\s/.test(previous);
    const closeBoundary = /\s/.test(next) || next === '|' || next === ']';

    if (character === '[' && (depth > 0 || index === 0 || hasSpaceBefore)) {
      flush();
      tokens.push({ type: 'open', line });
      depth += 1;
      continue;
    }
    if (character === ']' && depth > 0 && closeBoundary) {
      flush();
      tokens.push({ type: 'close', line });
      depth -= 1;
      continue;
    }
    if (character === '|' && next !== '-' && next !== '=') {
      flush();
      tokens.push({ type: 'pipe', line });
      continue;
    }
    buffer += character;
  }
  flush();
  return { tokens, depth };
}

function validateBodyIndentation(lines, childIndent, depthByLine, state) {
  let valid = true;
  for (const line of lines) {
    if (line.indent > childIndent && depthByLine.get(line.line) === 0) {
      diagnostic(state, line, 'Unexpected indentation outside a bracketed derivation.');
      valid = false;
    }
  }
  return valid;
}

function parseInferenceTokens(tokens, state, fallbackLine) {
  if (!validateBracketBalance(tokens, state)) return null;
  const split = findTopLevelDeduction(tokens);
  if (split === -1) {
    diagnostic(state, { line: fallbackLine }, 'Expected a deduction operator (`=>` or `===>`).');
    return null;
  }
  const premiseTokens = tokens.slice(0, split);
  const conclusionTokens = tokens.slice(split + 1);
  const premises = parseExpressions(premiseTokens, state, fallbackLine, { allowEmpty: true });
  const conclusions = parseExpressions(conclusionTokens, state, fallbackLine);

  if (premises === null || conclusions === null) return null;
  if (conclusions.length !== 1) {
    diagnostic(state, { line: fallbackLine }, 'An inference must have exactly one conclusion.');
    return null;
  }
  return { type: 'inference', name: null, premises, conclusion: conclusions[0] };
}

function validateBracketBalance(tokens, state) {
  const openings = [];
  for (const token of tokens) {
    if (token.type === 'open') openings.push(token);
    if (token.type === 'close') {
      if (openings.length === 0) {
        diagnostic(state, token, 'Unexpected closing bracket.');
        return false;
      }
      openings.pop();
    }
  }
  if (openings.length > 0) {
    diagnostic(state, openings.at(-1), 'Unclosed bracketed derivation.');
    return false;
  }
  return true;
}

function findTopLevelDeduction(tokens) {
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].type === 'open') depth += 1;
    if (tokens[index].type === 'close') depth -= 1;
    if (tokens[index].type === 'deduction' && depth === 0) return index;
  }
  return -1;
}

function parseExpressions(tokens, state, fallbackLine, { allowEmpty = false } = {}) {
  const expressions = [];
  let expectsExpression = true;
  let sawSeparator = false;
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    if (token.type === 'pipe') {
      if (expectsExpression) {
        diagnostic(state, token, 'A premise separator must separate two premises.');
        return null;
      }
      expectsExpression = true;
      sawSeparator = true;
      index += 1;
      continue;
    }
    if (token.type === 'formula') {
      expressions.push({ type: 'formula', value: token.value });
      expectsExpression = false;
      index += 1;
      continue;
    }
    if (token.type === 'open') {
      const end = findMatchingClose(tokens, index);
      if (end === -1) {
        diagnostic(state, token, 'Unclosed bracketed derivation.');
        return null;
      }
      const inner = tokens.slice(index + 1, end);
      const expression = parseBracketGroup(inner, state, token.line);
      if (expression === null) return null;
      expressions.push(expression);
      expectsExpression = false;
      index = end + 1;
      continue;
    }
    diagnostic(state, token, 'Unexpected structural token.');
    return null;
  }

  if (expressions.length === 0) {
    if (allowEmpty) return expressions;
    diagnostic(state, { line: fallbackLine }, 'Expected at least one premise or conclusion.');
    return null;
  }
  if (sawSeparator && expectsExpression) {
    diagnostic(state, tokens.at(-1), 'A premise separator must be followed by a premise.');
    return null;
  }
  return expressions;
}

function parseBracketGroup(tokens, state, fallbackLine) {
  if (findTopLevelDeduction(tokens) !== -1) {
    return parseInferenceTokens(tokens, state, fallbackLine);
  }
  const expressions = parseExpressions(tokens, state, fallbackLine);
  if (expressions === null) return null;
  if (expressions.length !== 1) {
    diagnostic(state, { line: fallbackLine }, 'A bracket group without a deduction must contain exactly one formula.');
    return null;
  }
  return expressions[0];
}

function findMatchingClose(tokens, start) {
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].type === 'open') depth += 1;
    if (tokens[index].type === 'close') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function diagnostic(state, position, message) {
  state.diagnostics.push({ line: position.line, column: 1, message });
}

function renderNode(node, options) {
  if (node.type === 'family') {
    const id = `sequent-family-${slug(node.name)}`;
    return `<section class="sequent-family" aria-labelledby="${id}"><h3 id="${id}">${escapeHtml(node.name)}</h3><div class="sequent-family-grid">${node.rules.map((rule) => renderNode(rule, options)).join('')}</div></section>`;
  }
  if (node.type === 'formula') return `<span class="sequent-formula">${renderFormula(node.value, options)}</span>`;
  const premises = node.premises.map((premise) => renderNode(premise, options)).join('');
  const label = node.name ? `<span class="sequent-rule-label">${escapeHtml(node.name)}</span>` : '';
  return `<div class="sequent-proof-container"><figure class="sequent-proof"><div class="sequent-premises">${premises}</div><div class="sequent-inference"><span class="sequent-bar"></span>${label}</div><figcaption class="sequent-conclusion">${renderNode(node.conclusion, options)}</figcaption></figure></div>`;
}

function renderHastNode(node, options) {
  if (node.type === 'family') {
    const id = `sequent-family-${slug(node.name)}`;
    return element('section', { className: ['sequent-family'], ariaLabelledBy: id }, [
      element('h3', { id }, [text(node.name)]),
      element('div', { className: ['sequent-family-grid'] }, node.rules.map((rule) => renderHastNode(rule, options)))
    ]);
  }
  if (node.type === 'formula') return element('span', { className: ['sequent-formula'] }, [text(applyAliases(node.value, { ...DEFAULT_SYMBOLS, ...(options.symbols ?? {}) }))]);
  const label = node.name ? [element('span', { className: ['sequent-rule-label'] }, [text(node.name)])] : [];
  return element('div', { className: ['sequent-proof-container'] }, [
    element('figure', { className: ['sequent-proof'] }, [
      element('div', { className: ['sequent-premises'] }, node.premises.map((premise) => renderHastNode(premise, options))),
      element('div', { className: ['sequent-inference'] }, [element('span', { className: ['sequent-bar'] }, []), ...label]),
      element('figcaption', { className: ['sequent-conclusion'] }, [renderHastNode(node.conclusion, options)])
    ])
  ]);
}

function element(tagName, properties, children) {
  return { type: 'element', tagName, properties, children };
}

function text(value) {
  return { type: 'text', value };
}

function renderFormula(value, options) {
  return escapeHtml(applyAliases(value, { ...DEFAULT_SYMBOLS, ...(options.symbols ?? {}) }));
}

function applyAliases(value, symbols) {
  const entries = Object.entries(symbols).sort(([left], [right]) => right.length - left.length);
  return entries.reduce((text, [alias, symbol]) => {
    const escaped = escapeRegExp(alias);
    if (/^[A-Za-z][A-Za-z0-9_]*$/.test(alias)) {
      return text.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'gu'), symbol);
    }
    return text.replace(new RegExp(escaped, 'g'), symbol);
  }, value);
}

function renderDiagnostic(source, diagnostics) {
  const summary = diagnostics.map(({ line, column, message }) => `Line ${line}, column ${column}: ${message}`).join('\n');
  return `<pre class="sequent-diagnostic" role="alert">${escapeHtml(`${summary}\n\n${source}`)}</pre>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slug(value) {
  return value.replace(/[^A-Za-z0-9_-]/g, '-');
}
