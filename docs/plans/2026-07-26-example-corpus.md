# Example Corpus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support zero-premise sequent rules and add a small Markdown example corpus, including classical logic.

**Architecture:** Extend the shared core parser so an inference may have no premise expressions before its deduction operator. Existing HTML, HAST, and markdown-it renderers consume the resulting empty premise list; the example documents remain ordinary Markdown `sequent` fences.

**Tech Stack:** ESM JavaScript, Node test runner, markdown-it, rehype HAST, VS Code Markdown Preview.

---

### Task 1: Parse and render zero-premise rules

**Files:**
- Modify: `packages/core/src/index.js`
- Test: `packages/core/test/core.test.js`

**Step 1: Write the failing test**

Add a `parse` and `render` test for `ExcludedMiddle :=` followed directly by
`===>` and `Γ |- A \/ ~A`. Assert an empty `premises` array, no diagnostics,
and an inference bar in the rendered HTML.

**Step 2: Run the test to verify it fails**

Run: `npm test -- --test-name-pattern "zero-premise"`

Expected: FAIL because the parser requires at least one premise.

**Step 3: Implement the minimal parser change**

Permit an empty token sequence only for the premise side of an inference; keep
an empty conclusion invalid. Reuse the existing renderer’s empty premise
container so no alternate HTML structure is needed.

**Step 4: Run the test to verify it passes**

Run: `npm test -- --test-name-pattern "zero-premise"`

Expected: PASS.

### Task 2: Verify host adapters with an axiom

**Files:**
- Modify: `packages/rehype/test/plugin.test.js`
- Modify: `packages/vscode/test/extension.test.js`

**Step 1: Write failing adapter tests**

Transform a zero-premise `sequent` fence through each adapter and assert its
proof output contains an inference bar without diagnostics.

**Step 2: Run the tests to verify they fail**

Run: `npm test -- --test-name-pattern "zero-premise"`

Expected: FAIL until the core supports an empty premise row.

**Step 3: Run the tests after the core change**

Run: `npm test -- --test-name-pattern "zero-premise"`

Expected: PASS with no adapter-specific implementation required.

### Task 3: Add Markdown examples

**Files:**
- Create: `examples/identity.md`
- Create: `examples/nested-derivation.md`
- Create: `examples/classical-logic.md`

**Step 1: Add focused example documents**

Use keyboard-friendly `sequent` fences. Include an identity derivation, a
recursive bracketed derivation, and connective families for conjunction,
disjunction, and implication plus excluded middle and double-negation
elimination.

**Step 2: Parse every example fence**

Run a Node script that extracts each `sequent` fence from `examples/*.md`,
passes it to `parse`, and exits nonzero on diagnostics.

Expected: every example parses cleanly.

### Task 4: Full verification

**Files:**
- Verify: `README.md`
- Verify: `examples/*.md`

**Step 1: Run tests and extension build**

Run: `npm test && npm run build`

Expected: all tests pass and the VS Code extension bundles.

**Step 2: Commit**

```bash
git add packages examples
git commit -m "feat: add sequent rule examples"
```
