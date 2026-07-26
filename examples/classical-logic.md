# Classical logic

These rule families use keyboard-friendly notation: `|-` for the turnstile,
`/\` and `\/` for conjunction and disjunction, `->` for implication, and `~`
for negation. A renderer displays the related rules in each family responsively.

## Conjunction

```sequent
family conjunction:
  AndIntro :=
    [ Γ |- A ] [ Γ |- B ]
    ===>
    Γ |- A /\ B

  AndElimLeft :=
    Γ |- A /\ B
    ===>
    Γ |- A

  AndElimRight :=
    Γ |- A /\ B
    ===>
    Γ |- B
```

## Disjunction

```sequent
family disjunction:
  OrIntroLeft :=
    Γ |- A
    ===>
    Γ |- A \/ B

  OrIntroRight :=
    Γ |- B
    ===>
    Γ |- A \/ B

  OrElim :=
    Γ |- A \/ B
    [ Γ, A |- C ]
    [ Γ, B |- C ]
    ===>
    Γ |- C
```

## Implication

```sequent
family implication:
  ImpIntro :=
    Γ, A |- B
    ===>
    Γ |- A -> B

  ImpElim :=
    [ Γ |- A -> B ] [ Γ |- A ]
    ===>
    Γ |- B
```

## Classical principles

Excluded middle is a zero-premise rule, so its deduction operator appears
first. Double-negation elimination is a normal one-premise rule.

```sequent
ExcludedMiddle :=
  ===>
  Γ |- A \/ ~A

DoubleNegationElim :=
  Γ |- ~~A
  ===>
  Γ |- A
```
