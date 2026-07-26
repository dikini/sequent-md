# sequent-md

`sequent-md` is a renderer for sequent-calculus code fences in Markdown.

The first targets are Visual Studio Markdown Preview and the remark/rehype
ecosystem. The project is intentionally at an early stage: its parser, rendering
API, and package structure are not yet defined.

## Draft syntax

The current syntax sketch uses indentation to group a deduction under a named
rule. For example:

```sequent
identity :=
  A |- A
  ===>
  A |- A
```

This is draft syntax, not a normative specification. The existing Markdown
drafts in the repository are reference material only and may change or be
replaced as the renderer takes shape.

## Direction

The renderer should make proof structure legible in Markdown while remaining
usable from both editor preview and the remark/rehype processing pipeline.
