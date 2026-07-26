import assert from 'node:assert/strict';
import test from 'node:test';

import { rehypeSequent } from '../src/index.js';

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
