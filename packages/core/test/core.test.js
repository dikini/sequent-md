import assert from 'node:assert/strict';
import test from 'node:test';

import { parse, render } from '../src/index.js';

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
    Γ |- A | Γ |- B
    ===>
    Γ |- A /\\ B

  AndElimLeft :=
    Γ |- A /\\ B
    ===>
    Γ |- A`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].type, 'family');
  assert.equal(result.tree.children[0].rules.length, 2);
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

test('rejects malformed structural separators and reports their line', () => {
  const result = parse(`Broken :=
  A |- A |
  ===>
  A |- A`);

  assert.equal(result.tree.children.length, 0);
  assert.equal(result.diagnostics[0].line, 2);
  assert.match(result.diagnostics[0].message, /separator/i);
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

test('rejects extra indentation outside a bracketed derivation', () => {
  const result = parse(`Broken :=
  A |- A
    B |- B
  ===>
  A |- A`);

  assert.equal(result.tree.children.length, 0);
  assert.equal(result.diagnostics[0].line, 3);
  assert.match(result.diagnostics[0].message, /indentation/i);
});

test('accepts compact bracket groups and pipe separators', () => {
  const result = parse(`Compact :=
  [A|-A]|[B|-B]
  ===>
  A|-B`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.tree.children[0].premises.length, 2);
});
