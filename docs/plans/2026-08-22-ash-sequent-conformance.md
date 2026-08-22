# Ash Sequent Conformance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `sequent-md` accept and document all `sequent` fence forms required by Ash AD-0003 with a self-contained conformance corpus.

**Architecture:** Extend the shared core's rule/family identifier grammar, leaving both host adapters unchanged. Exercise the contract through focused AST tests plus a Markdown fixture whose fences are extracted, parsed, and rendered by the public core API.

**Tech Stack:** ESM JavaScript, Node.js test runner, npm workspaces, Markdown fixtures.

---

### Task 1: Add failing hyphenated-name parser tests

**Files:**
- Modify: `packages/core/test/core.test.js`

**Step 1: Write the failing rule-name test**

Add a test that parses:

```js
const result = parse(`E-App1 :=
  expression, store -> expression', store'
  ===>
  expression argument, store -> expression' argument, store'`);
```

Require no diagnostics and assert that the first AST child's name is
`E-App1`.

**Step 2: Run the focused test to verify it fails**

Run: `node --test --test-name-pattern='hyphenated rule' packages/core/test/core.test.js`

Expected: FAIL because `E-App1` does not match the current identifier regex.

**Step 3: Write the failing family-name test**

Add a test for a `family small-step:` declaration containing a valid rule.
Require no diagnostics and assert that the family name is `small-step`.

**Step 4: Run the focused tests to verify they fail**

Run: `node --test --test-name-pattern='hyphenated' packages/core/test/core.test.js`

Expected: both new tests FAIL because the current rule and family headers
reject hyphens.

### Task 2: Add the self-contained Ash conformance fixture

**Files:**
- Create: `packages/core/test/fixtures/ash-conformance.md`
- Create: `packages/core/test/ash-conformance.test.js`

**Step 1: Write the fixture**

Create a Markdown document with explanatory prose accompanying every
`sequent` fence. Across its synthesized examples, cover:

- a zero-premise axiom;
- multiple premises on separate lines and as adjacent bracket groups;
- a bracketed nested derivation;
- hyphenated rule and family names;
- keyboard aliases such as `->`, `|-`, `/\\`, and `forall`;
- direct Unicode notation such as `Γ`, `⊢`, `→`, and `∀`.

Use bare `sequent` info strings, `:=` assignments, and `===>` deduction
operators for all Ash-authored examples.

**Step 2: Write the fixture test**

Read the Markdown fixture, extract every `sequent` fence, require the expected
nonzero number of fences, and assert that each produces no parse diagnostics.
Also render representative alias and Unicode fences and assert their expected
symbols appear unchanged or normalized in HTML.

**Step 3: Run the fixture test to verify it fails**

Run: `node --test packages/core/test/ash-conformance.test.js`

Expected: FAIL because fences containing hyphenated declarations produce
diagnostics.

### Task 3: Accept the Ash identifier grammar

**Files:**
- Modify: `packages/core/src/index.js`

**Step 1: Make the minimal parser change**

Change the shared identifier pattern to:

```js
const identifier = '[A-Za-z_][A-Za-z0-9_-]*';
```

Do not change formula tokenization, alias normalization, rendering, or either
host adapter.

**Step 2: Run the focused tests to verify they pass**

Run: `node --test --test-name-pattern='hyphenated' packages/core/test/core.test.js`

Expected: PASS.

Run: `node --test packages/core/test/ash-conformance.test.js`

Expected: PASS with every fixture fence producing no diagnostics.

### Task 4: Document and demonstrate expanded names

**Files:**
- Modify: `grammar.md`
- Modify: `README.md`

**Step 1: Update the implemented grammar**

Change the documented identifier production to
`[a-zA-Z_][a-zA-Z0-9_-]*` and state in prose that hyphens are accepted after
the first character.

**Step 2: Update a README example**

Use a hyphenated name such as `And-Intro` in the quick-start fence and its
explanation, and mention the name rule in the syntax summary.

**Step 3: Run documentation tests**

Run: `node --test packages/core/test/readme.test.js packages/core/test/documentation.test.js`

Expected: PASS, including parsing the updated README fence.

### Task 5: Verify and commit the implementation

**Files:**
- Modify: all files above

**Step 1: Inspect the change**

Run: `git diff --check && git diff --stat && git status --short`

Expected: no whitespace errors and only the planned parser, tests, fixture,
and documentation changes.

**Step 2: Run the complete test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

**Step 3: Build all workspaces**

Run: `npm run build`

Expected: exit status 0; the VS Code bundle and stylesheet build successfully.

**Step 4: Commit**

```bash
git add README.md grammar.md packages/core/src/index.js packages/core/test/core.test.js packages/core/test/ash-conformance.test.js packages/core/test/fixtures/ash-conformance.md docs/plans/2026-08-22-ash-sequent-conformance.md
git commit -m "fix: support Ash sequent fence names"
```
