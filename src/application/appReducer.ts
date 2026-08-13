import type { AppAction } from './actions';
import { executeCommand } from '../../engine/commandExecutor';
import { createGitState, removeWorkingFile, resolveConflict, writeWorkingFile } from '../../engine/state';
import { createInitialAppState, type AppState } from './appState';

function explanationFor(errorCode: string | undefined, input: string): string | undefined {
  if (errorCode === 'NOTHING_TO_COMMIT') return 'statusHelp.nothingToCommit';
  if (errorCode === 'UNRESOLVED_CONFLICTS' || errorCode === 'CONFLICT_NOT_EDITED') return 'statusHelp.conflict';
  if (/^git\s+status/.test(input)) return undefined;
  return undefined;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'locale/changed':
      return { ...state, locale: action.locale };
    case 'mode/changed':
      return { ...state, mode: action.mode };
    case 'git/replaced':
      return { ...state, git: action.git };
    case 'progress/updated':
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.progress.lessonId]: action.progress,
        },
      };
    case 'command/executed': {
      const result = executeCommand(state.git, action.input);
      const interaction = { ...state.interaction };
      interaction.commands = [...interaction.commands, action.input];
      if (/^git\s+log\b/.test(action.input) && result.success) interaction.logExecuted = true;
      if (/^git\s+stash(?:\s+-m|\s+push|\s*$)/.test(action.input) && result.success) interaction.stashCreated = true;
      if (/^git\s+stash\s+list/.test(action.input) && result.success) interaction.stashInspected = true;
      if (/^git\s+stash\s+pop/.test(action.input) && result.success) interaction.stashRestored = true;
      if (/^git\s+reset\b/.test(action.input) && result.success) interaction.undoResetSeen = true;
      if (/^git\s+revert\b/.test(action.input) && result.success) interaction.undoRevertSeen = true;
      if (/^git\s+fetch\b/.test(action.input) && result.success) interaction.fetched = true;
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
          ...(explanationFor(result.errorCode, action.input) ? { explanationKey: explanationFor(result.errorCode, action.input) } : {}),
        }].slice(-40),
      };
    }
    case 'file/edited':
      return { ...state, git: writeWorkingFile(state.git, action.path, action.content), effects: [{ type: 'WORKTREE_CHANGED', paths: [action.path] }] };
    case 'file/deleted':
      return { ...state, git: removeWorkingFile(state.git, action.path), effects: [{ type: 'WORKTREE_CHANGED', paths: [action.path] }] };
    case 'conflict/resolved':
      return { ...state, git: resolveConflict(state.git, action.path, action.content), effects: [{ type: 'WORKTREE_CHANGED', paths: [action.path] }] };
    case 'lesson/selected':
      return { ...state, activeLessonId: action.lessonId };
    case 'lesson/restarted':
      return { ...state, git: action.git, activeLessonId: action.lessonId, terminal: [], effects: [], interaction: { commands: [], logExecuted: false, stashCreated: false, stashInspected: false, stashRestored: false, undoResetSeen: false, undoRevertSeen: false, fetched: false, inspectedRefs: [], conceptAnswers: {} } };
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
