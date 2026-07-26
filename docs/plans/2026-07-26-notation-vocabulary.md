# Notation Vocabulary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the default notation dictionary and make pipe characters ordinary formula text.

**Architecture:** The core alias map remains the single normalization source. The parser stops emitting premise-separator tokens for pipes; examples express parallel premises with adjacent bracket groups, and the existing recursive AST/renderer handles that layout unchanged.

**Tech Stack:** ESM JavaScript, Node test runner, markdown-it, rehype HAST.

---

### Task 1: Update parser and alias-map behavior

**Files:**
- Modify: `packages/core/src/index.js`
- Test: `packages/core/test/core.test.js`

**Step 1: Write failing tests**

Add tests covering the complete Greek, modal/temporal, and linear alias sets;
literal arithmetic characters; and a formula containing `|` that remains one
formula node.

**Step 2: Run the focused tests**

Run: `npm test -- --test-name-pattern "notation|pipe"`

Expected: FAIL because the aliases are absent and pipes are structural.

**Step 3: Implement the minimal update**

Extend `DEFAULT_SYMBOLS`; remove pipe tokenization and separator validation;
keep adjacent bracket groups as the parallel-premise form.

**Step 4: Run focused tests**

Run: `npm test -- --test-name-pattern "notation|pipe"`

Expected: PASS.

### Task 2: Migrate documentation and examples

**Files:**
- Modify: `README.md`
- Modify: `examples/classical-logic.md`
- Modify: `examples/nested-derivation.md`
- Test: `packages/core/test/examples.test.js`

**Step 1: Replace structural pipe examples**

Use adjacent bracket groups for parallel premises and document that `|` remains
ordinary formula text.

**Step 2: Expand the notation reference**

Describe the new Greek, modal/temporal, and linear defaults without presenting
the advisory grammar files as normative.

**Step 3: Verify example fences**

Run: `npm test -- --test-name-pattern "example"`

Expected: PASS with no diagnostics.

### Task 3: Full verification

**Files:**
- Verify: `packages/core/src/index.js`
- Verify: `examples/*.md`

**Step 1: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and the VS Code extension bundles.

**Step 2: Commit**

```bash
git add packages README.md examples
git commit -m "feat: expand notation vocabulary"
```
