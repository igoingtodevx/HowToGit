import type { AppAction } from './actions';
import { executeCommand } from '../../engine/commandExecutor';
import { createGitState, removeWorkingFile, resolveConflict, writeWorkingFile } from '../../engine/state';
import { feedbackFor } from '../lessons/feedback';
import { createInitialAppState, createInitialFlowState, type AppState } from './appState';

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'locale/changed':
      return { ...state, locale: action.locale };
    case 'mode/changed':
      return { ...state, mode: action.mode };
    case 'git/replaced':
      return { ...state, git: action.git };
    case 'progress/updated': {
      const previous = state.progress[action.progress.lessonId];
      const merged = {
        ...previous,
        ...action.progress,
        perfect: Boolean(action.progress.perfect || previous?.perfect),
        hintsUsed: Math.min(previous?.hintsUsed ?? action.progress.hintsUsed, action.progress.hintsUsed),
      };
      return { ...state, progress: { ...state.progress, [action.progress.lessonId]: merged } };
    }
    case 'command/executed': {
      const result = executeCommand(state.git, action.input);
      const interaction = { ...state.interaction };
      interaction.commands = [...interaction.commands, action.input];
      const effectTypes = new Set(result.effects.map((effect) => effect.type));
      if (/^git\s+log\b/.test(action.input) && result.success) interaction.logExecuted = true;
      if (effectTypes.has('STASH_CREATED')) interaction.stashCreated = true;
      if (/^git\s+stash\s+list/.test(action.input) && result.success) interaction.stashInspected = true;
      if (effectTypes.has('STASH_APPLIED')) interaction.stashRestored = true;
      if (effectTypes.has('RESET_PERFORMED')) interaction.undoResetSeen = true;
      if (/^git\s+revert\b/.test(action.input) && result.success) interaction.undoRevertSeen = true;
      // `git pull` performs a fetch internally — its REMOTE_UPDATED effect counts as fetching.
      if (effectTypes.has('REMOTE_UPDATED')) interaction.fetched = true;
      const feedback = feedbackFor(action.input, result.errorCode);
      return {
        ...state,
        git: result.nextState,
        effects: result.effects,
        interaction,
        terminal: [...state.terminal, {
          id: state.terminal.length + 1,
          input: action.input,
          success: result.success,
          lines: result.output,
          ...(result.errorCode ? { errorCode: result.errorCode } : {}),
          ...(feedback.feedbackKey ? { explanationKey: feedback.feedbackKey } : {}),
          ...(feedback.correction ? { correction: feedback.correction } : {}),
        }].slice(-40),
      };
    }
    case 'file/edited':
      return { ...state, git: writeWorkingFile(state.git, action.path, action.content), effects: [{ type: 'WORKTREE_CHANGED', paths: [action.path] }] };
    case 'file/deleted':
      return { ...state, git: removeWorkingFile(state.git, action.path), effects: [{ type: 'WORKTREE_CHANGED', paths: [action.path] }] };
    case 'conflict/resolved':
      return { ...state, git: resolveConflict(state.git, action.path, action.content), effects: [{ type: 'WORKTREE_CHANGED', paths: [action.path] }] };
    case 'lesson/selected': {
      if (action.lessonId === state.activeLessonId) return state;
      const completed = state.progress[action.lessonId]?.completed;
      return {
        ...state,
        activeLessonId: action.lessonId,
        flow: { ...createInitialFlowState(), stage: completed ? 'done' : 'learn' },
      };
    }
    case 'lesson/restarted':
      return {
        ...state,
        git: action.git,
        activeLessonId: action.lessonId,
        terminal: [],
        effects: [],
        interaction: { commands: [], logExecuted: false, stashCreated: false, stashInspected: false, stashRestored: false, undoResetSeen: false, undoRevertSeen: false, fetched: false, inspectedRefs: [], conceptAnswers: {} },
        flow: createInitialFlowState(),
      };
    case 'flow/stage':
      return { ...state, flow: { ...state.flow, stage: action.stage } };
    case 'flow/hintRevealed':
      return { ...state, flow: { ...state.flow, hintCount: Math.min(3, state.flow.hintCount + 1) } };
    case 'flow/confirmAnswered':
      return { ...state, flow: { ...state.flow, confirmAnswers: { ...state.flow.confirmAnswers, [action.key]: action.value } } };
    case 'flow/reset':
      return { ...state, flow: { ...state.flow, ...action.flow } };
    case 'lab/reset': {
      const fresh = createInitialAppState(state.locale, state.progress, state.mode, createGitState());
      return { ...fresh, activeLessonId: state.activeLessonId, onboarded: state.onboarded };
    }
    case 'effects/cleared':
      return { ...state, effects: [] };
    case 'demo/state':
      return { ...state, git: action.git, effects: action.effects, ...(action.interaction ? { interaction: action.interaction } : {}) };
    case 'concept/answered':
      return { ...state, interaction: { ...state.interaction, conceptAnswers: { ...state.interaction.conceptAnswers, [action.key]: action.value } } };
    case 'concept/reset':
      return { ...state, interaction: { ...state.interaction, conceptAnswers: {} } };
    case 'onboarding/completed':
      return { ...state, onboarded: true };
  }
}
