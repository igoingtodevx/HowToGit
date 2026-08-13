import { parseCommand, type ParsedCommand } from './commandParser';
import { ancestorsOf, findMergeBase, isAncestor, uniqueCommitsSince } from './graphAlgorithms';
import { cloneState, currentBranchName, headCommitId, headTree, validateState } from './state';
import {
  applyChanges,
  cloneTree,
  diffTrees,
  mergeTrees,
  statusBetween,
  treeEquals,
  type TreeChange,
} from './tree';
import type {
  Commit,
  CommitId,
  CommandResult,
  GitEffect,
  GitState,
  ReflogEntry,
  TerminalOutputLine,
  TreeSnapshot,
} from './types';

const DEFAULT_AUTHOR = { name: 'GitFlow Learner', email: 'learner@gitflow.academy' };
const EMPTY_TREE: TreeSnapshot = Object.freeze({});

const line = (text: string, tone: TerminalOutputLine['tone'] = 'default'): TerminalOutputLine => ({ text, tone });

const failure = (state: GitState, errorCode: string, message: string): CommandResult => ({
  success: false,
  output: [line(message, 'error')],
  previousState: state,
  nextState: state,
  effects: [],
  errorCode,
});

const success = (
  previousState: GitState,
  nextState: GitState,
  output: TerminalOutputLine[] = [],
  effects: GitEffect[] = [],
): CommandResult => {
  const invariantProblems = validateState(nextState);
  if (invariantProblems.length > 0) return failure(previousState, 'INTERNAL_INVARIANT', invariantProblems.join('\n'));
  return { success: true, output, previousState, nextState, effects };
};

const requireRepository = (state: GitState): CommandResult | null =>
  state.initialized ? null : failure(state, 'NOT_A_REPOSITORY', 'fatal: not a git repository (or any parent directory): .git');

const advanceSequence = (state: GitState): number => {
  state.sequence += 1;
  return state.sequence;
};

const commitIdFor = (sequence: number): CommitId => `c${String(sequence).padStart(6, '0')}`;

const refName = (state: GitState): string => {
  if (state.head.kind === 'detached') return 'HEAD';
  return `refs/heads/${state.head.branch}`;
};

const appendReflog = (
  state: GitState,
  oldTarget: CommitId | null,
  newTarget: CommitId | null,
  command: string,
  message: string,
  ref = refName(state),
): void => {
  const entry: ReflogEntry = {
    sequence: state.sequence,
    oldTarget,
    newTarget,
    ref,
    command,
    message,
    timestamp: state.sequence,
  };
  state.reflog.unshift(entry);
};

const resolveCommitish = (state: GitState, value: string): CommitId | null => {
  const ancestorMatch = /^(HEAD|[^~]+)~(\d+)$/.exec(value);
  if (ancestorMatch) {
    const base = resolveCommitish(state, ancestorMatch[1]);
    if (base === null) return null;
    let current: CommitId | null = base;
    for (let count = Number(ancestorMatch[2]); count > 0; count -= 1) current = current ? state.commits[current]?.parents[0] ?? null : null;
    return current;
  }
  if (value === 'HEAD') return headCommitId(state);
  if (state.branches[value]) return state.branches[value].target;
  if (state.tags[value]) return state.tags[value].target;
  if (value in state.remoteTrackingBranches) return state.remoteTrackingBranches[value];
  if (state.commits[value]) return value;
  const matches = Object.keys(state.commits).filter((id) => id.startsWith(value));
  return matches.length === 1 ? matches[0] : null;
};

const setHeadTarget = (state: GitState, target: CommitId | null): { branch: string | null; from: CommitId | null } => {
  const from = headCommitId(state);
  if (state.head.kind === 'detached') {
    if (target !== null) state.head = { kind: 'detached', target };
    return { branch: null, from };
  }
  const branch = state.head.branch;
  state.branches[branch].target = target;
  state.head = target === null ? { kind: 'unborn', branch } : { kind: 'symbolic', branch };
  return { branch, from };
};

const makeCommit = (
  state: GitState,
  message: string,
  parents: CommitId[],
  tree: TreeSnapshot,
  command: string,
): { commit: Commit; effects: GitEffect[] } => {
  const oldTarget = headCommitId(state);
  const branch = currentBranchName(state);
  const sequence = advanceSequence(state);
  const commit: Commit = {
    id: commitIdFor(sequence),
    message,
    author: DEFAULT_AUTHOR,
    timestamp: sequence,
    parents,
    tree: cloneTree(tree),
  };
  state.commits[commit.id] = commit;
  setHeadTarget(state, commit.id);
  appendReflog(state, oldTarget, commit.id, command, `commit: ${message}`);
  const effects: GitEffect[] = [{ type: 'COMMIT_CREATED', commitId: commit.id, parentIds: parents }];
  if (branch) effects.push({ type: 'BRANCH_MOVED', branch, from: oldTarget, to: commit.id });
  effects.push({ type: 'HEAD_MOVED', from: oldTarget, to: commit.id, detached: branch === null });
  return { commit, effects };
};

const headStatus = (state: GitState) => statusBetween(
  headTree(state),
  state.index,
  state.workingTree,
  new Set(state.operation ? Object.keys(state.operation.conflicts) : []),
);

const localChangePaths = (state: GitState): Set<string> =>
  new Set(headStatus(state).map((status) => status.path));

const operationWouldOverwriteLocalChanges = (
  state: GitState,
  changedPaths: ReadonlySet<string>,
): string[] => [...localChangePaths(state)].filter((path) => changedPaths.has(path)).sort();

const localChangesOverwrittenFailure = (
  state: GitState,
  paths: readonly string[],
  operation: string,
): CommandResult =>
  failure(
    state,
    'LOCAL_CHANGES_OVERWRITTEN',
    `error: Your local changes to the following files would be overwritten by ${operation}:\n${paths.map((path) => `\t${path}`).join('\n')}\nPlease commit your changes or stash them before you ${operation}.`,
  );

type PreservedTreeTransition =
  | { changes: TreeChange[]; index: TreeSnapshot; workingTree: TreeSnapshot }
  | { failure: CommandResult };

const preserveLocalChangesAcrossTransition = (
  state: GitState,
  fromTree: TreeSnapshot,
  toTree: TreeSnapshot,
  operation: string,
): PreservedTreeTransition => {
  if (state.operation) {
    return { failure: failure(state, 'OPERATION_IN_PROGRESS', 'fatal: You have not concluded your current operation.') };
  }
  const changes = diffTrees(fromTree, toTree);
  const overwritten = operationWouldOverwriteLocalChanges(state, new Set(changes.map((change) => change.path)));
  if (overwritten.length > 0) return { failure: localChangesOverwrittenFailure(state, overwritten, operation) };
  return {
    changes,
    index: applyChanges(state.index, changes),
    workingTree: applyChanges(state.workingTree, changes),
  };
};

const reachableHistory = (
  commits: Readonly<Record<CommitId, Commit>>,
  starts: readonly (CommitId | null)[],
): CommitId[] => {
  const reachable = new Set<CommitId>();
  for (const start of starts) for (const id of ancestorsOf(commits, start)) reachable.add(id);
  return [...reachable].sort((left, right) =>
    commits[right].timestamp - commits[left].timestamp || right.localeCompare(left));
};

const formatStatus = (state: GitState, short: boolean): TerminalOutputLine[] => {
  const statuses = headStatus(state);
  if (short) {
    return statuses.map((status) => {
      if (status.unstaged === 'untracked' && status.staged === null) return line(`?? ${status.path}`);
      const staged = status.conflicted ? 'U' : status.staged ? status.staged === 'deleted' ? 'D' : status.staged === 'added' ? 'A' : 'M' : ' ';
      const unstaged = status.conflicted ? 'U' : status.unstaged ? status.unstaged === 'deleted' ? 'D' : status.unstaged === 'untracked' ? '?' : 'M' : ' ';
      return line(`${staged}${unstaged} ${status.path}`, status.conflicted ? 'error' : 'default');
    });
  }
  const branch = currentBranchName(state);
  const output = [line(state.head.kind === 'detached' ? `HEAD detached at ${headCommitId(state)?.slice(0, 7)}` : `On branch ${branch}`)];
  if (state.operation) output.push(line(`You are currently ${state.operation.kind === 'merge' ? 'merging' : 'rebasing'}.`, 'warning'));
  if (statuses.length === 0) return [...output, line('nothing to commit, working tree clean', 'success')];
  for (const status of statuses) {
    if (status.conflicted) output.push(line(`both modified:   ${status.path}`, 'error'));
    else {
      if (status.staged) output.push(line(`changes to be committed: ${status.staged}: ${status.path}`, 'success'));
      if (status.unstaged) output.push(line(`${status.unstaged === 'untracked' ? 'untracked file' : 'changes not staged'}: ${status.unstaged}: ${status.path}`, 'warning'));
    }
  }
  return output;
};

const formatDiff = (changes: readonly TreeChange[]): TerminalOutputLine[] => changes.flatMap((change) => {
  const before = change.before?.content ?? '';
  const after = change.after?.content ?? '';
  return [
    line(`diff --git a/${change.path} b/${change.path}`, 'muted'),
    ...(before ? before.split('\n').filter(Boolean).map((text) => line(`-${text}`, 'error')) : []),
    ...(after ? after.split('\n').filter(Boolean).map((text) => line(`+${text}`, 'success')) : []),
  ];
});

const switchToBranch = (previous: GitState, branchName: string, commandText: string): CommandResult => {
  const branch = previous.branches[branchName];
  if (!branch) return failure(previous, 'UNKNOWN_BRANCH', `fatal: invalid reference: ${branchName}`);
  if (!treeEquals(previous.index, headTree(previous)) || !treeEquals(previous.workingTree, previous.index)) {
    return failure(previous, 'LOCAL_CHANGES_OVERWRITTEN', 'error: Your local changes would be overwritten by checkout.');
  }
  const next = cloneState(previous);
  const from = headCommitId(next);
  advanceSequence(next);
  next.head = branch.target === null ? { kind: 'unborn', branch: branchName } : { kind: 'symbolic', branch: branchName };
  next.index = branch.target ? cloneTree(next.commits[branch.target].tree) : EMPTY_TREE;
  next.workingTree = cloneTree(next.index);
  appendReflog(next, from, branch.target, commandText, `checkout: moving to ${branchName}`, 'HEAD');
  return success(previous, next, [line(`Switched to branch '${branchName}'`, 'success')], [
    { type: 'HEAD_MOVED', from, to: branch.target, detached: false },
    { type: 'INDEX_CHANGED', paths: Object.keys(next.index) },
    { type: 'WORKTREE_CHANGED', paths: Object.keys(next.workingTree) },
  ]);
};

const createBranch = (previous: GitState, name: string, switchAfter: boolean, commandText: string): CommandResult => {
  if (previous.branches[name]) return failure(previous, 'BRANCH_EXISTS', `fatal: a branch named '${name}' already exists`);
  const next = cloneState(previous);
  const target = headCommitId(next);
  next.branches[name] = { name, target };
  const effects: GitEffect[] = [{ type: 'BRANCH_CREATED', branch: name, target }];
  if (!switchAfter) return success(previous, next, [], effects);
  advanceSequence(next);
  const from = headCommitId(next);
  next.head = target === null ? { kind: 'unborn', branch: name } : { kind: 'symbolic', branch: name };
  appendReflog(next, from, target, commandText, `checkout: moving to ${name}`, 'HEAD');
  effects.push({ type: 'HEAD_MOVED', from, to: target, detached: false });
  return success(previous, next, [line(`Switched to a new branch '${name}'`, 'success')], effects);
};

const mergeCommand = (previous: GitState, targetName: string, commandText: string): CommandResult => {
  const currentBranch = currentBranchName(previous);
  if (!currentBranch) return failure(previous, 'DETACHED_MERGE', 'fatal: cannot merge while HEAD is detached in this simulator');
  if (previous.operation) return failure(previous, 'OPERATION_IN_PROGRESS', 'fatal: You have not concluded your current operation.');
  const oursId = headCommitId(previous);
  const theirsId = resolveCommitish(previous, targetName);
  if (theirsId === null) return failure(previous, 'UNKNOWN_REVISION', `merge: ${targetName} - not something we can merge`);
  if (oursId !== null && isAncestor(previous.commits, theirsId, oursId)) {
    return success(previous, cloneState(previous), [line('Already up to date.', 'success')]);
  }
  if (oursId === null || isAncestor(previous.commits, oursId, theirsId)) {
    const oursTree = oursId === null ? EMPTY_TREE : previous.commits[oursId].tree;
    const changes = diffTrees(oursTree, previous.commits[theirsId].tree);
    const overwritten = operationWouldOverwriteLocalChanges(previous, new Set(changes.map((change) => change.path)));
    if (overwritten.length > 0) return localChangesOverwrittenFailure(previous, overwritten, 'merge');
    const next = cloneState(previous);
    advanceSequence(next);
    const from = oursId;
    setHeadTarget(next, theirsId);
    next.index = applyChanges(previous.index, changes);
    next.workingTree = applyChanges(previous.workingTree, changes);
    appendReflog(next, from, theirsId, commandText, `merge ${targetName}: Fast-forward`);
    return success(previous, next, [line(`Updating ${from?.slice(0, 7) ?? 'unborn'}..${theirsId.slice(0, 7)}`), line('Fast-forward', 'success')], [
      { type: 'MERGE_FAST_FORWARD', branch: currentBranch, from, to: theirsId },
      { type: 'BRANCH_MOVED', branch: currentBranch, from, to: theirsId },
      { type: 'HEAD_MOVED', from, to: theirsId, detached: false },
      { type: 'INDEX_CHANGED', paths: Object.keys(next.index) },
      { type: 'WORKTREE_CHANGED', paths: Object.keys(next.workingTree) },
    ]);
  }
  const mergeBase = findMergeBase(previous.commits, oursId, theirsId);
  const baseTree = mergeBase ? previous.commits[mergeBase].tree : EMPTY_TREE;
  const merged = mergeTrees(baseTree, previous.commits[oursId].tree, previous.commits[theirsId].tree);
  const changes = diffTrees(previous.commits[oursId].tree, merged.tree);
  const conflictPaths = new Set(merged.conflicts.map((conflict) => conflict.path));
  const changedPaths = new Set([...changes.map((change) => change.path), ...conflictPaths]);
  const overwritten = operationWouldOverwriteLocalChanges(previous, changedPaths);
  if (overwritten.length > 0) return localChangesOverwrittenFailure(previous, overwritten, 'merge');
  const next = cloneState(previous);
  if (merged.conflicts.length > 0) {
    const nonConflictChanges = changes.filter((change) => !conflictPaths.has(change.path));
    next.index = applyChanges(previous.index, nonConflictChanges);
    next.workingTree = applyChanges(previous.workingTree, changes);
    next.operation = {
      kind: 'merge',
      sourceRef: targetName,
      sourceCommit: theirsId,
      mergeBase,
      conflicts: Object.fromEntries(merged.conflicts.map((conflict) => [conflict.path, {
        path: conflict.path,
        base: conflict.base?.content ?? null,
        ours: conflict.ours?.content ?? null,
        theirs: conflict.theirs?.content ?? null,
        resolved: false,
        staged: false,
      }])),
    };
    return success(previous, next, [line('Automatic merge failed; fix conflicts and then commit the result.', 'error')], [
      { type: 'CONFLICT_CREATED', paths: merged.conflicts.map((conflict) => conflict.path), operation: 'merge' },
      { type: 'WORKTREE_CHANGED', paths: merged.conflicts.map((conflict) => conflict.path) },
    ]);
  }
  next.index = applyChanges(previous.index, changes);
  next.workingTree = applyChanges(previous.workingTree, changes);
  const made = makeCommit(next, `Merge branch '${targetName}'`, [oursId, theirsId], next.index, commandText);
  return success(previous, next, [line(`Merge made by the 'ort' strategy as ${made.commit.id.slice(0, 7)}.`, 'success')], [
    { type: 'MERGE_COMMIT_CREATED', commitId: made.commit.id, parents: [oursId, theirsId] },
    ...made.effects.slice(1),
  ]);
};

const commitCommand = (previous: GitState, message: string, commandText: string): CommandResult => {
  if (previous.operation && Object.values(previous.operation.conflicts).some((conflict) => !conflict.resolved)) {
    return failure(previous, 'UNRESOLVED_CONFLICTS', 'error: Committing is not possible because you have unmerged files.');
  }
  if (previous.operation) {
    const conflictPaths = new Set(Object.keys(previous.operation.conflicts));
    const unstagedResolutions = diffTrees(previous.index, previous.workingTree)
      .map((change) => change.path)
      .filter((path) => conflictPaths.has(path));
    const explicitlyUnstaged = Object.values(previous.operation.conflicts)
      .filter((conflict) => !conflict.staged)
      .map((conflict) => conflict.path);
    const paths = [...new Set([...explicitlyUnstaged, ...unstagedResolutions])].sort();
    if (paths.length > 0) {
      return failure(
        previous,
        'CONFLICT_RESOLUTION_NOT_STAGED',
        `error: All conflicts must be staged before committing.\nUse 'git add' on: ${paths.join(', ')}`,
      );
    }
  }
  if (treeEquals(previous.index, headTree(previous)) && !previous.operation) {
    return failure(previous, 'NOTHING_TO_COMMIT', 'nothing to commit, working tree clean');
  }
  const next = cloneState(previous);
  const head = headCommitId(next);
  const merge = next.operation?.kind === 'merge' ? next.operation : null;
  const parents = merge ? [head, merge.sourceCommit].filter((id): id is string => id !== null) : head ? [head] : [];
  const made = makeCommit(next, message, parents, next.index, commandText);
  next.operation = null;
  const output = [line(`[${currentBranchName(next) ?? 'detached'} ${made.commit.id.slice(0, 7)}] ${message}`, 'success')];
  if (merge && parents.length === 2) {
    return success(previous, next, output, [
      { type: 'MERGE_COMMIT_CREATED', commitId: made.commit.id, parents: [parents[0], parents[1]] },
      ...made.effects.slice(1),
    ]);
  }
  return success(previous, next, output, made.effects);
};

const resetCommand = (previous: GitState, mode: 'soft' | 'mixed' | 'hard', targetValue: string, commandText: string): CommandResult => {
  const target = resolveCommitish(previous, targetValue);
  if (target === null) return failure(previous, 'UNKNOWN_REVISION', `fatal: ambiguous argument '${targetValue}': unknown revision`);
  const next = cloneState(previous);
  const from = headCommitId(next);
  const branch = currentBranchName(next);
  advanceSequence(next);
  setHeadTarget(next, target);
  const paths = [...new Set([...Object.keys(next.index), ...Object.keys(next.workingTree), ...Object.keys(next.commits[target].tree)])];
  if (mode !== 'soft') next.index = cloneTree(next.commits[target].tree);
  if (mode === 'hard') next.workingTree = cloneTree(next.commits[target].tree);
  if (mode === 'hard') next.operation = null;
  appendReflog(next, from, target, commandText, `reset: moving to ${targetValue}`);
  const effects: GitEffect[] = [{ type: 'RESET_PERFORMED', mode, from, to: target }];
  if (branch) effects.push({ type: 'BRANCH_MOVED', branch, from, to: target });
  effects.push({ type: 'HEAD_MOVED', from, to: target, detached: branch === null });
  if (mode !== 'soft') effects.push({ type: 'INDEX_CHANGED', paths });
  if (mode === 'hard') effects.push({ type: 'WORKTREE_CHANGED', paths });
  return success(previous, next, [line(`HEAD is now at ${target.slice(0, 7)} ${next.commits[target].message}`, 'success')], effects);
};

const applyCommitChange = (state: GitState, source: Commit): { tree: TreeSnapshot; conflicts: string[] } => {
  const base = source.parents[0] ? state.commits[source.parents[0]]?.tree ?? EMPTY_TREE : EMPTY_TREE;
  const ours = headTree(state);
  const merged = mergeTrees(base, ours, source.tree);
  return { tree: merged.tree, conflicts: merged.conflicts.map((conflict) => conflict.path) };
};

const revertCommand = (previous: GitState, targetValue: string, commandText: string): CommandResult => {
  const target = resolveCommitish(previous, targetValue);
  if (!target) return failure(previous, 'UNKNOWN_REVISION', `fatal: bad revision '${targetValue}'`);
  const source = previous.commits[target];
  if (source.parents.length > 1) return failure(previous, 'MERGE_REVERT_UNSUPPORTED', 'error: reverting merge commits is not supported by this simulator');
  const parentTree = source.parents[0] ? previous.commits[source.parents[0]].tree : EMPTY_TREE;
  const inverse = diffTrees(source.tree, parentTree);
  const currentTree = headTree(previous);
  const expectedBase = source.tree;
  const simulatedSource: Commit = { ...source, parents: [], tree: applyChanges(expectedBase, inverse) };
  const merged = mergeTrees(expectedBase, currentTree, simulatedSource.tree);
  if (merged.conflicts.length) return failure(previous, 'REVERT_CONFLICT', 'error: could not revert cleanly; conflict handling for revert is outside this lesson path');
  const transition = preserveLocalChangesAcrossTransition(previous, currentTree, merged.tree, 'revert');
  if ('failure' in transition) return transition.failure;
  const next = cloneState(previous);
  next.index = cloneTree(transition.index);
  next.workingTree = cloneTree(transition.workingTree);
  const head = headCommitId(next);
  const made = makeCommit(next, `Revert "${source.message}"`, head ? [head] : [], merged.tree, commandText);
  return success(previous, next, [line(`[${made.commit.id.slice(0, 7)}] Revert "${source.message}"`, 'success')], made.effects);
};

const cherryPickCommand = (previous: GitState, targetValue: string, commandText: string): CommandResult => {
  const target = resolveCommitish(previous, targetValue);
  if (!target) return failure(previous, 'UNKNOWN_REVISION', `fatal: bad revision '${targetValue}'`);
  const source = previous.commits[target];
  if (source.parents.length > 1) return failure(previous, 'MERGE_CHERRY_PICK_UNSUPPORTED', 'error: cherry-picking merge commits is not supported');
  const applied = applyCommitChange(previous, source);
  if (applied.conflicts.length) return failure(previous, 'CHERRY_PICK_CONFLICT', `error: cherry-pick would conflict in ${applied.conflicts.join(', ')}`);
  if (treeEquals(applied.tree, headTree(previous))) return failure(previous, 'EMPTY_CHERRY_PICK', 'The previous cherry-pick is now empty.');
  const transition = preserveLocalChangesAcrossTransition(previous, headTree(previous), applied.tree, 'cherry-pick');
  if ('failure' in transition) return transition.failure;
  const next = cloneState(previous);
  next.index = cloneTree(transition.index);
  next.workingTree = cloneTree(transition.workingTree);
  const head = headCommitId(next);
  const made = makeCommit(next, source.message, head ? [head] : [], applied.tree, commandText);
  return success(previous, next, [line(`[${made.commit.id.slice(0, 7)}] ${source.message}`, 'success')], [
    { type: 'CHERRY_PICK_CREATED', sourceCommitId: source.id, newCommitId: made.commit.id },
    ...made.effects.slice(1),
  ]);
};

const rebaseCommand = (previous: GitState, targetValue: string, interactive: boolean, commandText: string): CommandResult => {
  if (interactive) return failure(previous, 'INTERACTIVE_REBASE_UI_REQUIRED', 'Interactive rebase is completed through the lesson rebase editor.');
  const branch = currentBranchName(previous);
  if (!branch) return failure(previous, 'DETACHED_REBASE', 'fatal: cannot rebase a detached HEAD in this simulator');
  const originalHead = headCommitId(previous);
  const onto = resolveCommitish(previous, targetValue);
  if (!originalHead || !onto) return failure(previous, 'UNKNOWN_REVISION', `fatal: invalid upstream '${targetValue}'`);
  findMergeBase(previous.commits, originalHead, onto);
  if (isAncestor(previous.commits, originalHead, onto)) {
    const transition = preserveLocalChangesAcrossTransition(previous, previous.commits[originalHead].tree, previous.commits[onto].tree, 'rebase');
    if ('failure' in transition) return transition.failure;
    const next = cloneState(previous);
    advanceSequence(next);
    next.branches[branch].target = onto;
    next.head = { kind: 'symbolic', branch };
    next.index = cloneTree(transition.index);
    next.workingTree = cloneTree(transition.workingTree);
    appendReflog(next, originalHead, onto, commandText, `rebase finished: ${branch} fast-forwarded to ${targetValue}`);
    return success(previous, next, [line(`Successfully rebased and updated refs/heads/${branch}.`, 'success')], [
      { type: 'BRANCH_MOVED', branch, from: originalHead, to: onto },
      { type: 'HEAD_MOVED', from: originalHead, to: onto, detached: false },
      { type: 'INDEX_CHANGED', paths: Object.keys(next.index) },
      { type: 'WORKTREE_CHANGED', paths: Object.keys(next.workingTree) },
    ]);
  }
  const replayIds = uniqueCommitsSince(previous.commits, originalHead, onto);
  if (replayIds.length === 0) return success(previous, cloneState(previous), [line(`Current branch ${branch} is up to date.`, 'success')]);
  const next = cloneState(previous);
  let parent = onto;
  let tree = cloneTree(next.commits[onto].tree);
  const newIds: string[] = [];
  for (const oldId of replayIds) {
    const oldCommit = next.commits[oldId];
    const baseTree = oldCommit.parents[0] ? next.commits[oldCommit.parents[0]]?.tree ?? EMPTY_TREE : EMPTY_TREE;
    const merged = mergeTrees(baseTree, tree, oldCommit.tree);
    if (merged.conflicts.length) return failure(previous, 'REBASE_CONFLICT', `error: could not apply ${oldId.slice(0, 7)}; conflicts in ${merged.conflicts.map((item) => item.path).join(', ')}`);
    const sequence = advanceSequence(next);
    const newCommit: Commit = {
      ...oldCommit,
      id: commitIdFor(sequence),
      timestamp: sequence,
      parents: [parent],
      tree: cloneTree(merged.tree),
    };
    next.commits[newCommit.id] = newCommit;
    newIds.push(newCommit.id);
    parent = newCommit.id;
    tree = merged.tree;
  }
  const transition = preserveLocalChangesAcrossTransition(previous, previous.commits[originalHead].tree, tree, 'rebase');
  if ('failure' in transition) return transition.failure;
  next.branches[branch].target = parent;
  next.head = { kind: 'symbolic', branch };
  next.index = cloneTree(transition.index);
  next.workingTree = cloneTree(transition.workingTree);
  appendReflog(next, originalHead, parent, commandText, `rebase finished: ${branch} onto ${targetValue}`);
  return success(previous, next, [line(`Successfully rebased and updated refs/heads/${branch}.`, 'success')], [
    { type: 'COMMITS_REPLAYED', oldCommitIds: replayIds, newCommitIds: newIds, onto },
    { type: 'BRANCH_MOVED', branch, from: originalHead, to: parent },
    { type: 'HEAD_MOVED', from: originalHead, to: parent, detached: false },
  ]);
};

export type InteractiveRebaseAction =
  | { commitId: CommitId; action: 'pick' | 'drop' | 'squash'; message?: string }
  | { commitId: CommitId; action: 'reword'; message: string };

export const executeInteractiveRebase = (
  previous: GitState,
  baseValue: string,
  plan: readonly InteractiveRebaseAction[],
): CommandResult => {
  const branch = currentBranchName(previous);
  const originalHead = headCommitId(previous);
  const onto = resolveCommitish(previous, baseValue);
  if (!branch || !originalHead || !onto) return failure(previous, 'UNKNOWN_REVISION', `fatal: invalid interactive rebase base '${baseValue}'`);
  const unique = uniqueCommitsSince(previous.commits, originalHead, onto);
  if (plan.length !== unique.length || plan.some((item, index) => item.commitId !== unique[index])) {
    return failure(previous, 'INVALID_REBASE_PLAN', 'error: interactive rebase plan must cover each selected commit in replay order');
  }
  const groups: Array<{ ids: string[]; message: string }> = [];
  for (const item of plan) {
    const source = previous.commits[item.commitId];
    if (item.action === 'drop') continue;
    if (item.action === 'squash') {
      const prior = groups.at(-1);
      if (!prior) return failure(previous, 'INVALID_REBASE_PLAN', 'error: cannot squash the first selected commit');
      prior.ids.push(item.commitId);
      prior.message = item.message?.trim() || `${prior.message} + ${source.message}`;
      continue;
    }
    groups.push({ ids: [item.commitId], message: item.action === 'reword' ? item.message : source.message });
  }
  if (groups.length === 0) return failure(previous, 'INVALID_REBASE_PLAN', 'error: interactive rebase cannot drop every selected commit in this lesson');
  const next = cloneState(previous);
  let parent = onto;
  let currentTree = cloneTree(next.commits[onto].tree);
  const newIds: string[] = [];
  for (const group of groups) {
    for (const id of group.ids) {
      const source = next.commits[id];
      const sourceBase = source.parents[0] ? next.commits[source.parents[0]]?.tree ?? EMPTY_TREE : EMPTY_TREE;
      const merged = mergeTrees(sourceBase, currentTree, source.tree);
      if (merged.conflicts.length) return failure(previous, 'REBASE_CONFLICT', `error: could not apply ${id.slice(0, 7)}; conflicts in ${merged.conflicts.map((entry) => entry.path).join(', ')}`);
      currentTree = merged.tree;
    }
    const sequence = advanceSequence(next);
    const id = commitIdFor(sequence);
    next.commits[id] = {
      id,
      message: group.message,
      author: DEFAULT_AUTHOR,
      timestamp: sequence,
      parents: [parent],
      tree: cloneTree(currentTree),
    };
    newIds.push(id);
    parent = id;
  }
  const transition = preserveLocalChangesAcrossTransition(previous, previous.commits[originalHead].tree, currentTree, 'rebase');
  if ('failure' in transition) return transition.failure;
  next.branches[branch].target = parent;
  next.head = { kind: 'symbolic', branch };
  next.index = cloneTree(transition.index);
  next.workingTree = cloneTree(transition.workingTree);
  appendReflog(next, originalHead, parent, `git rebase -i ${baseValue}`, `rebase -i finished: ${branch} onto ${baseValue}`);
  return success(previous, next, [line(`Successfully rebased and updated refs/heads/${branch}.`, 'success')], [
    { type: 'COMMITS_REPLAYED', oldCommitIds: unique, newCommitIds: newIds, onto },
    { type: 'BRANCH_MOVED', branch, from: originalHead, to: parent },
    { type: 'HEAD_MOVED', from: originalHead, to: parent, detached: false },
  ]);
};

const stashCommand = (previous: GitState, command: Extract<ParsedCommand, { kind: 'stash' }>): CommandResult => {
  if (command.action === 'list') {
    return success(previous, cloneState(previous), previous.stashes.map((stash, index) => line(`stash@{${index}}: On ${currentBranchName(previous) ?? 'detached'}: ${stash.message}`)));
  }
  if (command.action === 'create') {
    if (treeEquals(previous.workingTree, headTree(previous)) && treeEquals(previous.index, headTree(previous))) {
      return success(previous, cloneState(previous), [line('No local changes to save', 'muted')]);
    }
    const next = cloneState(previous);
    const sequence = advanceSequence(next);
    const stashId = `s${String(sequence).padStart(6, '0')}`;
    next.stashes.unshift({
      id: stashId,
      message: command.message,
      base: headCommitId(next),
      index: cloneTree(next.index),
      workingTree: cloneTree(next.workingTree),
      createdAt: sequence,
    });
    next.index = cloneTree(headTree(next));
    next.workingTree = cloneTree(headTree(next));
    return success(previous, next, [line(`Saved working directory and index state ${command.message}`, 'success')], [
      { type: 'STASH_CREATED', stashId },
      { type: 'INDEX_CHANGED', paths: Object.keys(previous.index) },
      { type: 'WORKTREE_CHANGED', paths: Object.keys(previous.workingTree) },
    ]);
  }
  const stash = previous.stashes[0];
  if (!stash) return failure(previous, 'NO_STASH', 'No stash entries found.');
  if (!treeEquals(previous.index, headTree(previous)) || !treeEquals(previous.workingTree, previous.index)) {
    return failure(previous, 'STASH_POP_CONFLICT', 'error: Your local changes would be overwritten by stash pop.');
  }
  const next = cloneState(previous);
  next.index = cloneTree(stash.index);
  next.workingTree = cloneTree(stash.workingTree);
  next.stashes.shift();
  return success(previous, next, [line(`Dropped refs/stash@{0} (${stash.id})`, 'success')], [
    { type: 'STASH_APPLIED', stashId: stash.id },
    { type: 'INDEX_CHANGED', paths: Object.keys(stash.index) },
    { type: 'WORKTREE_CHANGED', paths: Object.keys(stash.workingTree) },
  ]);
};

const copyReachableCommits = (commits: Record<string, Commit>, tip: string | null): Record<string, Commit> => {
  const copy: Record<string, Commit> = {};
  for (const id of ancestorsOf(commits, tip)) copy[id] = structuredClone(commits[id]);
  return copy;
};

const fetchCommand = (previous: GitState, remoteName?: string): CommandResult => {
  const name = remoteName ?? 'origin';
  const remote = previous.remotes[name];
  if (!remote) return failure(previous, 'UNKNOWN_REMOTE', `fatal: '${name}' does not appear to be a git repository`);
  const next = cloneState(previous);
  const refs: string[] = [];
  for (const [branch, tip] of Object.entries(remote.branches)) {
    Object.assign(next.commits, remote.commits);
    next.remoteTrackingBranches[`${name}/${branch}`] = tip;
    refs.push(`${name}/${branch}`);
  }
  return success(previous, next, [line(`From ${remote.url}`), ...refs.map((ref) => line(` * [updated] ${ref}`))], [
    { type: 'REMOTE_UPDATED', remote: name, refs },
  ]);
};

const pushCommand = (previous: GitState, command: Extract<ParsedCommand, { kind: 'push' }>): CommandResult => {
  const current = currentBranchName(previous);
  const branchName = command.branch ?? current;
  const branch = branchName ? previous.branches[branchName] : undefined;
  const upstream = current ? previous.branches[current]?.upstream : undefined;
  const remoteName = command.remote ?? upstream?.remote;
  if (!branch || !branchName) return failure(previous, 'NO_CURRENT_BRANCH', 'fatal: You are not currently on a branch.');
  if (!remoteName) return failure(previous, 'NO_UPSTREAM', `fatal: The current branch ${branchName} has no upstream branch.`);
  const remote = previous.remotes[remoteName];
  if (!remote) return failure(previous, 'UNKNOWN_REMOTE', `fatal: '${remoteName}' does not appear to be a git repository`);
  const remoteTip = remote.branches[branchName] ?? null;
  if (remoteTip !== null && !isAncestor(previous.commits, remoteTip, branch.target)) {
    return failure(previous, 'NON_FAST_FORWARD', ' ! [rejected] non-fast-forward\nerror: failed to push some refs');
  }
  const next = cloneState(previous);
  next.remotes[remoteName].commits = {
    ...next.remotes[remoteName].commits,
    ...copyReachableCommits(next.commits, branch.target),
  };
  next.remotes[remoteName].branches[branchName] = branch.target;
  next.remoteTrackingBranches[`${remoteName}/${branchName}`] = branch.target;
  if (command.setUpstream && current) next.branches[current].upstream = { remote: remoteName, branch: branchName };
  return success(previous, next, [line(`To ${remote.url}`), line(`   ${remoteTip?.slice(0, 7) ?? 'new'}..${branch.target?.slice(0, 7) ?? 'unborn'}  ${branchName} -> ${branchName}`, 'success')], [
    { type: 'REMOTE_UPDATED', remote: remoteName, refs: [`${remoteName}/${branchName}`] },
  ]);
};

const executeParsed = (previous: GitState, command: ParsedCommand, commandText: string): CommandResult => {
  if (command.kind !== 'init') {
    const repositoryError = requireRepository(previous);
    if (repositoryError) return repositoryError;
  }
  switch (command.kind) {
    case 'init': {
      if (previous.initialized) return success(previous, cloneState(previous), [line('Reinitialized existing Git repository in /.git/', 'success')]);
      const next = cloneState(previous);
      next.initialized = true;
      next.branches.main = { name: 'main', target: null };
      next.head = { kind: 'unborn', branch: 'main' };
      return success(previous, next, [line('Initialized empty Git repository in /.git/', 'success')]);
    }
    case 'status':
      return success(previous, cloneState(previous), formatStatus(previous, command.short));
    case 'add': {
      const next = cloneState(previous);
      const available = new Set([...Object.keys(next.workingTree), ...Object.keys(next.index)]);
      const all = command.paths.some((path) => path === '.' || path === '-A');
      const paths = all ? [...available].sort() : [...new Set(command.paths)].sort();
      const missing = paths.filter((path) => !available.has(path));
      if (missing.length) return failure(previous, 'PATHSPEC_NOT_FOUND', `fatal: pathspec '${missing[0]}' did not match any files`);
      const index = { ...next.index };
      for (const path of paths) {
        const working = next.workingTree[path];
        if (working) index[path] = { ...working };
        else delete index[path];
        if (next.operation?.conflicts[path]) {
          const conflict = next.operation.conflicts[path];
          if (!conflict.resolved) return failure(previous, 'CONFLICT_NOT_EDITED', `error: resolve ${path} before staging it`);
          conflict.staged = true;
        }
      }
      next.index = cloneTree(index);
      const effects: GitEffect[] = [{ type: 'FILE_STAGED', paths }, { type: 'INDEX_CHANGED', paths }];
      if (next.operation) for (const path of paths) if (next.operation.conflicts[path]) effects.push({ type: 'CONFLICT_RESOLVED', path });
      return success(previous, next, [], effects);
    }
    case 'commit': return commitCommand(previous, command.message, commandText);
    case 'log': {
      const starts = command.all
        ? [
            ...Object.values(previous.branches).map((branch) => branch.target),
            ...Object.values(previous.tags).map((tag) => tag.target),
            ...Object.values(previous.remoteTrackingBranches),
            ...(previous.head.kind === 'detached' ? [previous.head.target] : []),
          ]
        : [headCommitId(previous)];
      const ids = reachableHistory(previous.commits, starts);
      const output = ids.flatMap((id) => {
        const commit = previous.commits[id];
        const text = command.oneline ? `${id.slice(0, 7)} ${commit.message}` : `commit ${id}\nAuthor: ${commit.author.name} <${commit.author.email}>\n\n    ${commit.message}`;
        if (!command.graph) return [line(text)];
        return commit.parents.length > 1
          ? [line(`*   ${text}`), line('|\\  ', 'muted')]
          : [line(`* ${text}`)];
      });
      return success(previous, cloneState(previous), output.length ? output : [line('fatal: your current branch does not have any commits yet', 'error')]);
    }
    case 'diff': {
      const base = command.staged ? headTree(previous) : previous.index;
      const target = command.staged ? previous.index : previous.workingTree;
      return success(previous, cloneState(previous), formatDiff(diffTrees(base, target)));
    }
    case 'branch': {
      if (command.action === 'list') {
        const current = currentBranchName(previous);
        return success(previous, cloneState(previous), Object.values(previous.branches).sort((a, b) => a.name.localeCompare(b.name)).map((branch) => line(`${branch.name === current ? '* ' : '  '}${branch.name}${branch.target ? ` ${branch.target.slice(0, 7)}` : ''}`)));
      }
      if (command.action === 'create') return createBranch(previous, command.name, false, commandText);
      if (currentBranchName(previous) === command.name) return failure(previous, 'DELETE_CURRENT_BRANCH', `error: Cannot delete branch '${command.name}' checked out`);
      if (!previous.branches[command.name]) return failure(previous, 'UNKNOWN_BRANCH', `error: branch '${command.name}' not found`);
      const next = cloneState(previous);
      delete next.branches[command.name];
      return success(previous, next, [line(`Deleted branch ${command.name}.`, 'success')], [{ type: 'BRANCH_DELETED', branch: command.name }]);
    }
    case 'switch':
      return command.create ? createBranch(previous, command.target, true, commandText) : switchToBranch(previous, command.target, commandText);
    case 'checkout': {
      if (command.create) return createBranch(previous, command.target, true, commandText);
      if (previous.branches[command.target]) return switchToBranch(previous, command.target, commandText);
      if (!treeEquals(previous.index, headTree(previous)) || !treeEquals(previous.workingTree, previous.index)) return failure(previous, 'LOCAL_CHANGES_OVERWRITTEN', 'error: Your local changes would be overwritten by checkout.');
      const target = resolveCommitish(previous, command.target);
      if (!target) return failure(previous, 'UNKNOWN_REVISION', `error: pathspec '${command.target}' did not match any file(s) known to git`);
      const next = cloneState(previous);
      const from = headCommitId(next);
      advanceSequence(next);
      next.head = { kind: 'detached', target };
      next.index = cloneTree(next.commits[target].tree);
      next.workingTree = cloneTree(next.index);
      appendReflog(next, from, target, commandText, `checkout: moving to ${command.target}`, 'HEAD');
      return success(previous, next, [line(`HEAD is now at ${target.slice(0, 7)} ${next.commits[target].message}`, 'warning')], [{ type: 'HEAD_MOVED', from, to: target, detached: true }]);
    }
    case 'merge': return mergeCommand(previous, command.target, commandText);
    case 'reset': return resetCommand(previous, command.mode, command.target, commandText);
    case 'revert': return revertCommand(previous, command.target, commandText);
    case 'stash': return stashCommand(previous, command);
    case 'tag': {
      if (command.action === 'list') return success(previous, cloneState(previous), Object.keys(previous.tags).sort().map((tag) => line(tag)));
      if (previous.tags[command.name]) return failure(previous, 'TAG_EXISTS', `fatal: tag '${command.name}' already exists`);
      const target = resolveCommitish(previous, command.target ?? 'HEAD');
      if (!target) return failure(previous, 'UNKNOWN_REVISION', `fatal: Failed to resolve '${command.target ?? 'HEAD'}' as a valid ref.`);
      const next = cloneState(previous);
      next.tags[command.name] = { name: command.name, target };
      return success(previous, next, [], [{ type: 'TAG_CREATED', tag: command.name, target }]);
    }
    case 'cherry-pick': return cherryPickCommand(previous, command.target, commandText);
    case 'rebase': return rebaseCommand(previous, command.target, command.interactive, commandText);
    case 'reflog':
      return success(previous, cloneState(previous), previous.reflog.map((entry, index) => line(`${entry.newTarget?.slice(0, 7) ?? '0000000'} HEAD@{${index}}: ${entry.message}`)));
    case 'remote': {
      if (command.action === 'list') return success(previous, cloneState(previous), Object.values(previous.remotes).flatMap((remote) => [line(`${remote.name}\t${remote.url} (fetch)`), line(`${remote.name}\t${remote.url} (push)`) ]));
      if (previous.remotes[command.name]) return failure(previous, 'REMOTE_EXISTS', `error: remote ${command.name} already exists.`);
      const next = cloneState(previous);
      next.remotes[command.name] = { name: command.name, url: command.url, branches: {}, commits: {} };
      return success(previous, next);
    }
    case 'fetch': return fetchCommand(previous, command.remote);
    case 'push': return pushCommand(previous, command);
    case 'pull': {
      const current = currentBranchName(previous);
      const upstream = current ? previous.branches[current]?.upstream : undefined;
      if (!upstream) return failure(previous, 'NO_UPSTREAM', 'There is no tracking information for the current branch.');
      const fetched = fetchCommand(previous, upstream.remote);
      if (!fetched.success) return fetched;
      const merged = mergeCommand(fetched.nextState, `${upstream.remote}/${upstream.branch}`, commandText);
      return {
        ...merged,
        previousState: previous,
        output: [...fetched.output, ...merged.output],
        effects: [...fetched.effects, ...merged.effects],
      };
    }
  }
};

export const executeCommand = (state: GitState, input: string): CommandResult => {
  const parsed = parseCommand(input);
  if (!parsed.success) return failure(state, 'UNSUPPORTED_SYNTAX', parsed.message);
  return executeParsed(state, parsed.command, input.trim());
};

export { resolveCommitish };
