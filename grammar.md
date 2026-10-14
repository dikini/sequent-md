# Implemented grammar

This document describes the grammar implemented by `sequent-md`. It is the
reference for the renderer, unlike the exploratory draft files in the project
root. A source fence is a sequence of named rules and related-rule families.

## Layout and formula text

The parser uses indentation as a layout token. A rule body is indented farther
than its header; its first content line establishes the body indentation. A
nested bracketed derivation can be indented farther again.
Blank lines are ignored between declarations. Tabs are not structural syntax.

Outside bracketed derivations, an unbracketed formula can continue on deeper
lines. Those lines belong to the same formula and preserve their line breaks and
indentation relative to its first line. A return to body indentation starts a new
formula. Continuations can establish deeper levels; a dedent must return to a
level established within that formula or to body indentation. Each new formula
resets the continuation levels. Formula starts and standalone deduction operators
must align at body indentation. A continuation cannot follow a deduction operator
or a completed bracket group, and a deeper structural bracket group is invalid
outside a bracketed derivation.

Formula text is intentionally open-ended. It may contain Unicode, ordinary
punctuation, and literal `|`. The parser only recognizes brackets when they are
used as structural groups and only recognizes a deduction operator when it is
alone on a line. Embedded bracketed arguments attached to ordinary formula
punctuation, such as `record_pending(type, [obligation])`, are literal formula
text rather than proof groups.

The layout tokens in the following EBNF are explanatory: `newline`, `indent`,
and `dedent` are supplied by the indentation-sensitive parser.

```ebnf
document = { declaration } ;
declaration = family | rule ;
family = "family" identifier ":" newline indent { rule } dedent ;
rule = identifier assignment newline indent inference dedent ;
assignment = ":=" | "::=" ;
identifier = [a-zA-Z_][a-zA-Z0-9_-]* ;
```

## Inferences

An inference has zero or more premises, one deduction operator, and exactly one
conclusion. An omitted premise list is a zero-premise axiom. Adjacent bracket
groups are sibling premises; a bracket group can hold a formula or a nested
inference.

```ebnf
inference = [ premise_list newline ] deduction newline conclusion ;
premise_list = multiline_premises | inline_bracket_premises ;
multiline_premises = premise { newline premise } ;
inline_bracket_premises = bracket_group { bracket_group } ;
premise = formula | bracket_group ;
conclusion = formula | bracket_group ;
bracket_group = "[" bracket_content "]" ;
bracket_content = formula | inference ;
deduction = "=>" | "===>" ;
formula = formula_line { newline indent formula_line dedent } ;
formula_line = [^\n]+ ;
```

The continuation production summarizes the outside-bracket layout rule above;
`indent` and `dedent` describe indentation relative to the formula's first line,
not a fixed number of spaces. Within a bracket group, formula text retains the
existing single-line behavior. After the deduction operator, baseline formulae
are still counted separately, so a continued conclusion is one conclusion but
two baseline conclusion formulae are invalid.

In source text, a multi-line bracket group places its opening and closing
brackets on their own indented lines. Inline groups such as `[ GAMMA |- A ]
[ DELTA |- B ]`, including compact `[A|-A][B|-B]`, are sibling premises on the
same row. `|` has no structural role; write it as part of a formula when needed.

## Names and notation

Rule and family names use the `identifier` production above: they start with a
letter or underscore, and hyphens are accepted after the first character along
with letters, digits, and underscores. Formula text is normalized only at
render time through the documented keyboard aliases; the parser stores the
original formula text. This means aliases never alter rule names, indentation,
brackets, assignments, or deduction operators.

The EBNF fences in this file intentionally use the railroad project’s supported
form: productions use `=`, end in `;`, quote terminals, and use
slash-delimited display regexes. They can therefore be rendered directly by its
`ebnf` fence support.
