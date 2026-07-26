# README Usage and Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the README a concise, accurate entry point for using, configuring, and navigating sequent-md.

**Architecture:** Replace the syntax-heavy README with a landing-page structure: a runnable source example, focused paths for the core renderer, rehype, and VS Code preview, a short syntax summary, and configuration guidance. Keep the detailed explanation in the existing guide and grammar documents, linked directly from the README.

**Tech Stack:** Markdown, Node.js test runner, npm workspaces.

---

### Task 1: Add a README navigation regression test

**Files:**
- Create: `packages/core/test/readme.test.js`

**Step 1: Write the failing test**

Assert that the README retains the public package names, symbols configuration
guidance, and links to `guide.md`, `grammar.md`, and each example document.

**Step 2: Run test to verify it fails**

Run: `node --test packages/core/test/readme.test.js`
Expected: FAIL because the current README lacks the new navigation links and
usage-oriented wording.

### Task 2: Rewrite README as the landing page

**Files:**
- Modify: `README.md`

**Step 1: Write the minimal implementation**

Add a quick `sequent` fence; core, rehype, and VS Code usage snippets; concise
syntax variants; `symbols` override documentation; and links to the guide,
grammar, and all examples. Keep statements consistent with the exported APIs
and make clear that the bundled VS Code extension currently uses default
symbols.

**Step 2: Run the focused test**

Run: `node --test packages/core/test/readme.test.js`
Expected: PASS.

### Task 3: Verify documentation and repository health

**Files:**
- Verify only.

**Step 1: Run all tests**

Run: `npm test`
Expected: PASS.

**Step 2: Build the extension**

Run: `npm run build`
Expected: PASS.

**Step 3: Review and commit**

Inspect `git diff --check` and `git status --short`; commit only the README,
its regression test, and this implementation plan. Do not stage the
non-normative `ebnf.md`.
