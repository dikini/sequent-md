# Native SVG format verification

The optional format-verification command exercises native exports as external
images in HTML, EPUB, a book-sized PDF (A5), and an A4 PDF. Both PDFs use Typst.
It does not capture the browser or convert PDF to SVG. The fixture includes axioms,
sibling premises, nested derivations in premises and conclusions, a family,
continued long formulae, literal XML-sensitive metadata, and a fallback symbol.
Every case is exported at 320px and 640px target widths. Host Markdown includes
explicit `fig-alt` attributes for every external image (captions alone do not
produce alternative text in Quarto HTML).

Run from the repository root after installing workspace dependencies:

```sh
npm run verify:svg-formats -- --toolchain /absolute/path/to/toolchain
```

For the existing Ash toolchain:

```sh
npm run verify:svg-formats -- --toolchain /home/dikini/Projects/ash-doc/.build/toolchain
```

The toolchain directory must contain Quarto `1.10.19` at
`quarto-1.10.19/bin/quarto`, bundled Typst `0.15.1` at
`quarto-1.10.19/bin/tools/x86_64/typst`, and EPUBCheck `5.4.0` at
`epubcheck-5.4.0/epubcheck.jar`. Java must be on `PATH`. The command checks all
prerequisites and pinned tool versions before creating artifacts. It neither
installs prerequisites nor edits Ash sources, adapters, or toolchain files.

Individual executable locations can be supplied with `--quarto`, `--typst`,
`--epubcheck` (the JAR), and `--java`. Equivalent environment variables are
`SEQUENT_SVG_TOOLCHAIN`, `SEQUENT_SVG_QUARTO`, `SEQUENT_SVG_TYPST`,
`SEQUENT_SVG_EPUBCHECK`, and `SEQUENT_SVG_JAVA`. Command arguments take precedence.

The default output directory is the ignored
`node_modules/.cache/svg-format-verification`. Set `--output /absolute/path` to
keep artifacts elsewhere. The output includes:

- `assets/`: native SVG images at both width profiles.
- `specimen.qmd`, `specimen.html`, and `specimen.epub`.
- `book.pdf` and `a4.pdf`.
- `logs/`: renderer logs and EPUBCheck results.
- `report.json`: tool versions, asset dimensions, and completed format checks.

A successful command establishes renderer acceptance, EPUBCheck acceptance,
and nonempty alternative text for all 12 HTML and EPUB images.
Visual inspection is a separate gate: inspect HTML at wide and narrow viewport
widths, EPUB at normal and enlarged reading text settings, and both PDFs. Check
all glyphs, hanging indentation, proof bars, labels, sibling alignment, wrapping,
and clipping. Save screenshots with the review evidence. The report deliberately
marks visual verification pending until that inspection is recorded.

The ordinary `npm test` suite tests option precedence, missing-prerequisite
errors, specimen asset references and alt text, exporter diagnostics, and PDF
profile selection without requiring the format toolchain. The format command is
separate because it requires the pinned external tools.

## Implementation verification

The completed issue #2 run passed 95 tests, the extension build, all 36 pinned
Ash SVG exports, and the four-format command. Both HTML and EPUB contain 12
images with nonempty alt text; EPUBCheck reported zero errors or warnings.

Chromium geometry checks contained all glyph ink and inference strokes in all
12 SVG viewports. External HTML was inspected at 1440px and 375px. The actual
packaged EPUB XHTML and image assets were inspected in Chromium at 375px with
16px and 32px reading text settings; a native e-reader application was not used.
All seven A5 book PDF pages and four A4 pages were rasterized and inspected.
No glyphs or labels were clipped. The 320px profile preserves reading size on
narrow pages; the wider 640px profile scales down there, so authors should select
an export width appropriate to the host rather than relying on image scaling.

The ignored output directory retains `report.json`, asset hashes, logs, and
screenshots/page images under `qa/`. A fresh format-command run resets visual
verification to pending; inspect the new artifacts before recording it passed.

## Recorded renderer acceptance

On 2026-10-14, the command above completed with Quarto 1.10.19, Typst 0.15.1,
EPUBCheck 5.4.0, and Temurin Java 21.0.11. All 12 native SVG assets rendered in
HTML and EPUB and in both PDFs. EPUBCheck reported **0 fatals, 0 errors,
0 warnings, and 0 infos**. The A5 book PDF contained seven pages
(419.528 × 595.276pt); the A4 PDF contained four pages (595.276 × 841.89pt).
These results cover renderer acceptance; inspect the generated artifacts for
visual acceptance as described above.

Renderer subprocess cache/data directories are placed inside the artifact output
so the command works when the home directory is read-only. The command preserves
`HOME` and keeps the selected external toolchain read-only.
