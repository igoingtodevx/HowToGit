# Challenge Contract

Every interactive lesson maps to a deterministic validator.

```ts
interface ChallengeValidationResult {
  complete: boolean;
  satisfied: Array<{ key: string; labelKey: string }>;
  remaining: Array<{ key: string; labelKey: string }>;
  feedbackKey?: string;
}
```

Rules:
- validate state, not exact command strings;
- allow correct alternative workflows when resulting state is correct;
- do not require exact hashes;
- do not require exact commit messages unless message behavior is the lesson objective;
- use graph/ref/tree predicates;
- strongest hint may reveal exact command; weaker hints should not.

Example branch challenge validator:
- `feature` exists;
- feature descends from original base;
- at least two lesson-generated commits are unique to feature;
- HEAD is symbolic on `main` at completion;
- `main` remains at intended base until merge lesson.
