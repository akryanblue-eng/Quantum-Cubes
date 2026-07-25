# Quantum Cubes — Game Doctrine

Quantum Cubes is an original mobile-first tile-combination strategy game. Its
identity rests on one idea, the **Quantum Sandbox**.

## The doctrine

> Players may freely experiment with possible layouts inside the Quantum
> Sandbox, but the committed match state changes only through one atomic, fully
> validated commit.

Everything else in the design serves this sentence.

## Why it matters

Most tile games force you to think in your head and act with your hands at the
same time — a half-finished rearrangement can leave the shared board in an
illegal, ambiguous state. Quantum Cubes separates **thinking** from
**committing**:

- The **committed table** is the single source of truth. It is always legal.
- The **Quantum Sandbox** is a protected draft space. Nothing you do there is
  real. You can split, merge, reorder, and reconsider as much as you like.
- A single **Commit** button turns an entire proposed layout into reality — but
  only if the whole layout is legal. There are no partial commits and no
  illegal intermediate states leaking onto the table.

## Consequences for the engine

1. Draft manipulation never mutates committed state.
2. Commit is all-or-nothing: validate the complete draft, then either produce a
   brand-new committed state or reject the draft with no change at all.
3. Every accepted commit yields a replayable event and a deterministic
   resulting-state hash, so history can always be reconstructed and verified.

## Originality

Quantum Cubes defines its own provisional ruleset (Foundation Rules v0.1), its
own four tile families (Spark, Flux, Prism, Pulse), its own symbols, its own
vocabulary, and its own presentation. It is **not** a clone of, and does not
copy the branding, artwork, written rules, terminology, board presentation, or
distinctive visual design of, any commercial tile game.
