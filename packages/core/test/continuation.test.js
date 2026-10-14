import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse, render, renderHast } from '../src/index.js';

const minimal = await readFile(new URL('./fixtures/sequent-continuation.sequent', import.meta.url), 'utf8');
const corpus = JSON.parse(await readFile(new URL('./fixtures/ash-pinned-corpus.json', import.meta.url), 'utf8'));

test('all 36 unchanged pinned Ash fences parse and render without diagnostics', () => {
  assert.equal(corpus.commit, '9ec5920e8c395f9a36125805ee93b7f58c0f4764');
  assert.equal(corpus.fences.length, 36);
  const failures = corpus.fences.flatMap(({ path, fenceLine, source }) => {
    assert.ok(Number.isInteger(fenceLine) && fenceLine > 0);
    return render(source).diagnostics.map((d) => `${path}:${fenceLine} (fence line ${d.line}): ${d.message}`);
  });
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('the unchanged minimal reproducer has one quantified premise', () => {
  const result = parse(minimal);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tree.children[0].premises, [{
    type: 'formula',
    value: 'for each corresponding (argument_i, parameter_i),\n  DELTA; OMEGA; XI |- argument_i => kind(parameter_i)'
  }]);
});

test('continuation levels dedent to established levels and reset at siblings', () => {
  const result = parse(`Levels :=
  first
    second
      third
    fourth
  sibling
     different indentation
  ===>
  conclusion
    continued conclusion
      deeper conclusion
    end`);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.tree.children[0].premises.map((p) => p.value), [
    'first\n  second\n    third\n  fourth',
    'sibling\n   different indentation'
  ]);
  assert.equal(result.tree.children[0].conclusion.value, 'conclusion\n  continued conclusion\n    deeper conclusion\n  end');
});

test('families and nested derivations retain their grouping beside continuations', () => {
  const result = parse(`family proofs:
  Outer :=
    [
      A
      ===>
      B
    ]
    quantified
      judgment
    ===>
    C
      continued

  Axiom :=
    =>
    D`);
  assert.deepEqual(result.diagnostics, []);
  const [outer, axiom] = result.tree.children[0].rules;
  assert.equal(outer.premises.length, 2);
  assert.equal(outer.premises[0].type, 'inference');
  assert.equal(outer.premises[1].value, 'quantified\n  judgment');
  assert.equal(outer.conclusion.value, 'C\n  continued');
  assert.deepEqual(axiom.premises, []);
});

test('single-line trimming and ignored blank lines remain compatible', () => {
  const result = parse('Space :=\r\n  A  \r\n\r\n    B  \r\n  ===>\r\n  C  ');
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.tree.children[0].premises[0].value, 'A\n  B');
  assert.equal(result.tree.children[0].conclusion.value, 'C');
});

function elements(node, tagName) {
  return [node, ...(node.children ?? []).flatMap((child) => elements(child, tagName))]
    .filter((child) => child.tagName === tagName);
}

test('bracketed function arguments remain literal formula text beside continuations', () => {
  const result = parse(`Arguments :=
  record_pending(occurrence(method_id), type, [obligation])
    continued
  ===>
  result`);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.tree.children[0].premises[0].value,
    'record_pending(occurrence(method_id), type, [obligation])\n  continued');
});

test('HTML and HAST preserve one multiline formula, aliases and escaped text', () => {
  const source = `Markup :=
  for each <argument>,
    GAMMA |- A & B => type
  ===>
  DELTA |- result
    <continued>`;
  const html = render(source);
  const hast = renderHast(source);
  assert.deepEqual(html.diagnostics, []);
  assert.deepEqual(hast.diagnostics, []);
  assert.equal((html.html.match(/class="sequent-formula"/g) ?? []).length, 2);
  assert.ok(html.html.includes('for each &lt;argument&gt;,\n  Γ ⊢ A &amp; B =&gt; type'));
  assert.ok(html.html.includes('Δ ⊢ result\n  &lt;continued&gt;'));
  assert.deepEqual(elements(hast.hast, 'span').filter((node) => node.properties.className.includes('sequent-formula'))
    .map((node) => node.children[0].value), [
    'for each <argument>,\n  Γ ⊢ A & B => type', 'Δ ⊢ result\n  <continued>'
  ]);
});

const invalid = [
  ['deeper deduction', 'Bad :=\n  A\n    ===>\n  C', 3, /align/i],
  ['shallower deduction', 'Bad :=\n    A\n  ===>\n    C', 3, /align/i],
  ['unseen continuation dedent', 'Bad :=\n  A\n      B\n    C\n  ===>\n  D', 4, /indent|dedent/i],
  ['unseen conclusion dedent', 'Bad :=\n  ===>\n  A\n      B\n    C', 5, /indent|dedent/i],
  ['shallower formula', 'Bad :=\n    A\n  B\n    ===>\n    C', 3, /align|indent/i],
  ['continuation after deduction', 'Bad :=\n  ===>\n    C', 3, /continu|indent/i],
  ['continuation after bracket group', 'Bad :=\n  [ A ]\n    B\n  ===>\n  C', 3, /continu|indent/i],
  ['deeper structural bracket group', 'Bad :=\n  A\n    [ B ]\n  ===>\n  C', 3, /continu|indent/i],
  ['missing deduction', 'Bad :=\n  A\n    B', 1, /deduction operator/i],
  ['unclosed bracket', 'Bad :=\n  [ A\n  ===>\n  B', 2, /unclosed/i],
  ['multiple conclusions', 'Bad :=\n  ===>\n  A\n    B\n  C', 1, /exactly one conclusion/i],
  ['multiple deductions', 'Bad :=\n  A\n  ===>\n  B\n  ===>\n  C', 5, /structural/i]
];

for (const [name, source, line, message] of invalid) {
  test(`rejects ${name} at its source line and retains complete invalid text`, () => {
    const result = render(source);
    assert.equal(result.tree.children.length, 0);
    assert.equal(result.diagnostics[0].line, line);
    assert.match(result.diagnostics[0].message, message);
    assert.ok(result.html.includes(source.replaceAll('>', '&gt;')));
    const hast = renderHast(source);
    assert.equal(hast.hast.tagName, 'pre');
    assert.ok(hast.hast.children[0].value.endsWith(source));
  });
}
