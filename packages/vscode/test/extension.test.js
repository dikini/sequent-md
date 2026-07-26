import assert from 'node:assert/strict';
import test from 'node:test';
import MarkdownIt from 'markdown-it';

import { activate } from '../src/extension.js';

test('renders sequent fences through markdown-it', () => {
  const markdown = new MarkdownIt();
  activate().extendMarkdownIt(markdown);

  const html = markdown.render('```sequent\nIdentity :=\n  A |- A\n  ===>\n  A |- A\n```');

  assert.match(html, /class="sequent-document"/);
  assert.match(html, /A ⊢ A/);
});

test('leaves non-sequent fences to markdown-it', () => {
  const markdown = new MarkdownIt();
  activate().extendMarkdownIt(markdown);

  const html = markdown.render('```js\nconst x = 1;\n```');

  assert.match(html, /language-js/);
});

test('renders a zero-premise sequent fence as an axiom', () => {
  const markdown = new MarkdownIt();
  activate().extendMarkdownIt(markdown);

  const html = markdown.render('```sequent\nExcludedMiddle :=\n  ===>\n  Γ |- A \\/ ~A\n```');

  assert.match(html, /class="sequent-bar"/);
  assert.match(html, /Γ ⊢ A ∨ ¬A/);
});
