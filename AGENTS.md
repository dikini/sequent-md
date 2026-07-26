# Contributor Guidance

## Scope

This project develops a Markdown renderer for sequent-calculus code fences. Its
initial integration targets are Visual Studio Markdown Preview and remark/rehype.

## Conventions

- Use `sequent` code fences for renderer input examples; use `ebnf` only for
  grammar-specification examples.
- Treat the current Markdown drafts as non-normative reference material; do not
  present them as the language specification.
- Preserve compatibility with both initial integration paths when proposing
  renderer behavior or APIs.
- Keep parsing, rendering, symbol normalization, and styles in the shared core;
  host packages adapt that core rather than duplicating it.
- Run `npm test` and `npm run build` after JavaScript changes.

## Worktrees

Create isolated worktrees under the project-local `.worktrees/` directory. This
directory is ignored by Git and must remain so.
