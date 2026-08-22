# Ash formal-notation fence conformance

The following synthesized examples exercise the notation forms used by Ash's
formal documentation without depending on the Ash repository.

An axiom has no premises: the deduction operator appears immediately before
the conclusion.

```sequent
TruthAxiom :=
  ===>
  Γ |- top
```

Conjunction introduction presents multiple premises on separate lines before
deriving their conjunction.

```sequent
ConjunctionIntroduction :=
  Γ |- A
  Γ |- B
  ===>
  Γ |- A /\ B
```

Application congruence presents multiple premises as adjacent bracket groups,
matching the compact layout used for related derivations.

```sequent
ApplicationCongruence :=
  [ Γ |- f -> f' ][ Γ |- a -> a' ]
  ===>
  Γ |- f a -> f' a'
```

This cut-shaped rule uses a bracketed nested derivation as one premise and an
ordinary bracketed formula as another.

```sequent
NestedCut :=
  [
    Γ |- A
    ===>
    Γ |- B
  ]
  [ Γ |- B -> C ]
  ===>
  Γ |- C
```

Evaluation rules are grouped under the hyphenated `small-step` family; its
hyphenated `E-App1` rule propagates a step through the function position.

```sequent
family small-step:
  E-App1 :=
    expression, store -> expression', store'
    ===>
    expression argument, store -> expression' argument, store'
```

This rule spells logical notation with the keyboard aliases `|-`, `/\`, `->`,
and `forall`, which the renderer normalizes to their mathematical symbols.

```sequent
AliasNotation :=
  Γ |- A /\ B
  ===>
  forall x. Γ |- A -> B
```

This rule writes the corresponding Greek letter, turnstile, quantifier, and
arrow directly in Unicode, so the renderer should preserve them.

```sequent
UnicodeNotation :=
  Γ ⊢ A
  ===>
  Γ ⊢ ∀x. A → A
```
