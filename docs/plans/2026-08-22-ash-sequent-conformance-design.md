# Ash sequent conformance design

## Goal

Make the shared sequent parser accept every `sequent` form required by Ash
AD-0003, especially hyphenated rule and family names, and keep that contract
covered by self-contained tests.

## Approach

Add a Markdown fixture under the core test suite that synthesizes the accepted
Ash forms. Each `sequent` fence has explanatory prose and, across the fixture,
the corpus covers an axiom, multiple premises, a nested derivation, a
hyphenated rule name, a hyphenated family name, keyboard aliases, and Unicode.
The tests extract each fence and require the shared parser to produce no
diagnostics. Focused parser assertions also verify that hyphenated names are
preserved in the AST.

Expand the single identifier definition used by rule and family headers so a
hyphen is accepted after the first character. Keep parsing, rendering, symbol
normalization, and styles in the shared core; the VS Code and rehype packages
continue to consume that behavior without adapter changes.

Update the implemented grammar and README examples to cover the expanded name
syntax. These documents describe renderer behavior and usage; they do not turn
the external Markdown drafts into a language specification.

## Error handling

Existing diagnostics and source-preserving fallback rendering remain
unchanged. Invalid first characters and other malformed headers still fail at
the declaration boundary, while names matching
`[A-Za-z_][A-Za-z0-9_-]*` parse normally.

## Verification

Use test-driven development: first add focused name tests and the synthesized
fixture test and observe their expected failures. Then change the shared
identifier regex and confirm the focused suite passes. Finally run `npm test`
and `npm run build` to verify the core and both initial integration paths.
