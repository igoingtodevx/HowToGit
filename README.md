# GitFlow Academy

GitFlow Academy is a production-grade, bilingual visual Git laboratory. It teaches the invisible parts of Git by synchronizing a realistic terminal, a Working Tree → Staging Area → Repository X-Ray, an in-house SVG commit graph, deterministic lessons, Command Lens previews, a reflog Time Machine, and a state-aware AI tutor.

The project is designed first for someone who has barely used Git. Noob Mode is the default; English and German are first-class; the complete beginner course and simulator work without an AI provider.

## Live demo

[Open HowToGit](https://howtogit.vercel.app)

## Run locally

```bash
pnpm install
pnpm dev
```

Quality gates:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Architecture

Every repository change flows through one deterministic path:

```text
terminal / demo / validated AI suggestion
                    ↓
               command parser
                    ↓
          React-independent executor
                    ↓
   previous GitState → next GitState
                    ├── Git-like output
                    └── semantic GitEffect[]
                              ↓
        Terminal · X-Ray · SVG DAG · Lessons
```

`GitState` is authoritative. Commits contain immutable tree snapshots and parent IDs; branches and tags are movable references; HEAD is explicitly unborn, symbolic, or detached; index and Working Tree are independent. Merge-base, reachability and unique replay commits are derived from the DAG rather than UI assumptions.

Commands emit semantic effects such as `FILE_STAGED`, `COMMIT_CREATED`, `MERGE_FAST_FORWARD`, `CONFLICT_CREATED`, `RESET_PERFORMED` and `COMMITS_REPLAYED`. Motion consumes those effects; components never parse terminal prose or keep shadow repository state.

Command Lens calls the same executor against an isolated clone. Engine tests assert both preview purity and preview/execution equivalence.

## Git behavior covered

- init, status, add, commit, log and diff;
- branches, switch, checkout and detached HEAD;
- already-up-to-date, fast-forward and true two-parent merges;
- base/ours/theirs conflict resolution;
- soft, mixed and hard reset plus history-preserving revert;
- stash, tags, cherry-pick, normal and interactive rebase;
- reflog recovery and retained unreachable objects;
- remotes, remote-tracking refs, fetch, pull and fast-forward-protected push.

The advanced bisect, submodule/subtree and object-internals modules are deliberately labeled conceptual instead of pretending unsupported commands execute.

## Curriculum

The supplied curriculum becomes a runtime with 10 beginner and 10 advanced lessons. The 17 executable lessons expose engine-backed step demos; the three explicitly conceptual lessons use deterministic knowledge checks without fake Git execution. Every lesson has a localized goal, challenge, exactly three progressive hints, and a pure validator. Reset Lab and lesson scenario restart are separate operations so completed progress and preferences remain safe.

## AI trust boundary

The tutor is an adviser, never the Git engine:

```text
GitState
  → bounded, deeply frozen context (no file contents)
  → configurable OpenAI-compatible provider
  → unknown response
  → size/shape/enum validation
  → normal command parser + capability filter + deterministic risk derivation
  → Preview / Put in Terminal through the ordinary Command Lens
```

Provider configuration is isolated behind:

```bash
VITE_AI_ENDPOINT=https://gen.pollinations.ai/v1/chat/completions
VITE_AI_MODEL=openai
```

Requests have finite timeouts, abort support, non-2xx and invalid-JSON handling. When the network or provider fails, a deterministic state-aware offline guide appears and the lab remains fully functional.

## Product quality

- strict TypeScript with no meaningful `any`;
- responsive at 390, 768, 1024, 1280 and 1440px without page overflow;
- keyboard terminal submission/history and visible focus styles;
- textual graph alternative and non-color state cues;
- `prefers-reduced-motion` semantic alternatives;
- versioned local persistence for preferences, progress and lab state;
- no backend, database, Tailwind, component framework or canned Git graph.

See [DESIGN.md](./DESIGN.md), [docs/REQUIREMENTS_MATRIX.md](./docs/REQUIREMENTS_MATRIX.md), and [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) for the durable product contracts.