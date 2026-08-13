import type { Author, GitState, TreeSnapshot, VirtualFile } from './types';

export const TEST_AUTHOR: Author = { name: 'Ada Developer', email: 'ada@example.test' };
export const file = (path: string, content: string): VirtualFile => ({ path, content, executable: false });
export const tree = (...files: VirtualFile[]): TreeSnapshot => Object.freeze(Object.fromEntries(files.map((f) => [f.path, f])));
export const EMPTY_TREE: TreeSnapshot = Object.freeze({});

export const createInitializedEmptyState = (): GitState => ({
  initialized: true,
  commits: {},
  branches: { main: { name: 'main', target: null } },
  tags: {},
  head: { kind: 'unborn', branch: 'main' },
  index: EMPTY_TREE,
  workingTree: EMPTY_TREE,
  stashes: [],
  reflog: [],
  remotes: {},
  remoteTrackingBranches: {},
  operation: null,
  sequence: 0,
});

export const deterministicCommitId = (sequence: number): string => `c${String(sequence).padStart(6, '0')}`;
