# Example Corpus and Zero-Premise Rules Design

## Purpose

Add a small Markdown example corpus that demonstrates the renderer’s basic,
recursive, related-rule, and classical-logic layouts.

## Decisions

- A rule may have no premises when its first indented line is `=>` or `===>`.
  It renders as a conventional axiom bar with no premise row.
- Examples live under `examples/` and use `sequent` fences with keyboard-friendly
  ASCII notation.
- The initial corpus contains identity, nested derivation, and classical-logic
  documents.
- The classical-logic document covers `∧`, `∨`, and `→` introduction/elimination
  families, plus excluded middle and double-negation elimination.

## Validation

Add parser and adapter tests for zero-premise rules, and verify every example
fence parses without diagnostics.
