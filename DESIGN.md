# Design

## Source of truth

- **Status:** Active
- **Last refreshed:** 2026-08-13
- **Primary product surfaces:** first-use onboarding; Noob and Pro laboratory workspaces; lessons and challenges; Terminal; Git X-Ray; Commit Graph; Command Lens; Reflog Time Machine; AI Tutor; settings/language controls.
- **Decision precedence:** `ACCEPTANCE_CRITERIA.md` is the strongest product-level authority. Where visual decisions conflict, use `PRODUCT_SPEC.md`, `specs/*.md`, typed contracts, curriculum/i18n data, then `DESIGN_SYSTEM.md` in that order.
- **Evidence reviewed:** `ACCEPTANCE_CRITERIA.md`, `PRODUCT_SPEC.md`, `DESIGN_SYSTEM.md`, `UX_BEHAVIOR.md`, `specs/accessibility.md`, `specs/animation-effects.md`, `specs/git-graph-layout.md`, `specs/i18n-contract.md`, `styles/design-tokens.css`, `ARCHITECTURE.md`, `DECISIONS.md`, and `README.md`.
- **Observed implementation state:** this is a prebuild handoff pack; no application UI source, package manifest, existing components, screenshots, or visual-regression baselines are present yet. Framework-specific component conventions must be established by the application implementation, while this document remains the design contract.

## Brand

- **Personality:** a precise, calm developer laboratory. It should feel like an instrument panel for learning causality, not a generic AI SaaS dashboard and not a playful code-themed game.
- **Trust signals:** real synchronized simulator state; readable Git-like terminal output; stable graph lanes; explicit before/after previews; clear labels and semantic explanation; UI that remains useful when the AI is unavailable.
- **Differentiator:** Git X-Ray makes the invisible lifecycle of a change tangible: `WORKING TREE → STAGING AREA → REPOSITORY`. State transitions, not ornamental treatments, create the memorable moments.
- **Avoid:** marketing-only hero imagery, fake repository states, decorative gradients, ubiquitous glass panels, busy ambient animation, color-only state distinctions, unexplained Git jargon, fake performance/commercial claims, or controls that do not work.

## Product goals

- **Goals:**
  - Let a complete beginner understand what changed after each Git command without having to imagine the repository state.
  - Keep the Terminal, X-Ray, Graph, and Tutor/Lesson views visibly synchronized with one authoritative deterministic `GitState`.
  - Make difficult operations—especially conflict, reset, rebase, and recovery—safe to inspect through explicit, state-derived previews.
  - Provide a credible portfolio review flow that reaches a conflict and AI-assisted recovery in roughly one minute.
- **Non-goals:** emulate all of Git; use an LLM as parser/engine/validator; translate Git syntax or realistic Git CLI output; add accounts or backend/database for the portfolio version; compress every desktop panel into one mobile screen; present conceptual advanced operations as executable.
- **Success signals:** after Beginner Lesson 2, a first-time learner identifies Working Tree, Staging Area, and Repository; `git add` and `git commit` have visibly distinct semantics; beginner lessons remain keyboard-usable and complete without AI; mode/locale changes preserve lab state and progress.

## Personas and jobs

- **Primary personas:**
  - **First-time learner (Noob Mode, default):** needs visual objects before terminology, compact explanations, progressive hints, and a safe way to learn from mistakes.
  - **Developing practitioner (Pro Mode):** needs the same correct simulator with denser history, state inspection, reflog, and advanced challenges.
  - **Portfolio reviewer:** needs to quickly verify that the app has a real deterministic engine, a legible visual model, and a bounded, state-aware AI integration.
- **User jobs:** understand where a file/change lives; predict a command before running it; learn from real Git-like errors; inspect divergence/conflicts; recover from destructive-looking mistakes; build confidence with reproducible challenges.
- **Key contexts of use:** desktop learning sessions with simultaneous projections; keyboard-first command entry; small-screen review or practice where one learning surface is focused at a time; English and German runtime locales.

## Information architecture

- **Primary navigation:** lesson/curriculum navigation, laboratory workspace, mode selector, language/settings, and contextual access to Command Lens, State Inspector/Reflog, and AI Tutor. Onboarding is a short pre-lab flow, not a separate product area.
- **Core routes/screens:**
  - Onboarding: locale (auto-detected but editable), `Start from zero` / `I know the basics`, then enter the lab; at most three compact decisions and no account requirement.
  - Laboratory: the synchronized learning workspace containing lesson context, Git X-Ray, Commit Graph, Terminal, and optional Tutor/inspection tools.
  - Command Lens: a non-mutating before/after simulation for difficult or destructive commands, including risk level and affected state.
  - Reflog Time Machine: a recovery-oriented timeline for HEAD/ref movement and reachable/recoverable history.
  - Lessons/challenges: scenario, goal, real demo, deterministic challenge validator, and three progressive hints.
  - Settings: runtime mode, locale, motion preferences if offered, and reset/restart controls.
- **Content hierarchy:** current lesson goal and next action lead; current repository state is the primary evidence; terminal output and its localized explanation follow; optional advanced details (inspector, reflog, dense graph details, tutor) never obscure the beginner’s immediate task.

## Design principles

1. **Show the object before naming it.** Introduce visual state, demonstrate the transition, then name the Git concept and let the learner reproduce it.
2. **One state, four honest projections.** A UI view may simplify an explanation, but may not invent, delay into inconsistency, or conceal the actual deterministic repository state.
3. **Motion carries semantics.** Movement must explain staging, history creation, pointers, merging, conflict, reset, stash, and replay; it must not exist merely to make the page feel active.
4. **Beginner clarity wins.** Prefer legibility, causal sequence, and error recovery over density, visual novelty, or feature breadth.
5. **Progressive disclosure, never deception.** Noob Mode adds just-in-time explanation; Pro Mode reduces copy and increases inspectability without changing the simulator.
6. **The state stays recoverable.** Reset/rebase views must not falsely imply that existing commit objects disappeared. Reflog makes recoverability visible.
- **Tradeoffs:** preserve stable graph lanes over perfect imitation of native `git log --graph`; retain realistic English Git output even in German UI; use a focused mobile sequence rather than an illegible shrunken desktop dashboard; reduce breadth if it risks semantic correctness or learner comprehension.

## Visual language

- **Color:** use the supplied tokens exclusively as the base palette. The root is `--bg-root` (`#080b12`); workspace surfaces are opaque `--bg-surface` / `--bg-elevated`; overlays may use `--bg-overlay` sparingly. Use fine `--border-subtle` and `--border-strong` separators. Use semantic tokens (`--success`, `--warning`, `--danger`, `--info`) for meaning and pair every use with text, iconography, layout, or label. Graph branch colors use the fixed `--branch-*` tokens, with stable lane/color assignment; `--branch-main` prefers the main lane. Do not introduce broad gradients.
- **Typography:** headings use Outfit or an equivalent strong display face; body and controls use Inter; terminal, commands, hashes, filenames, and graph code labels use JetBrains Mono. Keep explanatory copy compact, with code visually and semantically distinct. Maintain a clear hierarchy between lesson goal, current state label, terminal output, and optional explanation.
- **Spacing/layout rhythm:** use the token scale (`4, 8, 12, 16, 24, 32, 48px`) and avoid arbitrary gaps. Favor a dense-but-breathable instrument-panel composition: stable grouped controls, clear panel headers, and generous separation only between conceptual regions.
- **Shape/radius/elevation:** use `--radius-sm` for compact controls/cards, `--radius-md` for normal panels, and `--radius-lg`/`--radius-xl` only for sheets and high-level overlays. Panels are mostly opaque with restrained `--shadow-panel`; Command Lens and Tutor may be translucent only when their overlay relationship improves focus. Do not make every panel glass.
- **Motion:** use `--ease-out`, with `--duration-fast` for hover/focus, `--duration-ui` for panels/tooltips, and `--duration-semantic` as the default semantic transition. Semantic demos may slow meaningful steps to 600–1100ms. Command execution never waits for animation completion.
- **Imagery/iconography:** prioritize native state diagrams, SVG graph nodes/edges, concise line icons, badges, and labels over stock imagery. Icons supplement—never replace—visible labels or accessible names.

## Components

- **Existing components to reuse:** none exist in the repository yet. Implement the architecture’s projections as focused components—`GitXRay`, `GitGraph`, `Terminal`, `LessonView`, `CommandLens`, `AITutor`, `StateInspector`, `Navigation`, and `Onboarding`—rather than a single shadow-state dashboard. Shared primitives should be minimal and token-driven, not a new component framework.
- **New/changed components:**
  - **Git X-Ray:** three structurally distinct labeled zones; file cards display filename and semantic state (`unchanged`, `modified`, `staged`, `deleted`, `conflicted`).
  - **Commit Graph:** deterministic SVG DAG with circle nodes, short hashes, optional messages, real parent edges, ref/tag badges, explicit symbolic/detached HEAD treatment, pan/zoom/reset controls, and details popover.
  - **Terminal:** selectable/readable DOM text, English Git-like output, command history, and optional localized Noob explanation beneath the output.
  - **Command Lens:** explicit before/after state, pointer movement, Working Tree/index impact, affected commits, and `safe` / `caution` / `destructive` risk presentation.
  - **AI Tutor:** secondary contextual panel/sheet; clearly framed as advice about state, never a state-mutating authority.
  - **Conflict surface:** exposes base, ours, and theirs as competing content; it is not a red status badge.
  - **Reflog Time Machine:** ref/HEAD timeline and recoverable-history explanation that complements, rather than corrupts, the normal graph.
- **Variants and states:** every interactive component supports default, hover, focus-visible, pressed where relevant, disabled, loading/pending, success, error, and reduced-motion behavior. Components representing repository state additionally support empty/new repository, modified, staged, conflict, detached HEAD, and unavailable-AI states where applicable.
- **Token/component ownership:** `styles/design-tokens.css` owns palette, radii, spacing, shadows, easing, and duration values. Components may compose tokens but must not encode competing raw visual constants. The deterministic engine owns semantic state/effects; UI components consume projections and `GitEffect[]` only.

## Accessibility

- **Target standard:** meet the acceptance contract for the complete beginner path and implement WCAG 2.2 AA as the working baseline for contrast, focus, semantics, and keyboard access.
- **Keyboard/focus behavior:** Enter submits terminal commands; ArrowUp/ArrowDown navigate terminal history; buttons, lesson items, and commit nodes are focusable; dialogs/sheets trap focus and restore it on close; Escape closes dismissible overlays. Focus indicators must be visible against dark surfaces and use `--shadow-focus` or an equivalently clear token-based treatment.
- **Contrast/readability:** do not rely on low-contrast muted text for essential information. Color is always redundant with a label, shape, outline, icon, position, or status text. Terminal output remains readable and selectable DOM text—not canvas-only content.
- **Screen-reader semantics:** give controls accessible names; communicate status/risk/command result changes appropriately; provide a textual graph summary such as `HEAD → feature at c123; feature is 2 commits ahead of main`; represent conflict, branch, success, and detached-HEAD state in words as well as visuals.
- **Reduced motion and sensory considerations:** respect `prefers-reduced-motion` via the supplied 1ms token overrides. Replace travel effects with cross-fade, highlight, static before/after states, and labels so the causal result remains comprehensible. Do not use looping decorative motion, strobing, or motion required to understand state.

## Responsive behavior

- **Supported breakpoints/devices:** validate at 390, 768, 1024, 1280, and 1440px viewport widths. There must be no page-level horizontal overflow at approximately 390px.
- **Layout adaptations:**
  - **Desktop (1024px+):** persistent left navigation around 248–280px; fluid center workspace; AI Tutor dock/overlay around 380–420px; graph and X-Ray above Terminal or in an adaptive split based on height.
  - **Tablet (768–1023px):** retain the current lesson and a clear primary repository projection; allow secondary inspection/Tutor surfaces to dock, collapse, or become sheets.
  - **Mobile (390px baseline):** present one primary learning surface at a time; navigation is a drawer/sheet, AI becomes full-screen/sheet, and Graph/X-Ray may have their own local horizontal inspection/pan area. Terminal command entry and output must remain practical; do not shrink the three-panel desktop layout into illegibility.
- **Touch/hover differences:** never hide essential actions behind hover. Provide touch-sized targets and explicit graph pan/zoom/reset controls; tooltip-only information needs an equivalent tap/focus or always-visible treatment.

## Interaction states

- **Loading:** use compact skeletons or reserved panel space for non-stateful UI work. Do not make deterministic command results appear uncertain; clearly distinguish an AI/network wait from simulator processing.
- **Empty:** explain the next useful learning action—such as initialize/modify a virtual file—rather than showing a generic empty card. Empty graph/X-Ray states still establish their conceptual zones.
- **Error:** preserve Git-like terminal output and add one concise localized Noob explanation stating what changed, why nothing happened, what Git needs, what is risky, or how to inspect state. Never silently accept unsupported/wrong commands.
- **Success:** confirm the resulting state through the synchronized Terminal, X-Ray, Graph, and lesson/challenge feedback. Do not use a celebratory badge as the only evidence.
- **Disabled:** state why an action is unavailable and what prerequisite is missing. Do not ship inert controls.
- **Offline/slow network:** all deterministic labs, lessons, challenges, previews, and Git behavior remain functional. AI failure becomes a clear, non-blocking unavailable state with no loss of repository or lesson state.

## Content voice

- **Tone:** concise, calm, direct, encouraging, and technically honest. Explain a learner’s next mental model; do not over-celebrate or hide complexity behind vague reassurance.
- **Terminology:** show the everyday object first, then the Git term. Preserve familiar Git terms exactly where needed: `Working Tree`, `Staging Area`, `Repository`, `HEAD`, branch, commit, hash, merge base, and reflog. Teach rather than invent novel translations.
- **Microcopy rules:**
  - In Noob Mode, answer only the immediate question: what changed, why nothing happened, what Git needs, what is risky, or how to inspect the state.
  - Hint progression is fixed: conceptual → command family → near/exact command.
  - English and German localize UI, lessons, hints, challenge feedback, X-Ray, Command Lens, Tutor, tooltips, toasts, dialogs, and accessibility labels.
  - Git commands, realistic Git CLI output, branch/file names, and hashes remain English/unchanged across locales.
  - German uses direct `du`, simple sentence structure in Noob Mode, technical precision, and familiar English Git terms with explanation as needed.

## Implementation constraints

- **Framework/styling system:** Vite/React initialization is expected; use TypeScript strict mode. There is no Tailwind or component framework. Build the UI from React components and repository-native CSS/token patterns; use SVG for the in-house graph.
- **Design-token constraints:** import and use `styles/design-tokens.css`. Do not add an overlapping token system, substitute raw competing colors/timing/spacing values, or depend on ambient gradients to establish hierarchy.
- **State and motion constraints:** React components never own shadow copies of repository state. The engine emits ordered `GitEffect[]`; animation consumes those effects and never parses terminal strings to infer semantic changes. Preview runs against an isolated state clone and never mutates the live lab.
- **Graph constraints:** newest history appears near the top; `x` is lane and `y` is topological/history row. Keep lanes stable across small updates, main in lane 0 where possible, allocate nearest free lanes on divergence, and use real SVG edges for parent relations. Fast-forward moves a ref with no fake merge node; reset/rebase preserve the truth that recoverable commits may still exist.
- **Performance constraints:** memoize graph/X-Ray projections; favor SVG paths, transforms, and opacity; throttle pan/zoom pointer work; lazy-render rich details/tooltips; never block command execution on animation.
- **Compatibility constraints:** respect `prefers-reduced-motion`; support keyboard-only core learning; preserve locale, mode, progress, and repo state appropriately across runtime UI changes. Browser locale initializes `de` for `navigator.language` values beginning with `de`; otherwise `en`, while a persisted user choice wins.
- **Test/screenshot expectations:** test deterministic engine/validator behavior before visual snapshots. Validate responsive widths (390, 768, 1024, 1280, 1440), keyboard/focus behavior, locale switching without state loss, AI outage, reduced-motion comprehension, and material console errors. Visual QA should inspect semantic synchronization, not merely panel styling.

## Open questions

- [ ] **Brand assets / owner: product implementation / impact: medium.** No logo, illustration direction, or approved screenshot baseline exists in this handoff. Until provided, use a typographic product mark and native Git-state visualization rather than stock or generated imagery.
- [ ] **Exact font delivery / owner: frontend implementation / impact: low.** Outfit, Inter, and JetBrains Mono are specified, but font loading/source strategy is not yet chosen. Use accessible fallback stacks while avoiding layout shifts.
- [ ] **Graph interaction density on mobile / owner: frontend implementation / impact: medium.** The contract requires local inspectability, but exact initial zoom, viewport height, and popover behavior should be set from implementation-level usability testing at 390px.
- [ ] **AI Tutor presentation breakpoint / owner: frontend implementation / impact: low.** Desktop dimensions are specified; tablet docking versus sheet behavior can be finalized once the workspace’s actual panel content is available.
