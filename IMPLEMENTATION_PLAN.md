# Implementation Plan

Implementation is deliberately risk-first.

## Phase 0 — Contract reconciliation

Read the entire pack, create a requirement matrix and resolve implementation-level inconsistencies without weakening acceptance behavior.

## Phase 1 — Foundation

- React 19 + Vite + strict TypeScript;
- Framer Motion + focused testing deps;
- design tokens/fonts;
- i18n bootstrapping;
- domain contracts;
- base app reducer/store.

Exit: typecheck/build pass, language switching works, responsive shell exists.

## Phase 2 — Engine first

Implement and test in this order:

1. init + state invariants;
2. working tree/index/status/diff;
3. add/commit/log;
4. branch/switch/checkout;
5. merge-base + fast-forward;
6. true merge + conflict;
7. reset/revert;
8. stash;
9. cherry-pick;
10. rebase;
11. reflog;
12. remotes/fetch/pull/push;
13. command preview.

Do not use UI behavior as proof of engine correctness.

## Phase 3 — Architecture proof vertical slice

Build one complete loop:

`modify file → git status → git add → git commit`

Wire the same state/effects into:

- Terminal;
- Git X-Ray;
- Git Graph;
- Noob explanation;
- semantic animation.

Do not expand broadly until this vertical slice is clean.

## Phase 4 — Beginner course

Finish all 10 beginner lessons and deterministic validators first. Perform usability review after lessons 2, 4, 7 and 10.

Every lesson requires:

- scenario reset;
- one-sentence goal;
- short why/mental model;
- real demo script through simulator;
- challenge;
- three hints;
- validator;
- localized copy.

## Phase 5 — Advanced

Add advanced simulator behavior and advanced lessons. Explicitly mark conceptual simulations where full command support is intentionally out of scope.

## Phase 6 — AI tutor

- provider abstraction;
- bounded state serializer;
- structured response contract;
- runtime validation;
- localized prompts;
- Preview / Put in Terminal / Run;
- failure/retry/offline behavior.

Core app must pass QA with the AI endpoint unavailable.

## Phase 7 — Product polish

- real mini-simulator landing demo;
- refined graph/X-Ray choreography;
- responsive layouts;
- keyboard/focus;
- reduced motion;
- empty/error states;
- state inspector/time machine.

## Phase 8 — Final QA

Verify:

- typecheck;
- unit tests;
- production build;
- browser console;
- golden manual flows;
- 390 / 768 / 1024 / 1280 / 1440 widths;
- keyboard beginner path;
- reduced motion;
- AI outage;
- language switch mid-session.

Fix material failures rather than merely reporting them.
