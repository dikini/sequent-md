# Nested derivation

Bracket groups create anonymous sub-derivations. The first premise below has
its own inference bar; the second is a direct premise of the outer rule.

```sequent
ImplicationApplication :=
  [
    Γ, A |- B
    ===>
    Γ |- A -> B
  ]
  [ Γ |- A ]
  ===>
  Γ |- B
```
