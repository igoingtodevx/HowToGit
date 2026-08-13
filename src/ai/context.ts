import type { AITutorContext, TutorIntent } from '../../ai/schemas';
import { COMMAND_CAPABILITIES } from '../../engine/commandCatalog';
import { firstParentHistory } from '../../engine/graphAlgorithms';
import { currentBranchName, headCommitId, headTree } from '../../engine/state';
import { statusBetween } from '../../engine/tree';
import type { CommandHistoryEntry, GitState, LearningMode, Locale } from '../../engine/types';

const LIMITS = {
  branches: 24,
  commits: 12,
  files: 32,
  conflicts: 16,
  remotes: 12,
  commands: 8,
  concepts: 12,
  commandFamilies: 24,
} as const;

const clipped = (value: string, maximum: number): string => value.slice(0, maximum);
const sortedEntries = <T>(record: Readonly<Record<string, T>>): Array<[string, T]> =>
  Object.entries(record).sort(([left], [right]) => left.localeCompare(right));

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
};

export interface TutorContextOptions {
  locale: Locale;
  mode: LearningMode;
  intent: TutorIntent;
  currentLesson?: { id: string; objective: string; concepts: readonly string[] };
  recentCommands?: readonly CommandHistoryEntry[];
  supportedCommandFamilies?: readonly string[];
}

export const serializeTutorContext = (state: GitState, options: TutorContextOptions): Readonly<AITutorContext> => {
  const headId = headCommitId(state);
  const conflictEntries = state.operation ? sortedEntries(state.operation.conflicts) : [];
  const conflictedPaths = new Set(conflictEntries.map(([path]) => path));
  const statuses = statusBetween(headTree(state), state.index, state.workingTree, conflictedPaths);
  const recentCommitIds = firstParentHistory(state.commits, headId).slice(0, LIMITS.commits);
  const context: AITutorContext = {
    locale: options.locale,
    mode: options.mode,
    intent: options.intent,
    currentLesson: options.currentLesson ? {
      id: clipped(options.currentLesson.id, 120),
      objective: clipped(options.currentLesson.objective, 1_000),
      concepts: options.currentLesson.concepts.slice(0, LIMITS.concepts).map((concept) => clipped(concept, 100)),
    } : undefined,
    repo: {
      initialized: state.initialized,
      currentBranch: currentBranchName(state),
      detachedHead: state.head.kind === 'detached' ? state.head.target : null,
      headCommit: headId,
      branches: sortedEntries(state.branches).slice(0, LIMITS.branches).map(([, branch]) => ({
        name: clipped(branch.name, 120),
        tip: branch.target,
      })),
      recentCommits: recentCommitIds.map((id) => ({
        id,
        message: clipped(state.commits[id].message, 500),
        parents: state.commits[id].parents.slice(0, 2),
      })),
      workingTree: statuses.filter((status) => status.unstaged !== null).slice(0, LIMITS.files).map((status) => ({
        path: clipped(status.path, 240),
        status: status.unstaged ?? 'clean',
      })),
      staged: statuses.filter((status) => status.staged !== null).slice(0, LIMITS.files).map((status) => ({
        path: clipped(status.path, 240),
        status: status.staged ?? 'clean',
      })),
      conflicts: conflictEntries.slice(0, LIMITS.conflicts).map(([path, conflict]) => ({
        path: clipped(path, 240),
        resolved: conflict.resolved,
      })),
      remotes: sortedEntries(state.remotes).slice(0, LIMITS.remotes).map(([name, remote]) => ({
        name: clipped(name, 120),
        trackedBranches: [...new Set([
          ...Object.keys(remote.branches),
          ...Object.keys(state.remoteTrackingBranches)
            .filter((trackingName) => trackingName.startsWith(`${name}/`))
            .map((trackingName) => trackingName.slice(name.length + 1)),
        ])].sort().slice(0, LIMITS.branches).map((branch) => clipped(branch, 120)),
      })),
    },
    recentCommands: (options.recentCommands ?? []).slice(-LIMITS.commands).map((entry) => ({
      input: clipped(entry.input, 240),
      success: entry.success,
      errorCode: entry.errorCode ? clipped(entry.errorCode, 120) : undefined,
    })),
    supportedCommandFamilies: [...new Set(options.supportedCommandFamilies ?? COMMAND_CAPABILITIES.map(({ family }) => family))]
      .slice(0, LIMITS.commandFamilies)
      .map((family) => clipped(family, 40)),
  };
  return deepFreeze(context);
};
