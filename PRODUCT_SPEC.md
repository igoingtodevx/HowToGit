# Product Specification

## Product

**GitFlow Academy** is an interactive, visual, AI-assisted Git learning laboratory.

It must do two things unusually well at the same time:

1. make Git exceptionally understandable to a complete beginner;
2. demonstrate enough engineering depth to be a flagship AI/software-engineering portfolio project.

The beginner experience is the primary product constraint, not an optional skin.

## Core promise

A learner should not need to mentally imagine what Git did after a command.

The app synchronizes four projections of one deterministic repository state:

1. **Terminal** — command and Git-like output.
2. **Git X-Ray** — Working Tree → Staging Area → Repository.
3. **Commit Graph** — history, branches, tags, HEAD and remote refs.
4. **Tutor/Lesson layer** — short plain-language meaning of the transition.

## Modes

### Noob Mode — default

Assume the learner does not understand repository, index/staging, commit hashes, branches, HEAD, merge base, detached HEAD, upstream, reset modes or rebase.

Required behavior:

- visuals before jargon;
- short contextual explanations instead of walls of text;
- before/after previews for difficult commands;
- exact highlighting of the affected Git zone;
- progressive hints;
- educational errors without changing real Git semantics;
- no silent success for incorrect commands.

### Pro Mode

Same simulator, denser presentation:

- less explanatory copy;
- more history visible at once;
- state inspector and reflog;
- advanced operations/challenges;
- richer command output.

Never fork the underlying engine.

## English + German

The final app supports **English and German** from the beginning.

- browser locale chooses first default (`de*` → German, otherwise English);
- user can switch language manually;
- choice persists locally;
- all UI, lessons, hints, errors, X-Ray labels, Command Lens and AI tutor language are localized;
- **Git command syntax and realistic Git CLI output remain English**;
- Noob Mode may add a localized explanation beneath Git output;
- switching language must not reset lab state or progress.

## Signature Feature 1 — Git X-Ray

Three conceptual zones:

`WORKING TREE → STAGING AREA → REPOSITORY`

File cards show filename and semantic state. Commands create semantic transitions:

- `git add`: current file version becomes staged;
- `git commit`: staged snapshot becomes a commit and current branch advances;
- `git reset --soft`: ref moves, staged state stays;
- `git reset --mixed`: ref moves, index resets, changes appear unstaged;
- `git reset --hard`: ref, index and Working Tree reconcile to target;
- `git stash`: local changes collapse into stash;
- `git stash pop`: stash expands back;
- merge: histories converge;
- conflict: base/ours/theirs become visually inspectable;
- rebase: commits replay onto a new base with new identities.

Motion must explain semantics rather than decorate the page.

## Signature Feature 2 — Command Lens

Before a difficult/destructive command, the user can preview a deterministic non-mutating simulation showing:

- before/after state;
- branch/HEAD movement;
- index/Working Tree impact;
- affected commits;
- risk (`safe`, `caution`, `destructive`).

The preview is derived from the simulator, not guessed by AI.

## Signature Feature 3 — Reflog Time Machine

Visual timeline of HEAD/ref movement and recoverable history.

A flagship advanced lesson should include recovering commits after an accidental hard reset.

## AI tutor

The AI is a **state-aware tutor**, not the Git engine.

It receives a bounded serialized snapshot containing relevant context only:

- locale/mode/current lesson;
- current branch and HEAD;
- branch tips and recent commits;
- working/index status;
- conflicts;
- recent terminal commands/errors;
- supported command families.

AI output is structured and runtime validated. Suggested commands can be previewed, inserted or executed only through the normal deterministic command pipeline.

AI network failure must never break core lessons or Git behavior.

## Portfolio review moment

Within about one minute, a reviewer should be able to:

1. modify a virtual file;
2. stage and commit while X-Ray reacts;
3. create divergence;
4. trigger a merge conflict;
5. ask the AI "What did I just break?";
6. receive an explanation grounded in actual simulator state;
7. preview a recovery command;
8. execute it and watch graph + X-Ray recover.

## Priority order

1. Beginner clarity
2. Correct deterministic Git behavior
3. Visual explanatory power
4. Technical architecture
5. State-aware AI integration
6. Product polish
7. Breadth

If breadth conflicts with correctness or clarity, reduce breadth.

## Non-goals

Do not:

- emulate every Git flag;
- use the LLM as parser, engine or lesson validator;
- create demo-only fake repository state;
- blindly execute model output;
- translate Git syntax/output;
- ship dead controls or placeholder lessons;
- claim fake users, metrics or benchmarks;
- turn the project into a generic marketing landing page with a tutorial bolted on.
