import { mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { styles } from '@sequent-md/core';

if (!/\.sequent-proof \{[^}]*grid-template-columns: max-content auto/.test(styles)
  || !/\.sequent-inference \{[^}]*display: contents/.test(styles)) {
  throw new Error('The generated preview stylesheet does not contain the proof-width layout.');
}

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
