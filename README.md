# sequent-md

`sequent-md` renders readable sequent-calculus code fences as conventional proof
trees in Markdown.

The first targets are Visual Studio Code Markdown Preview and the remark/rehype
ecosystem. The JavaScript workspace provides a shared core renderer, a rehype
plugin, and a VS Code extension adapter.

## Draft syntax

Use a `sequent` fence for renderer input. A named rule uses indentation, with
premises above `=>` or `===>` and the conclusion below it:

```sequent
identity :=
  A |- A
  ===>
  A |- A
```

The renderer displays the proof with `A ⊢ A` above and below an inference bar,
and places `identity` at the bar’s right edge.

### Related rules

Group independent but related rules in a `family`. Families become responsive
grids: rules share a row when space permits and stack on narrow previews.

```sequent
family conjunction:
  AndIntro :=
    [ Γ |- A ] [ Γ |- B ]
    ===>
    Γ |- A /\ B

  AndElimLeft :=
    Γ |- A /\ B
    ===>
    Γ |- A
```

Bracket groups express nested, anonymous derivations. Adjacent groups are
sibling premises, including across multiple lines:

```sequent
Outer :=
  [
    [ Γ |- A ] [ Γ |- B ]
    ===>
    Γ |- A /\ B
  ]
  [
    Γ |- C
  ]
  ===>
  Δ |- D
```

### Keyboard notation

Formula text accepts Unicode directly. The default aliases include:

- logic: `|-` → `⊢`, `|=` → `⊨`, `->` → `→`, `/\` → `∧`, `\/` → `∨`;
- Greek/context names: `GAMMA` → `Γ`, `DELTA` → `Δ`, and names such as
  `alpha`, `theta`, and `omega` → `α`, `θ`, and `ω`;
- modal/temporal notation: `box`/`always`, `diamond`/`eventually`, `next`,
  `until`, and `release` → `□`, `◇`, `○`, `U`, and `R`;
- linear logic: `-*`/`-o`, `tensor`, `par`, `with`, `plus`, `one`, `zero`,
  `bottom`/`bot`, and `top` → `⊸`, `⊗`, `⅋`, `&`, `⊕`, `1`, `0`, `⊥`, and
  `⊤`.

The core `render` and rehype plugin accept a `symbols` option that adds to or
overrides these aliases. Word aliases only match complete words, so
`lambdaValue` remains unchanged. Ordinary `+`, `-`, `*`, `/`, and `|` remain
formula text; only the listed multi-character aliases normalize. Use adjacent
bracket groups—`[ Γ |- A ] [ Γ |- B ]`—for parallel premises.

Structural tokens (`:=`, `::=`, `=>`, `===>`, and grouping brackets) are never
normalized as formula aliases.

## Packages

- `@sequent-md/core` exports `parse`, `render`, `renderHast`, and the shared
  preview stylesheet.
- `@sequent-md/rehype` exports `rehypeSequent`, which replaces
  `language-sequent` code blocks in a HAST tree.
- `sequent-md-vscode` contributes a markdown-it fence renderer and preview
  stylesheet for VS Code.

Run `npm test` for the parser and adapter suite, and `npm run build` to bundle
the VS Code extension and generate its stylesheet.

## Direction

The renderer keeps source keyboard-friendly while making proof structure legible
in both editor preview and the remark/rehype processing pipeline. Invalid fences
render an inline diagnostic with the source text instead of breaking a preview.
