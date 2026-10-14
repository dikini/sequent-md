import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseOptions, resolveTools, requireTools, createSpecimen, cases } from '../lib/svg-format-verification.mjs';

test('explicit toolchain and output arguments override environment paths', () => {
  const options = parseOptions(['--toolchain', '/pinned', '--output', '/artifacts'], { SEQUENT_SVG_TOOLCHAIN: '/other' });
  assert.equal(options.toolchain, '/pinned');
  assert.equal(options.output, '/artifacts');
  assert.equal(resolveTools(options).quarto, '/pinned/quarto-1.10.19/bin/quarto');
  assert.throws(() => parseOptions(['--unknown']), /Unknown option/);
});

test('missing prerequisites name the tool and how to supply it', async () => {
  await assert.rejects(requireTools({ quarto: '/absent/quarto', typst: '/absent/typst', epubcheck: '/absent/check.jar', java: '/absent/java' }), /Quarto.*--quarto/s);
});

test('specimen writes external native SVGs and alt text for both width profiles', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sequent-svg-formats-'));
  try {
    const calls = [];
    const assets = await createSpecimen(directory, async (source, options) => {
      calls.push({ source, options });
      return { diagnostics: [], svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>', width: 10, height: 10 };
    });
    assert.equal(calls.length, cases.length * 2);
    assert.deepEqual([...new Set(calls.map(call => call.options.maxWidth))], [320, 640]);
    const qmd = await readFile(join(directory, 'specimen.qmd'), 'utf8');
    assert.match(qmd, /!\[Axiom proof at 320px target width\]\(assets\/axiom-320.svg\)/);
    assert.match(qmd, /\{fig-alt="Axiom proof at 320px target width"\}/);
    assert.equal(assets.length, cases.length * 2);
    assert.ok(calls.some(call => call.options.description.includes('<script>')));
    assert.equal(await readFile(join(directory, assets[0].path), 'utf8'), '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('specimen aborts when a source yields diagnostics', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sequent-svg-formats-'));
  try {
    await assert.rejects(createSpecimen(directory, async () => ({ diagnostics: [{ message: 'bad source' }], svg: null })), /axiom.*bad source/s);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('both PDF profiles use Typst with distinct page sizes', async () => {
  const { formatJobs } = await import('../lib/svg-format-verification.mjs');
  assert.deepEqual(formatJobs.map(job => job.output), ['specimen.html', 'specimen.epub', 'book.pdf', 'a4.pdf']);
  assert.equal(formatJobs[2].to, 'typst');
  assert.equal(formatJobs[3].to, 'typst');
  assert.ok(formatJobs[2].metadata.includes('papersize:a5'));
  assert.ok(formatJobs[3].metadata.includes('papersize:a4'));
});

test('every integration source is accepted by the shared parser', async () => {
  const { parse } = await import('../../packages/core/src/index.js');
  for (const specimen of cases) assert.deepEqual(parse(specimen.source).diagnostics, [], specimen.id);
});

test('version preflight rejects nearby releases and accepts pinned versions', async () => {
  const { validateVersions } = await import('../lib/svg-format-verification.mjs');
  const actual = { quarto: '1.10.19', typst: 'typst 0.15.1 (9dfd3a08)', epubcheck: 'EPUBCheck v5.4.0' };
  assert.doesNotThrow(() => validateVersions(actual));
  for (const [key, value] of [['quarto', '1.10.190'], ['typst', 'typst 0.15.2'], ['epubcheck', 'EPUBCheck v5.4.01']]) {
    assert.throws(() => validateVersions({ ...actual, [key]: value }), /Expected pinned/);
  }
});

test('render subprocess caches stay inside the selected artifact directory', async () => {
  const { renderEnvironment } = await import('../lib/svg-format-verification.mjs');
  const env = renderEnvironment('/artifacts', '/pinned/typst', { HOME: '/user', XDG_CACHE_HOME: '/read-only-cache' });
  assert.equal(env.HOME, '/user');
  assert.equal(env.QUARTO_TYPST, '/pinned/typst');
  assert.equal(env.XDG_CACHE_HOME, '/artifacts/.cache');
  assert.equal(env.XDG_DATA_HOME, '/artifacts/.data');
});

test('format acceptance requires nonempty HTML and EPUB image alternative text', async () => {
  const { verifyImageAlternatives } = await import('../lib/svg-format-verification.mjs');
  const epub = { blocks: [{ t: 'Para', c: [{ t: 'Image', c: [[], [{ t: 'Str', c: 'Proof' }], ['assets/proof.svg', '']] }] }] };
  assert.deepEqual(verifyImageAlternatives('<img src="assets/proof.svg" alt="Proof">', epub, 1), { html: 1, epub: 1 });
  assert.throws(() => verifyImageAlternatives('<img src="assets/proof.svg" alt="">', epub, 1), /HTML.*alternative text/);
  const emptyEpub = { blocks: [{ t: 'Image', c: [[], [], ['proof.svg', '']] }] };
  assert.throws(() => verifyImageAlternatives('<img src="proof.svg" alt="Proof">', emptyEpub, 1), /EPUB.*alternative text/);
  assert.throws(() => verifyImageAlternatives('<img src="proof.svg" alt="Proof">', epub, 2), /Expected 2/);
});

test('relative CLI toolchain paths become absolute before render cwd changes', () => {
  const tools = resolveTools(parseOptions(['--toolchain', '../toolchain']), '/invocation/repo');
  assert.equal(tools.quarto, '/invocation/toolchain/quarto-1.10.19/bin/quarto');
  assert.equal(tools.typst, '/invocation/toolchain/quarto-1.10.19/bin/tools/x86_64/typst');
  assert.equal(tools.epubcheck, '/invocation/toolchain/epubcheck-5.4.0/epubcheck.jar');
});

test('relative CLI executable and jar paths resolve from invocation cwd', () => {
  const tools = resolveTools(parseOptions(['--quarto', './bin/quarto', '--typst', '../tools/typst', '--java', './java', '--epubcheck', 'check.jar']), '/invocation/repo');
  assert.deepEqual(tools, { quarto: '/invocation/repo/bin/quarto', typst: '/invocation/tools/typst', java: '/invocation/repo/java', epubcheck: '/invocation/repo/check.jar' });
});

test('relative environment paths receive the same resolution as CLI paths', () => {
  const env = { SEQUENT_SVG_TOOLCHAIN: '../toolchain', SEQUENT_SVG_QUARTO: './bin/quarto', SEQUENT_SVG_TYPST: '../tools/typst', SEQUENT_SVG_JAVA: './java', SEQUENT_SVG_EPUBCHECK: 'check.jar' };
  const tools = resolveTools(parseOptions([], env), '/invocation/repo');
  assert.deepEqual(tools, { quarto: '/invocation/repo/bin/quarto', typst: '/invocation/tools/typst', java: '/invocation/repo/java', epubcheck: '/invocation/repo/check.jar' });
  assert.equal(resolveTools(parseOptions([], { SEQUENT_SVG_TOOLCHAIN: '../toolchain' }), '/invocation/repo').quarto, '/invocation/toolchain/quarto-1.10.19/bin/quarto');
});

test('bare executable names keep PATH lookup while the jar remains a file path', () => {
  const tools = resolveTools(parseOptions(['--quarto', 'quarto', '--typst', 'typst', '--java', 'java', '--epubcheck', 'epubcheck.jar']), '/invocation/repo');
  assert.deepEqual(tools, { quarto: 'quarto', typst: 'typst', java: 'java', epubcheck: '/invocation/repo/epubcheck.jar' });
});
