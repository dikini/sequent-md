# Sequent Renderer Documentation Design

## Purpose

Establish the project’s initial public and contributor-facing documentation without
committing to a parser, renderer API, package layout, or normative specification.

## Decisions

- The project renders sequent-calculus code fences in Markdown.
- The first integration targets are Visual Studio Markdown Preview and the
  remark/rehype ecosystem.
- README examples use an `ebnf` code fence and are labelled as draft syntax.
- `ebnf.md` and `sequent.js.md` remain untracked reference material; they are not
  normative and must not be staged as part of this documentation work.
- `AGENTS.md` stays lean and records only durable project conventions.

## Validation

Review the new Markdown files for accurate target names, a fenced `ebnf` example,
and no speculative implementation commands or package structure.
