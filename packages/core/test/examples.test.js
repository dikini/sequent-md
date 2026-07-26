import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { parse } from '../src/index.js';

const examplesDirectory = fileURLToPath(new URL('../../../examples/', import.meta.url));

test('every sequent example fence parses without diagnostics', async () => {
  const files = (await readdir(examplesDirectory)).filter((file) => file.endsWith('.md'));
  assert.ok(files.length >= 3);

  for (const file of files) {
    const markdown = await readFile(new URL(`../../../examples/${file}`, import.meta.url), 'utf8');
    const fences = [...markdown.matchAll(/```sequent\n([\s\S]*?)\n```/g)].map((match) => match[1]);
    assert.ok(fences.length > 0, `${file} must contain a sequent fence`);
    for (const fence of fences) {
      const result = parse(fence);
      assert.deepEqual(result.diagnostics, [], `${file} contains an invalid fence: ${JSON.stringify(result.diagnostics)}`);
    }
  }
});
