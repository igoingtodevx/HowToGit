import type {
  GitEffect,
  GitState,
  LearningMode,
  LessonProgress,
  Locale,
} from '../../engine/types';
import { createGitState } from '../../engine/state';

export interface TerminalEntry {
  id: number;
  input: string;
  success: boolean;
  lines: Array<{ text: string; tone: string }>;
  errorCode?: string;
  explanationKey?: string;
  /** `git <verb>` the learner probably meant, from typo detection. */
  correction?: string;
}

export type ConfirmAnswer = string | number | boolean | readonly string[];

export interface InteractionState {
  commands: string[];
  logExecuted: boolean;
  stashCreated: boolean;
  stashInspected: boolean;
  stashRestored: boolean;
  undoResetSeen: boolean;
  undoRevertSeen: boolean;
  fetched: boolean;
  inspectedRefs: string[];
  conceptAnswers: Record<string, string | boolean | readonly string[]>;
}

/** Guided flow stages: Learn → Try → See → Confirm → Done. Pro mode ignores stages. */
export type LessonStage = 'learn' | 'try' | 'see' | 'confirm' | 'done';

export interface FlowState {
  stage: LessonStage;
  /** Hints revealed during the current attempt. */
  hintCount: number;
  /** Answers to the "check your understanding" questions of the active lesson. */
  confirmAnswers: Record<string, ConfirmAnswer>;
  /** Milestone celebration pending for the current completion ('b05' | 'b10'). */
  celebrateKey?: 'b05' | 'b10';
}

export interface AppState {
  git: GitState;
  locale: Locale;
  mode: LearningMode;
  progress: Record<string, LessonProgress>;
  terminal: TerminalEntry[];
  effects: GitEffect[];
  activeLessonId: string;
  interaction: InteractionState;
  flow: FlowState;
  onboarded: boolean;
}

export const createInitialFlowState = (): FlowState => ({
  stage: 'learn',
  hintCount: 0,
  confirmAnswers: {},
});

export function createEmptyGitState(): GitState {
  return createGitState();
}

export function createInitialAppState(
  locale: Locale,
  progress: Record<string, LessonProgress> = {},
  mode: LearningMode = 'noob',
  git: GitState = createEmptyGitState(),
  onboarded = false,
  activeLessonId = 'b01',
): AppState {
  return {
    git,
    locale,
    mode,
    progress,
    terminal: [],
    effects: [],
    activeLessonId,
    interaction: { commands: [], logExecuted: false, stashCreated: false, stashInspected: false, stashRestored: false, undoResetSeen: false, undoRevertSeen: false, fetched: false, inspectedRefs: [], conceptAnswers: {} },
    flow: createInitialFlowState(),
    onboarded,
  };
}
