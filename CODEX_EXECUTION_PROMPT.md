# Codex CLI Execution Prompt — GitFlow Academy

Implement the GitFlow Academy portfolio project from the attached prebuild directory.

## Read first

Before changing files, read in this order:

1. `ACCEPTANCE_CRITERIA.md`
2. `PRODUCT_SPEC.md`
3. `ARCHITECTURE.md`
4. `IMPLEMENTATION_PLAN.md`
5. every file under `specs/`
6. `engine/types.ts`, `engine/commandCatalog.ts`, `engine/expectedBehaviors.ts`
7. `curriculum/`
8. `i18n/`
9. `ai/`
10. `DESIGN_SYSTEM.md`, `UX_BEHAVIOR.md`, `styles/design-tokens.css`
11. `tests/`

Treat the prebuild as a product/behavior contract, not as an obligation to preserve a poor implementation detail. You may improve internal design while preserving acceptance behavior.

## Mission

Build a production-grade React 19 + Vite + TypeScript single-page Git learning environment that is:

- exceptionally understandable in default Noob Mode;
- visually memorable because state changes are animated semantically;
- deterministic in Git behavior;
- technically deep enough to be a flagship AI-developer portfolio project;
- fully switchable between English and German;
- functional without the AI provider.

## Priority order

1. Beginner clarity
2. Deterministic Git correctness
3. Visual explanatory power
4. Technical architecture
5. State-aware AI integration
6. Product polish
7. Breadth

Reduce unsupported advanced breadth before weakening the first six priorities.

## Tech

Required:
- Vite
- React 19
- TypeScript strict
- Framer Motion
- CSS Modules / vanilla CSS
- SVG graph implemented in-house
- localStorage for preferences/progress
- requested Pollinations OpenAI-compatible text endpoint behind an `AIProvider`

Allowed focused dependencies when useful:
- Vitest / React Testing Library
- react-markdown / remark-gfm

Do not use:
- Tailwind
- shadcn
- MUI
- Chakra
- Ant
- canned Git graph libraries
- backend/database

## Architecture constraints

- One authoritative `GitState`.
- Engine is deterministic and React-independent.
- Commands emit semantic `GitEffect[]`.
- Terminal, Git X-Ray and Git Graph are projections of the same state.
- Lesson validators are deterministic.
- Demo runner executes real simulator commands.
- Command Lens previews by isolated deterministic execution.
- LLM receives serialized state and cannot mutate state directly.
- AI suggestions go through runtime validation and normal parser/executor.

## Noob Mode

Default. A user who barely knows Git must understand Working Tree, Staging Area, Repository, commits, branches, HEAD, merges, conflicts, undo and remotes mainly through synchronized visuals and interaction — not walls of text.

## English / German

- first default from browser locale;
- manual persistent setting;
- localize all app/lesson/tutor copy;
- keep Git syntax and realistic terminal output English;
- language change never resets state/progress.

## Git X-Ray

Treat `WORKING TREE → STAGING AREA → REPOSITORY` as the signature teaching visualization. The same deterministic effects that update engine state must drive the visual transition.

## AI quality bar

A generic side-panel chatbot is insufficient. The tutor must understand current simulator state and produce validated structured suggestions. The app remains useful when the provider is unavailable.

## Autonomous phased execution

Do not blindly generate the whole UI in one pass.

### Phase 1 — foundation
Project, strict types, i18n, tokens, app state shell.

### Phase 2 — deterministic engine
Implement and test the command/state semantics from the specs.

### Phase 3 — architecture-proof vertical slice
Implement `modify → status → add → commit` end-to-end through Terminal + X-Ray + Graph + effects + Noob explanation. Verify this architecture before broadening.

### Phase 4 — beginner curriculum
Finish all ten beginner lessons and validators. Make this excellent before cosmetic breadth.

### Phase 5 — advanced Git
Implement advanced behavior and clearly labeled conceptual modules where full simulation is intentionally out of scope.

### Phase 6 — AI tutor
Context serializer, structured output, validation, Preview/Put in Terminal/Run, failure handling.

### Phase 7 — product polish
Real mini-simulator landing demo, animation refinement, Time Machine, responsive design, keyboard/accessibility, reduced motion.

### Phase 8 — verification
Full test/build/manual matrix.

Do not ask the user for approval for ordinary implementation decisions.

## Visual quality

Do not create a generic purple-gradient SaaS interface. The memorable visuals are the state changes themselves:

- file staging;
- commit birth;
- branch/HEAD movement;
- merge convergence;
- conflict comparison;
- stash collapse/restore;
- rebase replay;
- reflog recovery.

Decorative motion remains restrained.

## Test obligations

Implement the engine tests in `tests/engine-test-spec.md`, especially:

- commit snapshots index rather than Working Tree;
- fast-forward vs true merge;
- conflict lifecycle;
- reset soft/mixed/hard;
- revert;
- stash;
- cherry-pick new identity;
- rebase replay/new IDs;
- reflog recovery;
- remote divergence;
- preview purity/equivalence.

## Verification loop

After significant phases run relevant typecheck/tests/build and fix failures before continuing.

Final verification must cover:

- production build;
- non-watch test suite;
- typecheck/lint if configured;
- browser console;
- manual flows in `tests/acceptance-matrix.md`;
- 390 / 768 / 1024 / 1280 / 1440 widths;
- keyboard beginner flow;
- reduced motion;
- AI outage;
- locale switch mid-session.

A successful build alone is not completion.

## Do not call complete if

- UI features are disconnected from engine state;
- lessons are placeholders;
- unsupported commands pretend to work;
- AI output is blindly executable;
- mobile overflows;
- locale switching resets state;
- Noob Mode still depends on unexplained Git jargon;
- tests pass only because Git behavior is oversimplified incorrectly.

## Final self-review

Before the final response, review the actual implementation from five perspectives and **fix** material weaknesses:

1. complete Git beginner;
2. product designer;
3. senior frontend engineer;
4. AI engineer;
5. technical recruiter.

## Final report

Report concisely:

- what was built;
- architecture decisions;
- AI architecture;
- exact checks and results;
- genuine remaining limitations;
- key files worth reviewing.

Do not claim unverified functionality.
