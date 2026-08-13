# Requirements Matrix

## Authority and workspace reconciliation

Precedence is `ACCEPTANCE_CRITERIA.md` → `PRODUCT_SPEC.md` → `specs/*.md` → typed `engine/` and `ai/` contracts → curriculum/i18n → `DESIGN_SYSTEM.md` → implementation suggestions.

The supplied workspace was a contract-only handoff: it contained no package manifest, app, runtime engine, or executable tests. Implementation therefore begins from the contracts without legacy code constraints. Internal design may improve, but acceptance behavior may not be weakened.

## Binding matrix

| Area | Binding result | Implementation evidence | Verification |
| --- | --- | --- | --- |
| Foundation | React 19, Vite, strict TypeScript, Framer Motion, vanilla CSS; no backend, Tailwind, component suite, or canned graph | `package.json`, `src/main.tsx`, `src/App.tsx`, `src/styles/` | typecheck, build, dependency audit |
| State | One authoritative `GitState`; UI surfaces are projections | `engine/`, `src/application/` | reducer and integration tests |
| Commands | Parser and deterministic React-independent executor; unsupported syntax fails honestly | `engine/commandParser.ts`, `engine/commandExecutor.ts` | parser and engine suites |
| Files | Index and Working Tree are independent; commit snapshots the index | `engine/tree.ts`, command executor | staged-plus-unstaged regression |
| DAG/refs | Valid immutable commit DAG; symbolic/unborn/detached HEAD; unreachable objects retained | `engine/graphAlgorithms.ts`, `engine/state.ts` | reusable invariants, recovery tests |
| Merge | Up-to-date, fast-forward, true two-parent merge, and explicit base/ours/theirs conflict lifecycle | executor and conflict UI | merge suite and Lesson 7 |
| Undo | Soft/mixed/hard reset are distinct; revert adds correcting history | executor and Command Lens | reset/revert suite |
| Advanced | Stash, cherry-pick, rebase/new IDs, reflog, remotes, fetch/pull/push | executor and Time Machine | advanced engine suite |
| Preview | Isolated deterministic execution; live state remains unchanged | `engine/preview.ts` | purity/equivalence tests |
| Visuals | Terminal, X-Ray, SVG graph, lesson explanation consume the same state/effects | `src/components/` | vertical-slice integration and browser QA |
| Curriculum | Ten beginner + ten advanced lessons; scenario, real demo, challenge, three hints, pure validator | `src/lessons/`, supplied curriculum | integrity, validator, demo tests |
| Advanced breadth | Only `a08`–`a10` are conceptual; earlier advanced lessons remain executable | lesson registry | curriculum contract test |
| i18n | EN/DE first-class; persisted choice wins; locale switch preserves repo/progress; Git output stays English | `src/i18n/`, persistence | key parity and state-preservation tests |
| AI | Bounded state context, provider returns `unknown`, runtime validation and parser/capability gating; never direct mutation | `src/ai/` | schema, timeout, outage, dispatch tests |
| Accessibility | Keyboard beginner path, visible focus, textual graph alternative, non-color cues, reduced motion | components/styles | RTL and browser acceptance |
| Responsive | No page overflow at 390px; deliberate tablet/desktop adaptations | app shell/components | 390/768/1024/1280/1440 browser matrix |
| Portfolio | Real simulator hero, rapid conflict/recovery path, architecture/trust-boundary README | landing/demo/docs | scripted showcase and content review |

## Reconciled details

- The command spec outranks the narrower catalog: `git diff --cached` aliases `--staged`; reset without a flag is mixed.
- Catalog entries make `git status --short` and `git add -A` required.
- Merge conflicts use edit → `git add` → `git commit`. With the supplied `OperationState`, unsupported cherry-pick conflicts may fail atomically; failed stash pop retains the stash.
- Revert uses ordinary commit/ref/HEAD effects; effects describe transitions and never become a second repository store.
- Scenario file edits and conflict resolution are real application actions, not invented Git commands or demo-only state mutations.
- AI runtime validation strengthens the supplied baseline with bounded strings/counts and normal parser/capability validation before actions appear.
- Animation timing is guidance; command execution and state commitment never wait for animation.

## Completion proof

Completion requires fresh typecheck, non-watch tests, production build, console review, manual golden flows, keyboard flow, reduced-motion review, AI outage, locale switch, and viewport checks. A successful build alone is insufficient.
