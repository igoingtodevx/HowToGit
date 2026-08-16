import { ancestorsOf, reachableCommitIds, uniqueCommitsSince } from '../../engine/graphAlgorithms';
import { currentBranchName, headCommitId, headTree } from '../../engine/state';
import { statusBetween } from '../../engine/tree';
import type { CommitId, GitState } from '../../engine/types';

export const selectStatuses = (state: GitState) => statusBetween(
  headTree(state),
  state.index,
  state.workingTree,
  new Set(state.operation ? Object.keys(state.operation.conflicts) : []),
);

export interface AheadBehind { branch: string; remote: string; ahead: number; behind: number }

/** Ahead/behind counts for the current branch vs. its remote-tracking ref. */
export const selectAheadBehind = (state: GitState): AheadBehind | null => {
  const branch = currentBranchName(state);
  if (!branch) return null;
  const upstream = state.branches[branch]?.upstream;
  if (!upstream) return null;
  const tracking = `${upstream.remote}/${upstream.branch}`;
  const remoteTip = state.remoteTrackingBranches[tracking] ?? null;
  const tip = state.branches[branch]?.target ?? null;
  if (remoteTip === null || tip === null) return null;
  const ahead = uniqueCommitsSince(state.commits, tip, remoteTip).length;
  const behind = uniqueCommitsSince(state.commits, remoteTip, tip).length;
  if (ahead === 0 && behind === 0) return null;
  return { branch, remote: tracking, ahead, behind };
};

export interface GraphNodeLayout {
  id: CommitId;
  x: number;
  y: number;
  lane: number;
  refs: string[];
  head: boolean;
}

export interface GraphEdgeLayout {
  from: CommitId;
  to: CommitId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GraphLayout {
  nodes: GraphNodeLayout[];
  edges: GraphEdgeLayout[];
  width: number;
  height: number;
}

export const layoutGraph = (state: GitState, includeUnreachable = false): GraphLayout => {
  const visible = includeUnreachable ? new Set(Object.keys(state.commits)) : reachableCommitIds(state, true);
  const ordered = [...visible].sort((left, right) => state.commits[right].timestamp - state.commits[left].timestamp || right.localeCompare(left));
  const branchNames = Object.keys(state.branches).sort((left, right) => {
    if (left === 'main') return -1;
    if (right === 'main') return 1;
    return left.localeCompare(right);
  });
  const laneByCommit = new Map<string, number>();
  branchNames.forEach((name, lane) => {
    const tip = state.branches[name].target;
    for (const id of ancestorsOf(state.commits, tip)) if (!laneByCommit.has(id)) laneByCommit.set(id, lane);
  });
  const head = headCommitId(state);
  const refsFor = (id: string) => [
    ...Object.values(state.branches).filter((branch) => branch.target === id).map((branch) => branch.name),
    ...Object.values(state.tags).filter((tag) => tag.target === id).map((tag) => `tag:${tag.name}`),
    ...Object.entries(state.remoteTrackingBranches).filter(([, target]) => target === id).map(([name]) => name),
  ];
  const nodes = ordered.map((id, row) => {
    const lane = laneByCommit.get(id) ?? branchNames.length;
    return { id, lane, x: 36 + lane * 72, y: 36 + row * 72, refs: refsFor(id), head: id === head };
  });
  const position = new Map(nodes.map((node) => [node.id, node]));
  const edges = nodes.flatMap((node) => state.commits[node.id].parents.flatMap((parent) => {
    const target = position.get(parent);
    return target ? [{ from: node.id, to: parent, x1: node.x, y1: node.y, x2: target.x, y2: target.y }] : [];
  }));
  return {
    nodes,
    edges,
    width: Math.max(300, 100 + (Math.max(0, ...nodes.map((node) => node.lane)) + 1) * 72),
    height: Math.max(180, 80 + nodes.length * 72),
  };
};

export const graphSummary = (state: GitState): string => {
  const branch = currentBranchName(state);
  const head = headCommitId(state);
  if (!state.initialized) return 'No Git repository yet.';
  if (!head) return `HEAD follows ${branch ?? 'no branch'}; no commits yet.`;
  if (state.head.kind === 'detached') return `HEAD is detached at ${head.slice(0, 7)}.`;
  const refs = Object.values(state.branches).filter((item) => item.target === head).map((item) => item.name).join(', ');
  return `HEAD follows ${branch} at ${head.slice(0, 7)}. Commit labels here: ${refs || 'none'}.`;
};
