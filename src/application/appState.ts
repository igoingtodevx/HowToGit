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
}

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

export interface AppState {
  git: GitState;
  locale: Locale;
  mode: LearningMode;
  progress: Record<string, LessonProgress>;
  terminal: TerminalEntry[];
  effects: GitEffect[];
  activeLessonId: string;
  interaction: InteractionState;
  onboarded: boolean;
}

export function createEmptyGitState(): GitState {
  return createGitState();
}

export function createInitialAppState(
  locale: Locale,
  progress: Record<string, LessonProgress> = {},
  mode: LearningMode = 'noob',
  git: GitState = createEmptyGitState(),
  onboarded = false,
): AppState {
  return {
    git,
    locale,
    mode,
    progress,
    terminal: [],
    effects: [],
    activeLessonId: 'b02',
    interaction: { commands: [], logExecuted: false, stashCreated: false, stashInspected: false, stashRestored: false, undoResetSeen: false, undoRevertSeen: false, fetched: false, inspectedRefs: [], conceptAnswers: {} },
    onboarded,
  };
}
