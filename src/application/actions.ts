import type { GitEffect, GitState, LearningMode, LessonProgress, Locale } from '../../engine/types';
import type { ConfirmAnswer, FlowState, InteractionState, LessonStage } from './appState';

export type AppAction =
  | { type: 'locale/changed'; locale: Locale }
  | { type: 'mode/changed'; mode: LearningMode }
  | { type: 'git/replaced'; git: GitState }
  | { type: 'progress/updated'; progress: LessonProgress }
  | { type: 'command/executed'; input: string }
  | { type: 'file/edited'; path: string; content: string }
  | { type: 'file/deleted'; path: string }
  | { type: 'conflict/resolved'; path: string; content: string }
  | { type: 'lesson/selected'; lessonId: string }
  | { type: 'lesson/restarted'; git: GitState; lessonId: string }
  | { type: 'flow/stage'; stage: LessonStage }
  | { type: 'flow/hintRevealed' }
  | { type: 'flow/confirmAnswered'; key: string; value: ConfirmAnswer }
  | { type: 'flow/reset'; flow?: Partial<FlowState> }
  | { type: 'lab/reset' }
  | { type: 'effects/cleared' }
  | { type: 'demo/state'; git: GitState; effects: GitEffect[]; interaction?: InteractionState }
  | { type: 'concept/answered'; key: string; value: string | boolean | readonly string[] }
  | { type: 'concept/reset' }
  | { type: 'onboarding/completed' };
