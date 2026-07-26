# sequent-md

`sequent-md` renders keyboard-friendly sequent-calculus Markdown fences as
conventional proof trees. It targets VS Code Markdown Preview and
remark/rehype-based HTML pipelines.

## Quick start

Write a `sequent` fence. The premises sit above the deduction bar and the
conclusion below it:

```sequent
AndIntro :=
  [ GAMMA |- A ] [ GAMMA |- B ]
  ===>
  GAMMA |- A /\ B
```

It renders as a rule named *AndIntro*, with `Γ ⊢ A` and `Γ ⊢ B` as sibling
premises and `Γ ⊢ A ∧ B` as its conclusion.

## Use it

### JavaScript

Use the core renderer wherever you need an HTML fragment. It returns the parsed
tree and diagnostics alongside the HTML.

```js
import {render} from '@sequent-md/core';

const {html, diagnostics} = render(source);
```

### remark/rehype

Add the rehype plugin to a Unified pipeline. It replaces fenced
`language-sequent` code blocks with semantic proof-tree HAST.

```js
import {rehypeSequent} from '@sequent-md/rehype';

processor.use(rehypeSequent);
```

### VS Code Markdown Preview

Build and package the included extension, then install the resulting VSIX:

```sh
npm run build
(cd packages/vscode && npx --yes @vscode/vsce package --no-dependencies --out sequent-md-vscode.vsix)
code --install-extension packages/vscode/sequent-md-vscode.vsix --force
```

Open a Markdown preview containing a `sequent` fence. The extension supplies
both the renderer and its stylesheet.

## Syntax at a glance

- A named rule starts with `Name :=` or `Name ::=`, followed by an indented
  proof. `=>` and `===>` both introduce the conclusion.
- A deduction operator can appear first, creating a zero-premise rule (an
  axiom).
- Bracketed derivations nest: `[ ... ]`. Adjacent bracket groups such as
  `[ GAMMA |- A ] [ GAMMA |- B ]` are sibling premises.
- `family name:` groups related named rules into a responsive visual family.
- Formulae accept Unicode or typing-friendly notation: aliases such as `|-`,
  `->`, `/\`, `\/`, `forall`, `box`, `next`, `tensor`, and `-*`, plus the
  linear-logic marker `!`. The ordinary characters `+`, `-`, `*`, `/`, and `|`
  are formula text; only registered compound aliases are rewritten.

## Configure symbols

Pass a `symbols` map to the core renderer or rehype plugin to add aliases or
override the defaults. Custom entries are merged with the built-in logical,
Greek, modal, temporal, and linear-logic vocabulary.

```js
const symbols = {
  judgement: '⊨',
  square: '□'
};

render(source, {symbols});
processor.use(rehypeSequent, {symbols});
```

Word aliases match complete words, so an alias such as `lambda` does not alter
`lambdaValue`. Structural syntax (`:=`, `=>`, and brackets) is not configurable.
The included VS Code adapter currently uses the default symbol vocabulary.

## Learn more

- [Guide](guide.md): how to read and write sequents, with worked examples.
- [Grammar](grammar.md): the implemented grammar and its EBNF reference.
- Examples: [Identity](examples/identity.md),
  [Nested derivation](examples/nested-derivation.md),
  [Classical logic](examples/classical-logic.md), and
  [Intuitionistic linear logic](examples/intuitionistic-linear-logic.md).

## Develop

Run `npm test` for the parser, renderer, documentation, and adapter suites.
Run `npm run build` to bundle the VS Code extension and generate its preview
stylesheet.
