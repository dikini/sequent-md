import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { parse } from '../src/index.js';

const root = new URL('../../../', import.meta.url);
const railroadRoot = process.env.RAILROAD_ROOT ?? '/home/dikini/Projects/railroad';
const railroadCompiler = `${railroadRoot}/src/ebnf.js`;

test('guide sequent fences parse without diagnostics', async () => {
  const guide = await readFile(new URL('guide.md', root), 'utf8');
  const fences = [...guide.matchAll(/```sequent\n([\s\S]*?)\n```/g)].map((match) => match[1]);

  assert.ok(fences.length > 0);
  for (const fence of fences) assert.deepEqual(parse(fence).diagnostics, []);
});

test('grammar EBNF fences compile with railroad syntax', { skip: !existsSync(railroadCompiler) }, async () => {
  const { compileEbnf } = await import(pathToFileURL(railroadCompiler));
  const grammar = await readFile(new URL('grammar.md', root), 'utf8');
  const fences = [...grammar.matchAll(/```ebnf\n([\s\S]*?)\n```/g)].map((match) => match[1]);

  assert.ok(fences.length > 0);
  for (const fence of fences) assert.doesNotThrow(() => compileEbnf(fence));
});
