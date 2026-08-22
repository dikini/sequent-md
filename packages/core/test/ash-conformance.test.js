import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse, render } from '../src/index.js';

const fixture = await readFile(new URL('./fixtures/ash-conformance.md', import.meta.url), 'utf8');
const fences = [...fixture.matchAll(/```sequent\n([\s\S]*?)\n```/g)].map((match) => match[1]);
const expectedFenceCount = 7;

function fenceStartingWith(header) {
  const fence = fences.find((source) => source.startsWith(header));
  assert.ok(fence, `fixture must contain the ${header} fence`);
  return fence;
}

test('every synthesized Ash sequent fence parses without diagnostics', () => {
  assert.equal(fences.length, expectedFenceCount, 'fixture must contain every synthesized conformance fence');

  for (const [index, fence] of fences.entries()) {
    assert.deepEqual(
      parse(fence).diagnostics,
      [],
      `fixture fence ${index + 1} contains diagnostics`
    );
  }
});

test('renders Ash keyboard aliases as normalized mathematical symbols', () => {
  const result = render(fenceStartingWith('AliasNotation :='));

  assert.deepEqual(result.diagnostics, []);
  assert.match(result.html, /Γ ⊢ A ∧ B/);
  assert.match(result.html, /∀ x\. Γ ⊢ A → B/);
});

test('preserves direct Unicode notation when rendering an Ash fence', () => {
  const result = render(fenceStartingWith('UnicodeNotation :='));

  assert.deepEqual(result.diagnostics, []);
  assert.match(result.html, /Γ ⊢ A/);
  assert.match(result.html, /Γ ⊢ ∀x\. A → A/);
});
