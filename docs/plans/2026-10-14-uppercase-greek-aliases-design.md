# Issue #3: Uppercase Greek environment aliases

The user selected a default vocabulary expansion limited to the five aliases
requested in [issue #3](https://github.com/dikini/sequent-md/issues/3):
`OMEGA → Ω`, `XI → Ξ`, `IOTA → Ι`, `PHI → Φ`, and `MU → Μ`.

Documenting custom configuration alone would preserve today's rendering but
would not give the default-only VS Code adapter these aliases. Expanding the
entire uppercase Greek alphabet would reserve additional formula words beyond
the request. The selected five-entry expansion gives both hosts the requested
notation with the smallest change to existing default behavior.

Add the entries only to `DEFAULT_SYMBOLS` in `packages/core/src/symbols.js`.
Existing normalization, Unicode-aware whole-word boundaries, and override
merging remain the implementation. HTML, HAST, rehype, markdown-it, and native
SVG already consume that shared normalizer. Parsing and canonical source retain
the original alias text; normalization affects rendered formulae only.

The exact issue input must render as
`Γ; Δ; Ω; Ξ; Ι; Φ; Μ ⊢ expression ⇒ type`, both with defaults and with the
issue's explicit custom map. Cover custom precedence, adjacent punctuation,
identifier boundaries, raw Unicode, existing aliases, and ordinary judgment
text. Update rendered expectations for existing continuation fixtures without
editing their source or the pinned 36-fence Ash corpus.

Document the five defaults and the existing configuration/override mechanism in
the README. Describe implemented behavior; advisory grammar drafts remain
non-normative. No new options, public functions, AST types, host configuration,
font changes, or permanent ash-doc migration are included.

Verification consists of focused failing/passing regressions, both host paths,
SVG normalization and outline coverage, all existing corpus checks, `npm test`,
and `npm run build`. This is optional vocabulary support rather than a parser
repair or a book-build blocker.
