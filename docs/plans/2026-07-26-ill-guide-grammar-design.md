# ILL Example, Guide, and Grammar Design

## Purpose

Add a practical intuitionistic-linear-logic example, a reader/writer guide, and
a normative implemented-grammar reference.

## Decisions

- `examples/intuitionistic-linear-logic.md` demonstrates multiplicatives,
  additives, units, and the `!` exponential with keyboard-friendly aliases.
- `guide.md` explains the source language from a reader and author perspective.
- `grammar.md` separates prose about indentation and formula text from formal
  EBNF fences that follow the railroad project’s accepted `=`/`;` syntax.
- The grammar reference documents implemented behavior, including bracketed
  sibling premises, literal pipes in formulas, families, and zero-premise rules.

## Validation

Parse every new `sequent` fence with the core parser, and verify every `ebnf`
fence against the railroad project’s `compileEbnf` implementation.
