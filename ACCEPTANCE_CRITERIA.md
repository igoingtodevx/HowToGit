# Acceptance Criteria

This file is the strongest product-level source of truth.

## Beginner clarity

- A first-time learner can identify Working Tree, Staging Area and Repository after Beginner Lesson 2.
- `git add` is visually represented as staging, never as creating a commit.
- `git commit` visibly consumes the staged snapshot and creates history.
- Branches are explained as movable refs/pointers before deeper jargon.
- HEAD is introduced with visual context.
- reset soft/mixed/hard have visibly different outcomes.
- conflicts expose competing content, not just a red badge.
- Noob errors explain what Git needs without changing Git semantics.
- the entire beginner track works without AI.

## Deterministic engine

- exactly one authoritative repository state;
- command execution returns previous/next state, output and semantic effects;
- core commands never depend on LLM output;
- deterministic time/hash strategy under tests;
- fast-forward merge distinct from merge commit;
- merge base derived from DAG;
- conflict state explicit and resolvable;
- soft/mixed/hard semantics distinct;
- revert creates correcting history instead of moving refs backward;
- cherry-pick creates a new commit identity;
- rebase replays changes with new commit identities;
- reflog records relevant ref/HEAD changes;
- preview execution does not mutate live state.

## Visual synchronization

- Terminal, X-Ray and Graph always reflect the same state;
- animation is effect-driven, not guessed from duplicate UI state;
- HEAD and branch tips stay consistent with the engine;
- reset does not incorrectly destroy still-existing commit objects;
- rebase visibly communicates replay/new hashes;
- reduced-motion mode preserves comprehension.

## Curriculum

- 10 beginner lessons;
- 10 advanced lessons, with unsupported advanced concepts honestly labeled conceptual;
- every interactive lesson has scenario, goal, demo, challenge, 3 hints and validator;
- lesson completion is deterministic/state-based;
- `Reset Lab` and `Restart Lesson` are reliable.

## AI tutor

- receives concise state-aware context;
- output runtime validated before command actions;
- cannot mutate state directly;
- suggested commands go through the normal parser/executor;
- destructive suggestions can be previewed;
- AI outage leaves lab/lessons functional;
- response language follows UI locale;
- unsupported simulator operations are not represented as if executable.

## Internationalization

- English and German are first-class;
- browser locale selects initial default;
- manual override persists;
- Git CLI output remains English;
- switching language preserves repo state and progress.

## Accessibility / responsive

- core beginner path keyboard-usable;
- visible focus states;
- accessible dialogs/sheets;
- textual graph-state alternative;
- color not the sole signal;
- `prefers-reduced-motion` respected;
- no page-level horizontal overflow at ~390px;
- verified at 390, 768, 1024, 1280 and 1440 widths.

## Engineering

- TypeScript strict mode;
- no meaningful `any`;
- deterministic engine tests;
- validator tests;
- typecheck passes;
- tests pass;
- production build passes;
- no material console errors;
- no TODO/stub masquerading as finished behavior.

## Portfolio impact

- landing hero demonstrates real simulator state, not fake video;
- reviewer can reach conflict + state-aware AI recovery quickly;
- README explains DAG, engine, semantic effects and AI trust boundary;
- no fake commercial/performance claims.
