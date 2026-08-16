import type { CommandResult, GitState, Locale } from '../../engine';

export type LessonId = `b${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'}`
  | `a${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'}`;
export type ExecutableLessonId = Exclude<LessonId, 'a08' | 'a09' | 'a10'>;
export type ConceptualLessonId = Extract<LessonId, 'a08' | 'a09' | 'a10'>;
export type Track = 'beginner' | 'advanced';
export type ScenarioId = `scenario-${string}`;
export type ValidatorId = `validator-${string}`;

export interface LocalizedText { en: string; de: string }

export interface LessonInteractionFlags {
  commands: readonly string[];
  logExecuted: boolean;
  stashCreated: boolean;
  stashInspected: boolean;
  stashRestored: boolean;
  undoResetSeen: boolean;
  undoRevertSeen: boolean;
  fetched: boolean;
  selectedCommit?: string;
  selectedReflog?: string;
  inspectedRefs: readonly string[];
  conceptAnswers: Readonly<Record<string, string | boolean | readonly string[]>>;
}

export interface LessonDefinition {
  id: LessonId;
  track: Track;
  order: number;
  titleKey: string;
  objectiveKey: string;
  whyKey: string;
  mentalModelKey: string;
  concepts: readonly string[];
  commands: readonly string[];
  scenarioId: ScenarioId;
  validatorId: ValidatorId;
  conceptual: boolean;
  interaction: { terminal: boolean; files: boolean; concepts: boolean };
}

export interface ChallengeDefinition {
  lessonId: LessonId;
  goal: LocalizedText;
  oraclePredicates: readonly string[];
}

export type DemoStepKind = 'terminal' | 'fileEdit' | 'selectCommit' | 'openConflict' | 'resolveConflict'
  | 'resetScenario' | 'inspectRefs' | 'interactiveRebase' | 'selectReflog' | 'inspectMergeBase' | 'concept';

export interface DemoStep {
  kind: DemoStepKind;
  value: unknown;
  narration: LocalizedText;
  focus: string;
}

export interface DemoScript { lessonId: LessonId; steps: readonly DemoStep[] }
export interface ScenarioDefinition { id: ScenarioId; description: string }

/** A "check your understanding" question shown in the Confirm stage. Copy lives in i18n under `confirm.<id>.*`. */
export interface ConfirmQuestion {
  id: string;
  kind: 'choice' | 'order';
  /** Index of the correct option (choice) — options are `confirm.<id>.option.<n>` i18n keys. */
  correctIndex?: number;
  optionCount: number;
  /** Correct sequence for order questions — the learner's value is an array of option indexes. */
  correctOrder?: readonly number[];
}

export interface LessonRuntimeDefinition extends LessonDefinition {
  scenario: ScenarioDefinition;
  challenge: ChallengeDefinition;
  demo: DemoScript;
  hints: Readonly<Record<Locale, readonly [string, string, string]>>;
  validator: LessonValidator;
  confirm: readonly ConfirmQuestion[];
}

export interface ChallengeValidationResult {
  complete: boolean;
  satisfied: Array<{ key: string; labelKey: string }>;
  remaining: Array<{ key: string; labelKey: string }>;
  feedbackKey?: string;
}

export interface ValidationContext {
  state: GitState;
  initialState: GitState;
  interaction: LessonInteractionFlags;
}

export type LessonValidator = (context: ValidationContext) => ChallengeValidationResult;

export interface DemoRuntime {
  lessonId: LessonId;
  state: GitState;
  initialState: GitState;
  interaction: LessonInteractionFlags;
  selectedCommit?: string;
  lastCommand?: CommandResult;
}

