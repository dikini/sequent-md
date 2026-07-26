# Notation Vocabulary and Pipe Revision Design

## Purpose

Expand the keyboard-friendly symbol vocabulary while returning `|` to ordinary
formula text so it can be used freely in logical and programming notation.

## Decisions

- `|` is never a structural premise separator. Parallel premises use adjacent
  bracket groups such as `[ Γ |- A ] [ Γ |- B ]`.
- Add conventional uppercase context aliases, common lowercase Greek aliases,
  modal/temporal aliases, and the core linear-logic vocabulary.
- Keep `+`, `-`, `*`, and `/` as literal formula characters; only explicitly
  listed multi-character aliases normalize.
- Include `bot` as a synonym for `bottom`; literal `1` and `0` already render
  unchanged alongside readable aliases `one` and `zero`.

## Validation

Test every added alias and word-boundary behavior. Test that pipe-containing
formulas remain formulas, update examples away from pipe-separated premises,
and verify every example fence parses cleanly.
