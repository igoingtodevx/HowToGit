import type { Commit, CommitId, GitState } from './types';

export const ancestorsOf = (commits: Readonly<Record<CommitId, Commit>>, start: CommitId | null): Set<CommitId> => {
  const visited = new Set<CommitId>();
  const pending = start === null ? [] : [start];
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || visited.has(id)) continue;
    const commit = commits[id];
    if (!commit) continue;
    visited.add(id);
    pending.push(...commit.parents);
  }
  return visited;
};

export const isAncestor = (
  commits: Readonly<Record<CommitId, Commit>>,
  possibleAncestor: CommitId | null,
  descendant: CommitId | null,
): boolean => possibleAncestor === null || ancestorsOf(commits, descendant).has(possibleAncestor);

const ancestorDistances = (commits: Readonly<Record<CommitId, Commit>>, start: CommitId): Map<CommitId, number> => {
  const distances = new Map<CommitId, number>();
  const queue: Array<[CommitId, number]> = [[start, 0]];
  for (let index = 0; index < queue.length; index += 1) {
    const [id, distance] = queue[index];
    if ((distances.get(id) ?? Number.POSITIVE_INFINITY) <= distance) continue;
    distances.set(id, distance);
    for (const parent of commits[id]?.parents ?? []) queue.push([parent, distance + 1]);
  }
  return distances;
};

export const findMergeBase = (
  commits: Readonly<Record<CommitId, Commit>>,
  left: CommitId | null,
  right: CommitId | null,
): CommitId | null => {
  if (left === null || right === null) return null;
  const leftDistances = ancestorDistances(commits, left);
  const rightDistances = ancestorDistances(commits, right);
  const candidates = [...leftDistances.keys()].filter((id) => rightDistances.has(id));
  candidates.sort((a, b) => {
    const scoreA = (leftDistances.get(a) ?? 0) + (rightDistances.get(a) ?? 0);
    const scoreB = (leftDistances.get(b) ?? 0) + (rightDistances.get(b) ?? 0);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return commits[b].timestamp - commits[a].timestamp || a.localeCompare(b);
  });
  return candidates[0] ?? null;
};

export const firstParentHistory = (
  commits: Readonly<Record<CommitId, Commit>>,
  start: CommitId | null,
): CommitId[] => {
  const result: CommitId[] = [];
  let current = start;
  while (current !== null && commits[current]) {
    result.push(current);
    current = commits[current].parents[0] ?? null;
  }
  return result;
};

export const uniqueCommitsSince = (
  commits: Readonly<Record<CommitId, Commit>>,
  tip: CommitId,
  excludedTip: CommitId | null,
): CommitId[] => {
  const excluded = ancestorsOf(commits, excludedTip);
  const unique = ancestorsOf(commits, tip);
  const ordered = [...unique]
    .filter((id) => !excluded.has(id))
    .sort((a, b) => commits[a].timestamp - commits[b].timestamp || a.localeCompare(b));
  return ordered;
};

export const reachableCommitIds = (state: GitState, includeRemoteTracking = false): Set<CommitId> => {
  const result = new Set<CommitId>();
  const starts = Object.values(state.branches).map((branch) => branch.target);
  if (state.head.kind === 'detached') starts.push(state.head.target);
  for (const tag of Object.values(state.tags)) starts.push(tag.target);
  if (includeRemoteTracking) starts.push(...Object.values(state.remoteTrackingBranches));
  for (const start of starts) for (const id of ancestorsOf(state.commits, start)) result.add(id);
  return result;
};
