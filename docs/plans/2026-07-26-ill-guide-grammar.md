# ILL Example, Guide, and Grammar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full practical ILL example, a sequent-writing guide, and a validated grammar reference.

**Architecture:** Documentation is ordinary Markdown. `sequent` fences are kept executable by the core parser; `grammar.md` uses only EBNF syntax supported by the railroad project and its compiler.

**Tech Stack:** Markdown, ESM JavaScript, Node test runner, local sequent parser, railroad `compileEbnf`.

---

### Task 1: Add the ILL example

**Files:**
- Create: `examples/intuitionistic-linear-logic.md`
- Test: `packages/core/test/examples.test.js`

**Step 1: Write the example-fence expectation**

Extend the examples test to require the ILL document and parse each of its
`sequent` fences without diagnostics.

**Step 2: Run the test to verify it fails**

Run: `npm test -- --test-name-pattern "example"`

Expected: FAIL because the ILL example is absent.

**Step 3: Add practical ILL rule families**

Document tensor, linear implication, additive conjunction/disjunction, units,
and `!` with valid sequent fences using the default aliases.

**Step 4: Run the example test**

Run: `npm test -- --test-name-pattern "example"`

Expected: PASS.

### Task 2: Add guide and grammar reference

**Files:**
- Create: `guide.md`
- Create: `grammar.md`
- Test: `packages/core/test/documentation.test.js`

**Step 1: Write failing document-validation tests**

Require at least one valid `sequent` fence in the guide and validate each
`ebnf` fence in `grammar.md` through the railroad compiler.

**Step 2: Run the test to verify it fails**

Run: `npm test -- --test-name-pattern "documentation"`

Expected: FAIL because the documents are absent.

**Step 3: Write the documents**

Explain reading and authoring sequents, then document the implemented grammar
with prose and railroad-compatible `ebnf` fences using `=` and `;`.

**Step 4: Run the document tests**

Run: `npm test -- --test-name-pattern "documentation"`

Expected: PASS.

### Task 3: Full verification

**Files:**
- Verify: `examples/intuitionistic-linear-logic.md`
- Verify: `guide.md`
- Verify: `grammar.md`

**Step 1: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and the VS Code extension bundles.

**Step 2: Commit**

```bash
git add examples guide.md grammar.md packages/core/test
git commit -m "docs: add ILL guide and grammar reference"
```
