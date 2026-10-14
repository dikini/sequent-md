import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { rehypeSequent } from '../src/index.js';

const continuation = await readFile(new URL('../../core/test/fixtures/sequent-continuation.sequent', import.meta.url), 'utf8');

function transformFence(source) {
  const tree = { type: 'root', children: [{ type: 'element', tagName: 'pre', properties: {}, children: [{
    type: 'element', tagName: 'code', properties: { className: ['language-sequent'] },
    children: [{ type: 'text', value: source }]
  }] }] };
  rehypeSequent()(tree);
  return tree.children[0];
}

test('keeps a continued judgment inside one premise in rehype', () => {
  const document = transformFence(continuation);
  assert.deepEqual(document.properties.className, ['sequent-document']);
  const premises = document.children[0].children[0].children[0];
  assert.deepEqual(premises.properties.className, ['sequent-premises']);
  assert.equal(premises.children.length, 1);
  assert.equal(premises.children[0].children[0].value,
    'for each corresponding (argument_i, parameter_i),\n  Δ; OMEGA; XI ⊢ argument_i => kind(parameter_i)');
});

test('retains complete invalid continuation source in rehype', () => {
  const source = 'Bad :=\n  ===>\n    <invalid> & value';
  const result = transformFence(source);
  assert.equal(result.tagName, 'pre');
  assert.deepEqual(result.properties.className, ['sequent-diagnostic']);
  assert.ok(result.children[0].value.endsWith(source));
});

test('replaces sequent code blocks with semantic proof HAST', () => {
  const tree = {
    type: 'root',
    children: [{
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [{
        type: 'element',
        tagName: 'code',
        properties: { className: ['language-sequent'] },
        children: [{ type: 'text', value: 'Identity :=\n  A |- A\n  ===>\n  A |- A' }]
      }]
    }]
  };

  rehypeSequent()(tree);

  assert.equal(tree.children[0].tagName, 'div');
  assert.deepEqual(tree.children[0].properties.className, ['sequent-document']);
  assert.equal(tree.children[0].children[0].tagName, 'div');
});

test('does not transform ordinary code blocks', () => {
  const code = { type: 'element', tagName: 'code', properties: { className: ['language-js'] }, children: [] };
  const tree = { type: 'root', children: [{ type: 'element', tagName: 'pre', properties: {}, children: [code] }] };

  rehypeSequent()(tree);

  assert.equal(tree.children[0].tagName, 'pre');
});

test('preserves a family heading as an accessible HAST relationship', () => {
  const tree = {
    type: 'root',
    children: [{
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [{
        type: 'element',
        tagName: 'code',
        properties: { className: ['language-sequent'] },
        children: [{ type: 'text', value: 'family conjunction:\n  Intro :=\n    A |- B\n    ===>\n    A /\\ B' }]
      }]
    }]
  };

  rehypeSequent()(tree);

  const family = tree.children[0].children[0];
  assert.equal(family.properties.ariaLabelledBy, 'sequent-family-conjunction');
  assert.equal(family.children[0].properties.id, 'sequent-family-conjunction');
});

test('renders a zero-premise rule as an axiom proof', () => {
  const tree = {
    type: 'root',
    children: [{
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [{
        type: 'element',
        tagName: 'code',
        properties: { className: ['language-sequent'] },
        children: [{ type: 'text', value: 'ExcludedMiddle :=\n  ===>\n  Γ |- A \\/ ~A' }]
      }]
    }]
  };

  rehypeSequent()(tree);

  const proof = tree.children[0].children[0];
  assert.equal(proof.tagName, 'div');
  assert.equal(proof.children[0].tagName, 'figure');
  assert.equal(proof.children[0].children[1].children[0].properties.className[0], 'sequent-bar');
});
