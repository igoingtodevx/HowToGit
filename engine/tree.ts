import type { FilePath, FileStatus, TreeSnapshot, VirtualFile } from './types';

export interface TreeChange {
  path: FilePath;
  before: VirtualFile | null;
  after: VirtualFile | null;
}

export interface TreeConflict {
  path: FilePath;
  base: VirtualFile | null;
  ours: VirtualFile | null;
  theirs: VirtualFile | null;
}

export interface ThreeWayMergeResult {
  tree: TreeSnapshot;
  conflicts: TreeConflict[];
}

const sameFile = (left: VirtualFile | undefined, right: VirtualFile | undefined): boolean =>
  left === right ||
  (left !== undefined && right !== undefined && left.content === right.content && left.executable === right.executable);

export const cloneTree = (tree: TreeSnapshot): TreeSnapshot =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(tree).map(([path, value]) => [path, Object.freeze({ ...value })]),
    ),
  );

export const treeEquals = (left: TreeSnapshot, right: TreeSnapshot): boolean => {
  const paths = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...paths].every((path) => sameFile(left[path], right[path]));
};

export const diffTrees = (before: TreeSnapshot, after: TreeSnapshot): TreeChange[] => {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return paths.flatMap((path) => {
    if (sameFile(before[path], after[path])) return [];
    return [{ path, before: before[path] ?? null, after: after[path] ?? null }];
  });
};

export const applyChanges = (base: TreeSnapshot, changes: readonly TreeChange[]): TreeSnapshot => {
  const next: Record<FilePath, VirtualFile> = { ...base };
  for (const change of changes) {
    if (change.after === null) delete next[change.path];
    else next[change.path] = { ...change.after };
  }
  return cloneTree(next);
};

export const selectPaths = (tree: TreeSnapshot, paths: readonly string[]): string[] => {
  if (paths.some((path) => path === '.' || path === '-A')) return Object.keys(tree).sort();
  return [...new Set(paths)].sort();
};

export const statusBetween = (
  headTree: TreeSnapshot,
  index: TreeSnapshot,
  workingTree: TreeSnapshot,
  conflictedPaths: ReadonlySet<string> = new Set(),
): FileStatus[] => {
  const paths = [...new Set([...Object.keys(headTree), ...Object.keys(index), ...Object.keys(workingTree), ...conflictedPaths])].sort();
  return paths.flatMap((path) => {
    const head = headTree[path];
    const staged = index[path];
    const working = workingTree[path];
    const conflict = conflictedPaths.has(path);

    const stagedKind: FileStatus['staged'] = conflict
      ? 'conflicted'
      : sameFile(head, staged)
        ? null
        : head === undefined
          ? 'added'
          : staged === undefined
            ? 'deleted'
            : 'modified';
    const unstagedKind: FileStatus['unstaged'] = conflict
      ? 'conflicted'
      : sameFile(staged, working)
        ? null
        : staged === undefined && working !== undefined
          ? head === undefined ? 'untracked' : 'added'
          : working === undefined
            ? 'deleted'
            : 'modified';

    if (stagedKind === null && unstagedKind === null && !conflict) return [];
    return [{ path, staged: stagedKind, unstaged: unstagedKind, conflicted: conflict }];
  });
};

export const fileWithContent = (path: string, content: string, executable = false): VirtualFile => ({
  path,
  content,
  executable,
});

export const sameVirtualFile = sameFile;

export const mergeTrees = (base: TreeSnapshot, ours: TreeSnapshot, theirs: TreeSnapshot): ThreeWayMergeResult => {
  const paths = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
  const merged: Record<FilePath, VirtualFile> = {};
  const conflicts: TreeConflict[] = [];
  for (const path of paths) {
    const baseFile = base[path];
    const ourFile = ours[path];
    const theirFile = theirs[path];
    if (sameFile(ourFile, theirFile)) {
      if (ourFile) merged[path] = { ...ourFile };
    } else if (sameFile(ourFile, baseFile)) {
      if (theirFile) merged[path] = { ...theirFile };
    } else if (sameFile(theirFile, baseFile)) {
      if (ourFile) merged[path] = { ...ourFile };
    } else {
      conflicts.push({ path, base: baseFile ?? null, ours: ourFile ?? null, theirs: theirFile ?? null });
      if (ourFile) merged[path] = { ...ourFile };
    }
  }
  return { tree: cloneTree(merged), conflicts };
};
