import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {parse} from '../src/index.js';

const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');

test('README documents integration, configuration, and reference links', () => {
  for (const expected of [
    '@sequent-md/core',
    'rehypeSequent',
    'symbols',
    '[Guide](guide.md)',
    '[Grammar](grammar.md)',
    '[Identity](examples/identity.md)',
    '[Nested derivation](examples/nested-derivation.md)',
    '[Classical logic](examples/classical-logic.md)',
    '[Intuitionistic linear logic](examples/intuitionistic-linear-logic.md)'
  ]) {
    assert.ok(readme.includes(expected), `README should include ${expected}`);
  }
});

test('README keeps its quick-start fence and configuration examples usable', () => {
  const quickStart = readme.match(/```sequent\n([\s\S]*?)\n```/)?.[1];

  assert.ok(quickStart, 'README should include a sequent quick-start fence');
  assert.deepEqual(parse(quickStart).diagnostics, []);
  assert.match(readme, /const \{html, diagnostics\} = render\(source\);/);
  assert.match(readme, /processor\.use\(rehypeSequent, \{symbols\}\);/);
  assert.match(readme, /A deduction operator can appear first/);
  assert.match(readme, /Adjacent bracket groups/);
  assert.match(readme, /family name:/);
});
