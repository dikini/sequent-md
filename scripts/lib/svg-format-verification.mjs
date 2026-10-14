import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const versions = { quarto: '1.10.19', typst: '0.15.1', epubcheck: '5.4.0' };
export const cases = [
  { id: 'axiom', title: 'Axiom proof', source: 'Identity :=\n  ===>\n  GAMMA |- A' },
  { id: 'siblings', title: 'Sibling premises', source: 'AndIntro :=\n  GAMMA |- A\n  GAMMA |- B\n  ===>\n  GAMMA |- A /\\ B' },
  { id: 'nested', title: 'Nested premises and conclusion', source: 'Nested :=\n  [\n    [ GAMMA |- A ] [ GAMMA |- B ]\n    ===>\n    GAMMA |- C\n  ]\n  GAMMA |- D\n  ===>\n  [\n    GAMMA |- C\n    ===>\n    GAMMA |- C /\\ D\n  ]' },
  { id: 'family', title: 'Related rule family', source: 'family conjunction:\n  Intro :=\n    GAMMA |- A\n    GAMMA |- B\n    ===>\n    GAMMA |- A /\\ B\n\n  Elim :=\n    GAMMA |- A /\\ B\n    ===>\n    GAMMA |- A' },
  { id: 'continued', title: 'Continued long formulae', source: 'Quantified :=\n  for each corresponding argument and parameter in the environment,\n    DELTA; OMEGA; XI |- argument => kind(parameter)\n  GAMMA |- another premise with enough words to wrap across a narrow page\n  ===>\n  GAMMA |- the resulting expression has the expected computation type\n    with preserved hanging indentation' },
  { id: 'literal', title: 'Literal metadata and fallback symbols', source: 'Literal :=\n  x < y & value > bound\n  ===>\n  GAMMA |- A ⊸ B', description: 'Literal <script>alert("x")</script> & metadata must stay inert.' },
];

export function parseOptions(args, env = process.env) {
  const options = { toolchain: env.SEQUENT_SVG_TOOLCHAIN, quarto: env.SEQUENT_SVG_QUARTO, typst: env.SEQUENT_SVG_TYPST, epubcheck: env.SEQUENT_SVG_EPUBCHECK, java: env.SEQUENT_SVG_JAVA || 'java', output: resolve('node_modules/.cache/svg-format-verification') };
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, '');
    if (!['toolchain', 'quarto', 'typst', 'epubcheck', 'java', 'output'].includes(key)) throw new Error(`Unknown option: ${args[i]}`);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${args[i]}`);
    options[key] = args[++i];
  }
  options.output = resolve(options.output);
  return options;
}

export function resolveTools(options, invocationCwd = process.cwd()) {
  const toolchain = options.toolchain && resolve(invocationCwd, options.toolchain);
  const executable = path => path && (isAbsolute(path) || path.includes('/') || path.includes('\\') ? resolve(invocationCwd, path) : path);
  const epubcheck = options.epubcheck || (toolchain && join(toolchain, 'epubcheck-5.4.0/epubcheck.jar'));
  return {
    quarto: executable(options.quarto || (toolchain && join(toolchain, 'quarto-1.10.19/bin/quarto'))),
    typst: executable(options.typst || (toolchain && join(toolchain, 'quarto-1.10.19/bin/tools/x86_64/typst'))),
    epubcheck: epubcheck && resolve(invocationCwd, epubcheck),
    java: executable(options.java),
  };
}

export async function run(command, args, options = {}) {
  try {
    const result = await exec(command, args, { maxBuffer: 16 * 1024 * 1024, ...options });
    return result.stdout + result.stderr;
  } catch (error) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${error.stdout || ''}${error.stderr || error.message}`, { cause: error });
  }
}

export async function requireTools(tools) {
  const names = { quarto: 'Quarto', typst: 'Typst', epubcheck: 'EPUBCheck', java: 'Java' };
  for (const [key, name] of Object.entries(names)) {
    const command = tools[key];
    try {
      if (!command) throw new Error('path is unset');
      if (key === 'epubcheck') await access(command, constants.R_OK);
      else if (isAbsolute(command) || command.includes('/')) await access(command, constants.X_OK);
      else await run(command, ['--version']);
    } catch (error) {
      throw new Error(`Missing ${name} prerequisite (${command || 'unset'}). Supply --${key} PATH or SEQUENT_SVG_${key.toUpperCase()}; --toolchain DIR supplies the pinned Quarto/Typst/EPUBCheck paths. ${error.message}`);
    }
  }
  const actual = {
    quarto: (await run(tools.quarto, ['--version'])).trim(),
    typst: (await run(tools.typst, ['--version'])).trim(),
    epubcheck: (await run(tools.java, ['-jar', tools.epubcheck, '--version'])).trim(),
    java: (await run(tools.java, ['--version'])).trim(),
  };
  validateVersions(actual);
  return actual;
}

export async function createSpecimen(output, renderSvg) {
  await mkdir(join(output, 'assets'), { recursive: true });
  const assets = [];
  let qmd = '---\ntitle: "Native sequent SVG format verification"\nauthor: "sequent-md contributors"\nlang: en\ndate: 2026-10-14\n---\n\nAll proofs below are external native SVG files, generated from source without browser capture. Each image supplies host alt text.\n';
  for (const width of [320, 640]) {
    qmd += `\n# ${width}px target width\n`;
    for (const specimen of cases) {
      const result = await renderSvg(specimen.source, { maxWidth: width, title: specimen.title, description: specimen.description || specimen.title });
      if (!result.svg || result.diagnostics.length) throw new Error(`SVG export failed for ${specimen.id}: ${JSON.stringify(result.diagnostics)}`);
      const path = `assets/${specimen.id}-${width}.svg`;
      await writeFile(join(output, path), result.svg);
      assets.push({ id: specimen.id, maxWidth: width, path, width: result.width, height: result.height });
      qmd += `\n## ${specimen.title}\n\n![${specimen.title} at ${width}px target width](${path}){fig-alt="${specimen.title} at ${width}px target width"}\n\n`;
    }
  }
  await writeFile(join(output, 'specimen.qmd'), qmd);
  await writeFile(join(output, 'specimen.css'), 'img { max-width: 100%; height: auto; }\n');
  return assets;
}

export const formatJobs = [
  { to: 'html', output: 'specimen.html', metadata: ['css:specimen.css', 'embed-resources:false'] },
  { to: 'epub', output: 'specimen.epub', metadata: [] },
  { to: 'typst', output: 'book.pdf', metadata: ['papersize:a5', 'keep-typ:true'] },
  { to: 'typst', output: 'a4.pdf', metadata: ['papersize:a4', 'keep-typ:true'] },
];

export function validateVersions(actual) {
  for (const key of Object.keys(versions)) {
    if (!new RegExp(`(^|[^0-9.])${versions[key].replaceAll('.', '\\.')}([^0-9.]|$)`).test(actual[key])) throw new Error(`Expected pinned ${key} ${versions[key]}, received ${actual[key]}`);
  }
}

export function renderEnvironment(output, typst, env = process.env) {
  return { ...env, QUARTO_TYPST: typst, XDG_CACHE_HOME: join(output, '.cache'), XDG_DATA_HOME: join(output, '.data') };
}

export function verifyImageAlternatives(html, epub, expectedCount) {
  const htmlImages = [...html.matchAll(/<img\b[^>]*>/gi)].map(([tag]) => /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1]);
  const epubImages = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.t === 'Image') epubImages.push(node.c[1].some(part => part.t === 'Str' && part.c.trim()));
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(epub);
  if (htmlImages.length !== expectedCount || epubImages.length !== expectedCount) throw new Error(`Expected ${expectedCount} external images in each format; HTML has ${htmlImages.length}, EPUB has ${epubImages.length}.`);
  if (htmlImages.some(alt => !alt?.trim())) throw new Error('HTML image lacks nonempty alternative text.');
  if (epubImages.some(alt => !alt)) throw new Error('EPUB image lacks nonempty alternative text.');
  return { html: htmlImages.length, epub: epubImages.length };
}
