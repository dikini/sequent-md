import assert from 'node:assert/strict';
import test from 'node:test';

import { parse, render, renderHast, styles } from '../src/index.js';

test('renders a named inference with normalized symbols', () => {
  const result = render(`Identity :=
  A |- A
  ===>
  A |- A`);

  assert.equal(result.diagnostics.length, 0);
  assert.match(result.html, /class="sequent-proof"/);
  assert.match(result.html, /A ⊢ A/);
  assert.match(result.html, /Identity/);
});

test('parses bracketed sibling derivations recursively', () => {
  const result = parse(`Outer :=
  [
    [ Γ |- A ] [ Γ |- B ]
    ===>
    Γ |- A /\\ B
  ]
  [
    [ Γ |- D ] [ Γ |- F ]
    ===>
    Γ |- D /\\ F
  ]
  ===>
  Δ |- C`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].type, 'inference');
  assert.equal(result.tree.children[0].premises.length, 2);
  assert.equal(result.tree.children[0].premises[0].premises.length, 2);
});

test('parses a related family as independent rules', () => {
  const result = parse(`family conjunction:
  AndIntro :=
    [ Γ |- A ] [ Γ |- B ]
    ===>
    Γ |- A /\\ B

  AndElimLeft :=
    Γ |- A /\\ B
    ===>
    Γ |- A`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].type, 'family');
  assert.equal(result.tree.children[0].rules.length, 2);
  assert.equal(result.tree.children[0].rules[0].premises.length, 2);
});

test('parses a hyphenated rule name', () => {
  const result = parse(`E-App1 :=
  expression, store -> expression', store'
  ===>
  expression argument, store -> expression' argument, store'`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].name, 'E-App1');
});

test('parses a hyphenated family name', () => {
  const result = parse(`family small-step:
  Step :=
    expression, store -> expression', store'
    ===>
    expression argument, store -> expression' argument, store'`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].name, 'small-step');
});

test('merges custom aliases and preserves word boundaries', () => {
  const result = render(`Rule :=
  lambdaValue |- entails
  ===>
  lambda`, { symbols: { entails: '⊨' } });

  assert.match(result.html, /lambdaValue ⊢ ⊨/);
  assert.match(result.html, /λ/);
});

test('returns a source diagnostic for an incomplete inference', () => {
  const result = parse(`Broken :=
  A |- B`);

  assert.equal(result.tree.children.length, 0);
  assert.equal(result.diagnostics[0].line, 1);
  assert.match(result.diagnostics[0].message, /deduction operator/i);
});

test('allows a pipe as literal formula text', () => {
  const result = parse(`PipeFormula :=
  A |- A |
  ===>
  A |- A`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].premises[0].value, 'A |- A |');
});

test('reports an unmatched bracket at its source line', () => {
  const result = parse(`Broken :=
  [ A |- A
  ===>
  A |- A`);

  assert.equal(result.tree.children.length, 0);
  assert.equal(result.diagnostics[0].line, 2);
  assert.match(result.diagnostics[0].message, /unclosed bracket/i);
});

test('groups deeper formula text as a continuation', () => {
  const result = parse(`Broken :=
  A |- A
    B |- B
  ===>
  A |- A`);

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tree.children[0].premises, [
    { type: 'formula', value: 'A |- A\n  B |- B' }
  ]);
});

test('accepts compact adjacent bracket groups as sibling premises', () => {
  const result = parse(`Compact :=
  [A|-A][B|-B]
  ===>
  A|-B`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].premises.length, 2);
  assert.deepEqual(result.tree.children[0].premises.map((premise) => premise.value), ['A|-A', 'B|-B']);
});

test('keeps pipes as ordinary formula text', () => {
  const result = parse(`PipeFormula :=
  A | B
  ===>
  A | B`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].premises.length, 1);
  assert.equal(result.tree.children[0].premises[0].value, 'A | B');
});

test('normalizes the expanded Greek, temporal, and linear vocabulary', () => {
  const result = render(`Notation :=
  GAMMA, DELTA, TAU, PI, THETA, SIGMA |- alpha beta gamma delta epsilon theta eta rho sigma phi omega
  ===>
  always next A until eventually B release C; A -* B; C -o D; tensor par with plus one zero bot top`);

  assert.match(result.html, /Γ, Δ, Τ, Π, Θ, Σ ⊢ α β γ δ ε θ η ρ σ φ ω/);
  assert.match(result.html, /□ ○ A U ◇ B R C; A ⊸ B; C ⊸ D; ⊗ ⅋ &amp; ⊕ 1 0 ⊥ ⊤/);
});

test('preserves ordinary arithmetic punctuation outside registered aliases', () => {
  const result = render(`Arithmetic :=
  x + y - z * q \\/ r
  ===>
  x / y`);

  assert.match(result.html, /x \+ y - z \* q ∨ r/);
  assert.match(result.html, /x \/ y/);
});

test('parses and renders a zero-premise rule', () => {
  const source = `ExcludedMiddle :=
  ===>
  Γ |- A \\/ ~A`;
  const parsed = parse(source);
  const rendered = render(source);

  assert.equal(parsed.diagnostics.length, 0);
  assert.deepEqual(parsed.tree.children[0].premises, []);
  assert.match(rendered.html, /class="sequent-bar"/);
  assert.match(rendered.html, /Γ ⊢ A ∨ ¬A/);
});

test('styles the inference bar as the full proof-width track beside its label', () => {
  assert.match(styles, /\.sequent-proof \{[^}]*grid-template-columns: max-content auto/);
  assert.match(styles, /\.sequent-inference \{[^}]*display: contents/);
  assert.match(styles, /\.sequent-bar \{[^}]*grid-column: 1/);
  assert.match(styles, /\.sequent-rule-label \{[^}]*grid-column: 2/);
});

const environmentSource = 'Environment-Notation :=\n    ===>\n    GAMMA; DELTA; OMEGA; XI; IOTA; PHI; MU |- expression ⇒ type';
const environmentSymbols = { OMEGA: 'Ω', XI: 'Ξ', IOTA: 'Ι', PHI: 'Φ', MU: 'Μ' };
const environmentExpected = 'Γ; Δ; Ω; Ξ; Ι; Φ; Μ ⊢ expression ⇒ type';

function formulaTexts(node) {
  if (node.properties?.className?.includes('sequent-formula')) return node.children.map((child) => child.value);
  return (node.children ?? []).flatMap(formulaTexts);
}

for (const [name, options] of [['explicit mapping', { symbols: environmentSymbols }], ['defaults', {}]]) {
  test(`uppercase Greek environments render exactly with ${name}`, () => {
    const html = render(environmentSource, options);
    const hast = renderHast(environmentSource, options);
    assert.deepEqual(html.diagnostics, []);
    assert.deepEqual(hast.diagnostics, []);
    assert.equal(html.html.match(/class="sequent-formula">([^<]*)<\/span>/)[1], environmentExpected);
    assert.deepEqual(formulaTexts(hast.hast), [environmentExpected]);
    assert.equal(html.tree.children[0].conclusion.value, 'GAMMA; DELTA; OMEGA; XI; IOTA; PHI; MU |- expression ⇒ type');
  });
}

for (const [alias, symbol] of Object.entries(environmentSymbols)) {
  test(`uppercase Greek ${alias} matches whole Unicode-aware words`, () => {
    const identifiers = [`${alias}_value`, `prefix${alias}`, `${alias}suffix`, `${alias}2`, `2${alias}`, `é${alias}`, `${alias}β`].join(' ');
    const source = `Boundary :=\n  ===>\n  ${alias}; (${alias}), ${identifiers}`;
    assert.deepEqual(formulaTexts(renderHast(source).hast), [`${symbol}; (${symbol}), ${identifiers}`]);
  });
}

test('uppercase Greek caller overrides take precedence while other defaults remain', () => {
  assert.deepEqual(formulaTexts(renderHast(environmentSource, { symbols: { OMEGA: 'ω' } }).hast),
    ['Γ; Δ; ω; Ξ; Ι; Φ; Μ ⊢ expression ⇒ type']);
});

test('Greek expansion preserves Unicode, case sensitivity and existing judgment aliases', () => {
  const source = 'Control :=\n  Γ; Δ; Ω; Ξ; Ι; Φ; Μ |- expression ⇒ type\n  ===>\n  omega xi iota phi mu; TAU PI THETA SIGMA; forall exists A -> B';
  assert.deepEqual(formulaTexts(renderHast(source).hast), [
    'Γ; Δ; Ω; Ξ; Ι; Φ; Μ ⊢ expression ⇒ type',
    'ω xi iota φ μ; Τ Π Θ Σ; ∀ ∃ A → B'
  ]);
});
