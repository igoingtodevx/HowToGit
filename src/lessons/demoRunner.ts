import { executeCommand, executeInteractiveRebase, resolveConflict, uniqueCommitsSince, writeWorkingFile } from '../../engine';
import type { CommandResult } from '../../engine';
import { getLesson } from './catalog';
import { createLessonScenario, createScenarioById } from './scenarios';
import type { DemoRuntime, DemoStep, LessonId, LessonInteractionFlags, ScenarioId } from './types';

export interface ConceptualDemoRuntime {
  lessonId: 'a08' | 'a09' | 'a10';
  conceptual: true;
  state: null;
  interaction: LessonInteractionFlags;
}

export const emptyLessonInteractions = (): LessonInteractionFlags => ({
  commands: [], logExecuted: false, stashCreated: false, stashInspected: false, stashRestored: false,
  undoResetSeen: false, undoRevertSeen: false, fetched: false, inspectedRefs: [], conceptAnswers: {},
});

export function createDemoRuntime(lessonId: LessonId): DemoRuntime {
  const state = createLessonScenario(lessonId);
  if (!state) throw new Error(`${lessonId} is conceptual and has no executable Git scenario`);
  return { lessonId, state, initialState: structuredClone(state), interaction: emptyLessonInteractions() };
}

export function createConceptualDemoRuntime(lessonId: 'a08' | 'a09' | 'a10'): ConceptualDemoRuntime {
  return { lessonId, conceptual: true, state: null, interaction: emptyLessonInteractions() };
}

const resolveDemoCommand = (runtime: DemoRuntime, command: string): string => {
  if (command.includes('<selected-hash>')) {
    if (!runtime.selectedCommit) throw new Error('Demo command requires a selected commit');
    return command.replace('<selected-hash>', runtime.selectedCommit);
  }
  if (command.includes('<recovered-hash>')) {
    const target = runtime.initialState.reflog[0]?.oldTarget;
    if (!target) throw new Error('Demo command requires a reflog recovery target');
    return command.replace('<recovered-hash>', target);
  }
  return command;
};

const withCommandFlags = (flags: LessonInteractionFlags, command: string, result: CommandResult): LessonInteractionFlags => ({
  ...flags,
  commands: [...flags.commands, command],
  logExecuted: flags.logExecuted || (result.success && /^git log(?:\s|$)/.test(command)),
  stashCreated: flags.stashCreated || result.effects.some((effect) => effect.type === 'STASH_CREATED'),
  stashInspected: flags.stashInspected || (result.success && command === 'git stash list'),
  stashRestored: flags.stashRestored || result.effects.some((effect) => effect.type === 'STASH_APPLIED'),
  undoResetSeen: flags.undoResetSeen || (result.success && /^git reset\s/.test(command)),
  undoRevertSeen: flags.undoRevertSeen || (result.success && /^git revert\s/.test(command)),
  fetched: flags.fetched || (result.success && /^git fetch(?:\s|$)/.test(command)),
});

export function runDemoStep(runtime: DemoRuntime, step: DemoStep): DemoRuntime {
  if (step.kind === 'terminal') {
    const command = resolveDemoCommand(runtime, String(step.value));
    const executed = executeCommand(runtime.state, command);
    const lastCommand = executed.errorCode === 'INTERACTIVE_REBASE_UI_REQUIRED'
      ? { ...executed, success: true, output: executed.output.map((item) => ({ ...item, tone: 'accent' as const })), errorCode: undefined }
      : executed;
    if (!lastCommand.success) throw new Error(`Demo ${runtime.lessonId} failed at ${command}: ${lastCommand.errorCode ?? 'UNKNOWN'}`);
    return { ...runtime, state: lastCommand.nextState, lastCommand, interaction: withCommandFlags(runtime.interaction, command, lastCommand) };
  }
  if (step.kind === 'fileEdit') {
    const edit = step.value as { path: string; content: string };
    return { ...runtime, state: writeWorkingFile(runtime.state, edit.path, edit.content) };
  }
  if (step.kind === 'resolveConflict') {
    const resolution = step.value as { path: string; content?: string };
    const conflict = runtime.state.operation?.conflicts[resolution.path];
    const content = resolution.content ?? [conflict?.ours, conflict?.theirs].filter((value): value is string => Boolean(value)).join('');
    return { ...runtime, state: resolveConflict(runtime.state, resolution.path, content) };
  }
  if (step.kind === 'resetScenario') {
    const state = createScenarioById(String(step.value) as ScenarioId);
    if (!state) throw new Error(`Cannot reset executable demo to ${String(step.value)}`);
    return { ...runtime, state };
  }
  if (step.kind === 'selectCommit') {
    const value = String(step.value);
    const selectedCommit = value === 'HEAD'
      ? (runtime.state.head.kind === 'detached' ? runtime.state.head.target : runtime.state.branches[runtime.state.head.branch]?.target ?? undefined)
      : runtime.state.commits[value] ? value : (runtime.state.branches[value]?.target ?? undefined);
    return { ...runtime, selectedCommit, interaction: { ...runtime.interaction, selectedCommit } };
  }
  if (step.kind === 'selectReflog') {
    const selectedReflog = (step.value === 'lost-tip' ? runtime.state.reflog[0]?.oldTarget : String(step.value)) ?? undefined;
    return { ...runtime, selectedCommit: selectedReflog ?? runtime.selectedCommit, interaction: { ...runtime.interaction, selectedReflog } };
  }
  if (step.kind === 'inspectRefs') {
    return { ...runtime, interaction: { ...runtime.interaction, inspectedRefs: [...runtime.interaction.inspectedRefs, ...(step.value as string[])] } };
  }
  if (step.kind === 'interactiveRebase') {
    const branch = runtime.state.head.kind === 'symbolic' ? runtime.state.head.branch : null;
    const tip = branch ? runtime.state.branches[branch]?.target ?? null : null;
    const base = runtime.state.branches.main?.target ?? null;
    if (!tip || !base) throw new Error('Interactive rebase demo requires feature and main tips');
    const commitIds = uniqueCommitsSince(runtime.state.commits, tip, base);
    const actions = step.value as Array<'pick' | 'reword' | 'squash' | 'drop'>;
    const lastCommand = executeInteractiveRebase(runtime.state, base, commitIds.map((commitId, index) => actions[index] === 'reword'
      ? { commitId, action: 'reword' as const, message: 'Polished feature history' }
      : { commitId, action: actions[index] ?? 'pick' }));
    if (!lastCommand.success) throw new Error(`Interactive rebase demo failed: ${lastCommand.errorCode ?? 'UNKNOWN'}`);
    const command = 'git rebase -i HEAD~3';
    return { ...runtime, state: lastCommand.nextState, lastCommand, interaction: withCommandFlags(runtime.interaction, command, lastCommand) };
  }
  return runtime;
}

export function runLessonDemo(lessonId: LessonId): DemoRuntime {
  const lesson = getLesson(lessonId);
  if (lesson.conceptual) throw new Error(`${lessonId} is a conceptual walkthrough, not an executable demo`);
  return lesson.demo.steps.reduce(runDemoStep, createDemoRuntime(lessonId));
}

export function recordConceptAnswer(runtime: DemoRuntime, key: string, value: string | boolean | readonly string[]): DemoRuntime {
  return { ...runtime, interaction: { ...runtime.interaction, conceptAnswers: { ...runtime.interaction.conceptAnswers, [key]: value } } };
}
