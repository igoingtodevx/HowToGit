import type { BranchName, CommitId, GitState, TreeSnapshot } from './types';
import { cloneTree, fileWithContent } from './tree';

export const EMPTY_TREE: TreeSnapshot = Object.freeze({});

export const createGitState = (workingTree: TreeSnapshot = EMPTY_TREE): GitState => ({
  initialized: false,
  commits: {},
  branches: {},
  tags: {},
  head: { kind: 'unborn', branch: 'main' },
  index: EMPTY_TREE,
  workingTree: cloneTree(workingTree),
  stashes: [],
  reflog: [],
  remotes: {},
  remoteTrackingBranches: {},
  operation: null,
  sequence: 0,
});

export const createInitializedState = (workingTree: TreeSnapshot = EMPTY_TREE): GitState => ({
  ...createGitState(workingTree),
  initialized: true,
  branches: { main: { name: 'main', target: null } },
});

export const cloneState = (state: GitState): GitState => structuredClone(state);

export const currentBranchName = (state: GitState): BranchName | null =>
  state.head.kind === 'symbolic' || state.head.kind === 'unborn' ? state.head.branch : null;

export const headCommitId = (state: GitState): CommitId | null => {
  if (state.head.kind === 'detached') return state.head.target;
  return state.branches[state.head.branch]?.target ?? null;
};

export const headTree = (state: GitState): TreeSnapshot => {
  const id = headCommitId(state);
  return id === null ? EMPTY_TREE : state.commits[id]?.tree ?? EMPTY_TREE;
};

export const writeWorkingFile = (state: GitState, path: string, content: string, executable = false): GitState => {
  const next = cloneState(state);
  next.workingTree = cloneTree({ ...next.workingTree, [path]: fileWithContent(path, content, executable) });
  if (next.operation) {
    const conflict = next.operation.conflicts[path];
    if (conflict) {
      conflict.resolved = true;
      conflict.staged = false;
      conflict.resolvedContent = content;
    }
  }
  return next;
};

export const removeWorkingFile = (state: GitState, path: string): GitState => {
  const next = cloneState(state);
  const working = { ...next.workingTree };
  delete working[path];
  next.workingTree = cloneTree(working);
  return next;
};

export const resolveConflict = (state: GitState, path: string, content: string): GitState => {
  if (!state.operation?.conflicts[path]) return state;
  return writeWorkingFile(state, path, content);
};

export const validateState = (state: GitState): string[] => {
  const problems: string[] = [];
  for (const branch of Object.values(state.branches)) {
    if (branch.target !== null && !state.commits[branch.target]) problems.push(`Branch ${branch.name} points to missing ${branch.target}`);
  }
  for (const tag of Object.values(state.tags)) {
    if (!state.commits[tag.target]) problems.push(`Tag ${tag.name} points to missing ${tag.target}`);
  }
  if ((state.head.kind === 'symbolic' || state.head.kind === 'unborn') && !state.branches[state.head.branch]) {
    problems.push(`HEAD points to missing branch ${state.head.branch}`);
  }
  if (state.head.kind === 'detached' && !state.commits[state.head.target]) problems.push(`HEAD points to missing ${state.head.target}`);
  for (const commit of Object.values(state.commits)) {
    for (const parent of commit.parents) if (!state.commits[parent]) problems.push(`Commit ${commit.id} has missing parent ${parent}`);
  }
  if (state.operation) {
    for (const [path, conflict] of Object.entries(state.operation.conflicts)) {
      if (path !== conflict.path) problems.push(`Conflict key mismatch for ${path}`);
    }
  }
  return problems;
};
