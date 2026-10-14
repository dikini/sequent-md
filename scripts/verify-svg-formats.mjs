#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseOptions, resolveTools, requireTools, createSpecimen, formatJobs, run, renderEnvironment, verifyImageAlternatives } from './lib/svg-format-verification.mjs';

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const tools = resolveTools(options);
  // Validate everything before writing artifacts or importing the exporter.
  const toolVersions = await requireTools(tools);
  const { renderSvg } = await import('@sequent-md/core/svg');
  const assets = await createSpecimen(options.output, renderSvg);
  await mkdir(join(options.output, 'logs'), { recursive: true });
  const env = renderEnvironment(options.output, tools.typst);
  const formats = [];
  for (const job of formatJobs) {
    const args = ['render', 'specimen.qmd', '--to', job.to, '--output', job.output];
    for (const metadata of job.metadata) args.push('-M', metadata);
    const log = await run(tools.quarto, args, { cwd: options.output, env });
    await writeFile(join(options.output, 'logs', `${job.output}.log`), log);
    console.log(`Rendered ${join(options.output, job.output)}`);
    formats.push({ ...job, status: 'passed' });
  }
  const epubLog = await run(tools.java, ['-jar', tools.epubcheck, join(options.output, 'specimen.epub')]);
  await writeFile(join(options.output, 'logs', 'epubcheck.log'), epubLog);
  if (/\b(?:ERROR|FATAL)\s*\(/.test(epubLog)) throw new Error(`EPUBCheck reported errors:\n${epubLog}`);
  const epubAst = JSON.parse(await run(tools.quarto, ['pandoc', join(options.output, 'specimen.epub'), '--from=epub', '--to=json'], { env }));
  const imageAlternatives = verifyImageAlternatives(await readFile(join(options.output, 'specimen.html'), 'utf8'), epubAst, assets.length);
  const report = { imageAlternatives, toolVersions, tools, assets, formats, epubcheck: 'passed', visualVerification: 'pending: inspect HTML, EPUB at normal/enlarged text, book PDF and A4 PDF', source: 'Native outlined SVGs; no browser capture or PDF-to-SVG conversion.' };
  await writeFile(join(options.output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`EPUBCheck passed. Results: ${join(options.output, 'report.json')}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
