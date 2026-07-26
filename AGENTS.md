# Contributor Guidance

## Scope

This project develops a Markdown renderer for sequent-calculus code fences. Its
initial integration targets are Visual Studio Markdown Preview and remark/rehype.

## Conventions

- Use `ebnf` code fences for syntax examples.
- Treat the current Markdown drafts as non-normative reference material; do not
  present them as the language specification.
- Preserve compatibility with both initial integration paths when proposing
  renderer behavior or APIs.
- Keep contributor guidance lean until the project adopts a package layout,
  parser, and test tooling.

## Worktrees

Create isolated worktrees under the project-local `.worktrees/` directory. This
directory is ignored by Git and must remain so.
