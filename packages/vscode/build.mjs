import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { styles } from '@sequent-md/core';

await mkdir('dist', { recursive: true });
await mkdir('media', { recursive: true });
await build({
  entryPoints: ['src/extension.js'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/extension.cjs'
});
await writeFile('media/sequent.css', styles);
