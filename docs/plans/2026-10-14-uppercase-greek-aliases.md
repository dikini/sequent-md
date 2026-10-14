# Uppercase Greek Environment Aliases Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the five uppercase environment aliases requested in issue #3 normalize by default while preserving custom mappings and identifier boundaries.

**Architecture:** Extend the existing shared-core symbol dictionary by five entries. All renderers and hosts inherit the change through existing imports; the parser and canonical AST/source stay unchanged.

**Tech Stack:** ESM JavaScript, Node test runner, shared HTML/HAST renderers, rehype, markdown-it, outlined native SVG.

---

## Workspace and baseline

Use `/home/dikini/Projects/sequent-md/.worktrees/issue-3-greek-aliases` on
`codex/issue-3-greek-aliases`, created from `main` at `fabfe23`.
`.worktrees/` has been verified Git-ignored. Keep it ignored and preserve the
pre-existing untracked VSIX in the main checkout. Planning changes only are
present initially; implementation starts after the user's instruction.

Run `npm test` before implementation and record the baseline. All 108 current
tests should pass. The issue's custom-map control already works; its default
rendering still leaves all five requested aliases literal.

## Task 1: Capture the acceptance cases, then extend shared defaults

**Files:**
- Modify: `packages/core/test/core.test.js`
- Modify: `packages/core/src/symbols.js`

1. Add the issue's unchanged source as a local constant:

   ```js
   const source = 'Environment-Notation :=\n    ===>\n    GAMMA; DELTA; OMEGA; XI; IOTA; PHI; MU |- expression ⇒ type';
   const symbols = { OMEGA: 'Ω', XI: 'Ξ', IOTA: 'Ι', PHI: 'Φ', MU: 'Μ' };
   const expected = 'Γ; Δ; Ω; Ξ; Ι; Φ; Μ ⊢ expression ⇒ type';
   ```

2. Assert zero diagnostics and exact formula text through HTML and HAST,
   first with `{ symbols }`, then without options. Extract the formula's text
   rather than comparing entire HTML wrappers. Assert the AST conclusion retains
   the original alias-bearing value.
3. For each new alias, test standalone tokens and punctuation-adjacent tokens;
   preserve `${alias}_value`, `prefix${alias}`, `${alias}suffix`,
   `${alias}2`, `2${alias}`, and Unicode letter adjacency. Include the explicit
   `OMEGA_value` and `prefixOMEGA` acceptance cases.
4. Cover raw `Γ; Δ; Ω; Ξ; Ι; Φ; Μ`, lowercase spellings, existing required
   logical/context aliases, and ordinary `expression ⇒ type` text. Do not add
   missing lowercase names such as `xi` or `iota` as part of this issue.
5. Test caller precedence with `{ symbols: { OMEGA: 'ω' } }`, retaining the other
   new defaults. This differs meaningfully from the exact custom-map control.
6. Run `node --test packages/core/test/core.test.js`. Confirm the default
   assertions fail before changing production code; custom controls should pass.
7. Add only these entries to `DEFAULT_SYMBOLS`:

   ```js
   OMEGA: 'Ω', XI: 'Ξ', IOTA: 'Ι', PHI: 'Φ', MU: 'Μ',
   ```

8. Rerun the focused command. Expect all assertions to pass without changing
   matching or override logic.

## Task 2: Verify hosts, continuations, and SVG

**Files:**
- Modify: `packages/rehype/test/plugin.test.js`
- Modify: `packages/vscode/test/extension.test.js`
- Modify: `packages/core/test/svg.test.js`
- Verify unchanged: `packages/core/test/fixtures/sequent-continuation.sequent`
- Verify unchanged: `packages/core/test/fixtures/ash-pinned-corpus.json`

1. Update existing continuation rendering expectations from `Δ; OMEGA; XI` to
   `Δ; Ω; Ξ` in the two host tests. Keep their formula-count, indentation and
   grouping assertions. Raw-source AST assertions stay unchanged.
2. Add the exact issue input to both hosts. Assert exact rendered conclusion
   text, all five Greek characters, and preserved ordinary judgment text.
   Exercise the issue's custom map through rehype options as well as defaults.
   VS Code continues using defaults through its existing adapter.
3. Add a native SVG regression using the existing typography/layout/XML helpers:
   assert the normalized scene formula text equals `expected`; the public SVG
   export has no diagnostics, positive bounds, supported outlines, and unchanged
   alias-bearing source metadata. Compare visible glyph paths/references and
   transforms with the equivalent literal-Unicode source to prove the correct
   outlines are emitted. Do not compare whole SVG bytes, since source metadata
   intentionally differs. Also cover a caller override through `renderSvg`.
4. Run:

   ```sh
   node --test packages/core/test/core.test.js packages/core/test/continuation.test.js packages/core/test/svg.test.js packages/rehype/test/plugin.test.js packages/vscode/test/extension.test.js
   ```

   Expect all tests to pass, including the unchanged 36-fence corpus and the
   existing invalid-source, escaping and continuation checks.
5. Check the diff: host production code, parser, font files, styles and pinned
   source fixtures should have no edits. Commit implementation and regressions
   together after this verification.

## Task 3: Document defaults and finish verification

**Files:**
- Modify: `README.md` (Configure symbols)
- Review generated output: `packages/vscode/dist/extension.cjs`
- Verify unchanged: `packages/vscode/media/sequent.css`

1. Document the five uppercase defaults with their exact characters. Include
   the issue's `sequent` fence and expected displayed conclusion. Explain that
   uppercase aliases are case-sensitive, match complete words, and can be
   overridden with the existing `symbols` map. Show the exact five-entry custom
   map as an explicit configuration example, noting it is now redundant for
   these defaults. Keep the distinction between core/rehype configuration and
   VS Code's default vocabulary.
2. Run `npm test && npm run build`, then `git diff --check`. Record the actual
   final test count and zero failures. Confirm the preview bundle includes the
   five aliases via shared core and the generated stylesheet is unchanged;
   do not add ignored build artifacts to Git.
3. Inspect one HTML/HAST and native SVG result for the issue's exact reproducer.
   Full four-format book validation is not required for a dictionary-only change;
   no SVG geometry, fonts, styles or adapter layout changes are planned.
4. Commit the documentation. Report verification results and retain this branch
   for a PR when requested. Do not change ash-doc or close the issue merely
   because its implementation plan is complete.

## Acceptance checklist

- Exact issue source renders `Γ; Δ; Ω; Ξ; Ι; Φ; Μ ⊢ expression ⇒ type` by default.
- The exact custom mapping remains supported; caller overrides take precedence.
- Identifier boundaries, raw Unicode, existing aliases and judgment text remain intact.
- Core HTML/HAST, rehype, markdown-it and SVG use the same shared normalization.
- Continuation source/grouping, canonical AST/source, and all 36 pinned fences remain intact.
- Only the five requested aliases are added; tests, build and diff checks pass.
