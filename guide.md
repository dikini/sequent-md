# Reading and writing sequents

`sequent` fences preserve a plain-text proof notation while the renderer turns
them into inference bars. Formula text is deliberately permissive: write the
notation that is readable in your Markdown source, then rely on the built-in
aliases where they help.

## A named rule

Start with a rule name and `:=` or `::=`. Put premises above `=>` or `===>` and
the conclusion below it. The name is rendered at the right of the inference bar.

```sequent
Identity :=
  ===>
  GAMMA, A |- A
```

An operator immediately below the rule header means the rule has no premises:
it is an axiom. Otherwise, each unbracketed formula starting at the body
indentation and each complete bracket group before the operator is one premise.

## Premises and proof trees

Write independent premises on separate lines. To place sibling premises side by
side, enclose each in brackets and place the groups next to one another.

```sequent
AndIntro :=
  [ GAMMA |- A ] [ GAMMA |- B ]
  ===>
  GAMMA |- A /\ B
```

Brackets can also contain a complete anonymous derivation, which creates a
nested proof tree.

```sequent
Apply :=
  [
    GAMMA, A |- B
    ===>
    GAMMA |- A -> B
  ]
  [ GAMMA |- A ]
  ===>
  GAMMA |- B
```

`|` is ordinary formula text, not a premise separator. Use it freely in a
formula; use adjacent bracket groups for parallel proof branches.

## Continued formulae

Indent a formula's following lines farther to continue the same premise or
conclusion. The renderer preserves line breaks and hanging indentation inside
that one formula, rather than treating the lines as sibling premises.

```sequent
K-Interface-Argument :=
    for each corresponding (argument_i, parameter_i),
      DELTA; OMEGA; XI |- argument_i => kind(parameter_i)
    ===>
    DELTA; OMEGA; XI; IOTA |- constraint Interface(arguments) ok

Wrapped-Conclusion :=
    GAMMA |- function
      ⇒ Function(domain, codomain)
    GAMMA |- argument ⇐ domain
    ===>
    GAMMA |- function argument
      ⇒ codomain
```

Returning to the body indentation starts a sibling premise; after the deduction
operator it would start a second conclusion, which is invalid. The standalone
deduction operator must align with the body indentation. An inline `=>` remains
formula text.

Continuations may indent farther again, then return to an established indentation
level. Dedenting to a level not established in the current formula is invalid.
Each new sibling formula resets those levels. Blank lines are ignored.

A continuation must follow an unbracketed formula, not a deduction operator or a
completed bracket group. These continuation rules apply outside bracketed
derivations; bracket-internal layout retains its existing behavior.

## Related rules

Use `family <name>:` for independent rules that belong together. The renderer
shows the family name and lays out its rules side by side when space permits.

```sequent
family implication:
  Intro :=
    GAMMA, A |- B
    ===>
    GAMMA |- A -> B

  Elim :=
    [ GAMMA |- A -> B ] [ DELTA |- A ]
    ===>
    GAMMA, DELTA |- B
```

## Formula notation

Unicode is always valid. Common keyboard aliases include `|-` (`⊢`), `/\`
(`∧`), `\/` (`∨`), `-*` (`⊸`), `tensor` (`⊗`), `next` (`○`), and `GAMMA`
(`Γ`). Literal `+`, `-`, `*`, `/`, and `|` are preserved unless they are part
of one of the documented multi-character aliases.

For the exact implemented grammar, see [grammar.md](grammar.md). The README
summarizes the default notation vocabulary.
