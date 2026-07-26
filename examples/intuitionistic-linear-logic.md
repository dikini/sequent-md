# Intuitionistic linear logic

This example uses the default keyboard aliases for the practical
intuitionistic-linear-logic core. Contexts are uppercase Greek names; a comma
separates resources, so `GAMMA, DELTA` means that the two contexts are split
between premises.

## Multiplicatives

`tensor` renders as `⊗`, while `-*` renders as linear implication `⊸`.
`one` is the multiplicative unit.

```sequent
family multiplicatives:
  TensorIntro :=
    [ GAMMA |- A ] [ DELTA |- B ]
    ===>
    GAMMA, DELTA |- A tensor B

  TensorElim :=
    GAMMA |- A tensor B
    [ DELTA, A, B |- C ]
    ===>
    GAMMA, DELTA |- C

  LinearImpIntro :=
    GAMMA, A |- B
    ===>
    GAMMA |- A -* B

  LinearImpElim :=
    [ GAMMA |- A -* B ] [ DELTA |- A ]
    ===>
    GAMMA, DELTA |- B

  OneIntro :=
    ===>
    |- one
```

## Additives

`with` renders as `&`, `plus` as `⊕`, `top` as `⊤`, and `zero` as `0`.
Unlike tensor, the introduction rule for `with` uses the same context in both
premises.

```sequent
family additives:
  WithIntro :=
    [ GAMMA |- A ] [ GAMMA |- B ]
    ===>
    GAMMA |- A with B

  WithElimLeft :=
    GAMMA |- A with B
    ===>
    GAMMA |- A

  WithElimRight :=
    GAMMA |- A with B
    ===>
    GAMMA |- B

  PlusIntroLeft :=
    GAMMA |- A
    ===>
    GAMMA |- A plus B

  PlusIntroRight :=
    GAMMA |- B
    ===>
    GAMMA |- A plus B

  PlusElim :=
    GAMMA |- A plus B
    [ DELTA, A |- C ] [ DELTA, B |- C ]
    ===>
    GAMMA, DELTA |- C

  TopIntro :=
    ===>
    GAMMA |- top

  ZeroElim :=
    ===>
    GAMMA, zero |- A
```

## Of course

`!` is already keyboard-friendly and stays literal in formula text. The
dereliction rule permits an unrestricted resource to be used once; promotion
requires an unrestricted context.

```sequent
family exponentials:
  OfCourseDereliction :=
    GAMMA, A |- B
    ===>
    GAMMA, !A |- B

  OfCoursePromotion :=
    !GAMMA |- A
    ===>
    !GAMMA |- !A
```
