export type CommitId = string;
export type BranchName = string;
export type TagName = string;
export type FilePath = string;
export type RemoteName = string;

export interface Author { name: string; email: string; }
export interface VirtualFile { path: FilePath; content: string; executable: boolean; }
export type TreeSnapshot = Readonly<Record<FilePath, VirtualFile>>;

export interface Commit {
  id: CommitId;
  message: string;
  author: Author;
  timestamp: number;
  parents: CommitId[];
  tree: TreeSnapshot;
}

export interface Branch {
  name: BranchName;
  target: CommitId | null;
  upstream?: { remote: RemoteName; branch: BranchName };
}

export interface Tag { name: TagName; target: CommitId; }

export type HeadState =
  | { kind: 'symbolic'; branch: BranchName }
  | { kind: 'detached'; target: CommitId }
  | { kind: 'unborn'; branch: BranchName };

export interface ConflictEntry {
  path: FilePath;
  base: string | null;
  ours: string | null;
  theirs: string | null;
  resolved: boolean;
  staged: boolean;
  resolvedContent?: string;
}

export interface MergeState {
  kind: 'merge';
  sourceRef: string;
  sourceCommit: CommitId;
  mergeBase: CommitId | null;
  conflicts: Record<FilePath, ConflictEntry>;
}

export interface RebaseState {
  kind: 'rebase';
  onto: CommitId;
  originalHead: CommitId;
  remaining: CommitId[];
  replayed: CommitId[];
  conflicts: Record<FilePath, ConflictEntry>;
}

export type OperationState = MergeState | RebaseState | null;

export interface StashEntry {
  id: string;
  message: string;
  base: CommitId | null;
  index: TreeSnapshot;
  workingTree: TreeSnapshot;
  createdAt: number;
}

export interface ReflogEntry {
  sequence: number;
  oldTarget: CommitId | null;
  newTarget: CommitId | null;
  ref: string;
  command: string;
  message: string;
  timestamp: number;
}

export interface Remote {
  name: RemoteName;
  url: string;
  branches: Record<BranchName, CommitId | null>;
  commits: Record<CommitId, Commit>;
}

export interface GitState {
  initialized: boolean;
  commits: Record<CommitId, Commit>;
  branches: Record<BranchName, Branch>;
  tags: Record<TagName, Tag>;
  head: HeadState;
  index: TreeSnapshot;
  workingTree: TreeSnapshot;
  stashes: StashEntry[];
  reflog: ReflogEntry[];
  remotes: Record<RemoteName, Remote>;
  remoteTrackingBranches: Record<string, CommitId | null>;
  operation: OperationState;
  sequence: number;
}

export type FileChangeKind = 'added' | 'modified' | 'deleted' | 'untracked' | 'conflicted';
export interface FileStatus {
  path: FilePath;
  staged: FileChangeKind | null;
  unstaged: FileChangeKind | null;
  conflicted: boolean;
}

export type TerminalTone = 'default' | 'success' | 'error' | 'warning' | 'muted' | 'accent';
export interface TerminalOutputLine { text: string; tone: TerminalTone; }
export type ResetMode = 'soft' | 'mixed' | 'hard';
export type RiskLevel = 'safe' | 'caution' | 'destructive';

export type GitEffect =
  | { type: 'REPOSITORY_INITIALIZED' }
  | { type: 'FILE_STAGED'; paths: FilePath[] }
  | { type: 'COMMIT_CREATED'; commitId: CommitId; parentIds: CommitId[] }
  | { type: 'BRANCH_CREATED'; branch: BranchName; target: CommitId | null }
  | { type: 'BRANCH_DELETED'; branch: BranchName }
  | { type: 'BRANCH_MOVED'; branch: BranchName; from: CommitId | null; to: CommitId | null }
  | { type: 'HEAD_MOVED'; from: CommitId | null; to: CommitId | null; detached: boolean }
  | { type: 'MERGE_FAST_FORWARD'; branch: BranchName; from: CommitId | null; to: CommitId }
  | { type: 'MERGE_COMMIT_CREATED'; commitId: CommitId; parents: [CommitId, CommitId] }
  | { type: 'CONFLICT_CREATED'; paths: FilePath[]; operation: 'merge' | 'rebase' | 'cherry-pick' | 'stash-pop' }
  | { type: 'CONFLICT_RESOLVED'; path: FilePath }
  | { type: 'RESET_PERFORMED'; mode: ResetMode; from: CommitId | null; to: CommitId | null }
  | { type: 'STASH_CREATED'; stashId: string }
  | { type: 'STASH_APPLIED'; stashId: string }
  | { type: 'CHERRY_PICK_CREATED'; sourceCommitId: CommitId; newCommitId: CommitId }
  | { type: 'COMMITS_REPLAYED'; oldCommitIds: CommitId[]; newCommitIds: CommitId[]; onto: CommitId }
  | { type: 'TAG_CREATED'; tag: TagName; target: CommitId }
  | { type: 'REMOTE_UPDATED'; remote: RemoteName; refs: string[] }
  | { type: 'INDEX_CHANGED'; paths: FilePath[] }
  | { type: 'WORKTREE_CHANGED'; paths: FilePath[] };

export interface CommandResult {
  success: boolean;
  output: TerminalOutputLine[];
  previousState: GitState;
  nextState: GitState;
  effects: GitEffect[];
  errorCode?: string;
}

export interface CommandPreview {
  command: string;
  risk: RiskLevel;
  result: CommandResult;
  summaryKey: string;
}

export interface CommandHistoryEntry {
  input: string;
  success: boolean;
  errorCode?: string;
  timestamp: number;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  /** Number of successful completions. */
  attempts: number;
  /** Hints revealed during the best (lowest-hint) completion. */
  hintsUsed: number;
  /** Completed at least once without revealing any hint. */
  perfect: boolean;
}

export type Locale = 'en' | 'de';
export type LearningMode = 'noob' | 'pro';
