# Architecture

## One authoritative Git state

```text
User / Demo / AI suggestion
          ↓
    command parser
          ↓
   command executor
          ↓
    previous GitState
          ↓
 deterministic transition
          ↓
      CommandResult
      ├─ nextState
      ├─ terminal output
      └─ semantic GitEffect[]
          ↓
      app state/reducer
          ↓
 ┌─────────────┬────────────┬──────────────┬──────────────┐
 │ Terminal UI │ Git X-Ray  │ Commit Graph │ Lesson/Tutor │
 └─────────────┴────────────┴──────────────┴──────────────┘
```

React components never maintain shadow copies of repository state.

## Recommended layers

### `engine/`

Pure React-independent deterministic domain logic:

- Git state representation;
- parsing and semantic validation;
- tree/diff logic;
- commit DAG algorithms;
- merge-base calculation;
- merge/conflict logic;
- reset/revert/stash;
- cherry-pick/rebase/reflog;
- remote simulation;
- command preview.

### `application/`

Reducer/store orchestration:

- authoritative `GitState`;
- command dispatch;
- lesson state/progress;
- semantic effect queue;
- demo playback;
- persistence;
- UI mode/language/settings.

### `components/`

UI projections only:

- Git X-Ray;
- Git Graph;
- Terminal;
- Lesson View;
- Command Lens;
- State Inspector;
- AI Tutor;
- Navigation/Onboarding.

### `lessons/`

Static curriculum + deterministic scenarios/validators. Validators never use AI.

### `ai/`

Provider abstraction, context serializer and runtime validation. Provider receives no mutable state references.

## Suggested shape

```text
src/
├── application/
│   ├── appReducer.ts
│   ├── actions.ts
│   ├── selectors.ts
│   ├── persistence.ts
│   └── demoRunner.ts
├── engine/
│   ├── types.ts
│   ├── gitSimulator.ts
│   ├── commandParser.ts
│   ├── commandExecutor.ts
│   ├── graphAlgorithms.ts
│   ├── diffEngine.ts
│   ├── mergeEngine.ts
│   ├── rebaseEngine.ts
│   ├── preview.ts
│   └── stateSerializer.ts
├── components/
│   ├── GitXRay/
│   ├── GitGraph/
│   ├── Terminal/
│   ├── LessonView/
│   ├── CommandLens/
│   ├── AITutor/
│   ├── StateInspector/
│   ├── Navigation/
│   ├── Onboarding/
│   └── ui/
├── lessons/
├── ai/
├── i18n/
├── styles/
├── App.tsx
└── main.tsx
```

## Semantic effects

Components should not diff arbitrary state and guess what happened. Commands emit ordered effects such as:

- `FILE_STAGED`
- `COMMIT_CREATED`
- `BRANCH_CREATED`
- `BRANCH_MOVED`
- `HEAD_MOVED`
- `MERGE_FAST_FORWARD`
- `MERGE_COMMIT_CREATED`
- `CONFLICT_CREATED`
- `RESET_PERFORMED`
- `STASH_CREATED`
- `STASH_APPLIED`
- `CHERRY_PICK_CREATED`
- `COMMITS_REPLAYED`
- `REMOTE_UPDATED`

The animation layer consumes these effects.

## Preview

Preview runs a command against an isolated clone/snapshot and returns predicted `CommandResult` without mutating live state.

A core invariant test should verify:

> preview(command, state).nextState == execute(command, state).nextState

for supported deterministic commands.

## Determinism

Do not depend on randomness/wall-clock time in engine tests. Use logical time and deterministic pseudo-hash generation.

## Persistence

Always persist:

- locale;
- learning mode;
- theme/settings;
- lesson progress.

Persist lab state only with explicit serialization versioning. Provide `Reset Lab`.

## AI trust boundary

```text
GitState
  ↓ minimal serializer
AITutorContext
  ↓
AIProvider
  ↓
unknown response
  ↓ runtime validator
GitTutorResponse
  ↓ suggested command
normal parser/executor
  ↓
GitState
```

No model-to-state mutation.

## Performance

- memoize graph/X-Ray projections;
- prefer SVG paths and transforms/opacity;
- keep lane assignment stable across updates;
- throttle pan/zoom pointer work;
- render rich tooltips/details lazily;
- respect `prefers-reduced-motion`.
