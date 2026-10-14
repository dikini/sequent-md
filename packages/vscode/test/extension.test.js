import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import MarkdownIt from 'markdown-it';

import { activate } from '../src/extension.js';

const continuation = await readFile(new URL('../../core/test/fixtures/sequent-continuation.sequent', import.meta.url), 'utf8');

test('keeps a continued judgment inside one premise in markdown-it', () => {
  const markdown = new MarkdownIt();
  activate().extendMarkdownIt(markdown);
  const html = markdown.render('```sequent\n' + continuation + '```');
  assert.equal((html.match(/class="sequent-formula"/g) ?? []).length, 2);
  assert.ok(html.includes('for each corresponding (argument_i, parameter_i),\n  Δ; OMEGA; XI ⊢ argument_i =&gt; kind(parameter_i)'));
});

test('retains complete escaped invalid continuation source in markdown-it', () => {
  const markdown = new MarkdownIt();
  activate().extendMarkdownIt(markdown);
  const source = 'Bad :=\n  ===>\n    <invalid> & value\n';
  const html = markdown.render('```sequent\n' + source + '```');
  assert.match(html, /class="sequent-diagnostic"/);
  assert.ok(html.includes(source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')));
});

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
