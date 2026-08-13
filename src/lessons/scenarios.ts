import { cloneTree, createGitState, fileWithContent, validateState } from '../../engine';
import type { Commit, GitState, TreeSnapshot } from '../../engine';
import type { ExecutableLessonId, LessonId, ScenarioId } from './types';

const author = { name: 'GitFlow Academy', email: 'lessons@gitflow.local' };
const tree = (files: Record<string, string>): TreeSnapshot => cloneTree(Object.fromEntries(
  Object.entries(files).map(([path, content]) => [path, fileWithContent(path, content)]),
));

const commit = (id: string, message: string, parents: string[], files: Record<string, string>, timestamp: number): Commit => ({
  id, message, parents, author, timestamp, tree: tree(files),
});

const repository = (commits: Commit[], main: string, branch = 'main'): GitState => {
  const tip = commits.find((item) => item.id === main);
  if (!tip) throw new Error(`Missing scenario tip ${main}`);
  return {
    ...createGitState(tip.tree), initialized: true,
    commits: Object.fromEntries(commits.map((item) => [item.id, item])),
    branches: { [branch]: { name: branch, target: main } },
    head: { kind: 'symbolic', branch }, index: cloneTree(tip.tree), workingTree: cloneTree(tip.tree), sequence: commits.length,
  };
};

const linear = (prefix = 'base'): Commit[] => {
  const a = commit(`${prefix}-a`, 'Initial snapshot', [], { 'README.md': '# Demo\n', 'app.ts': 'export const value = 0;\n' }, 1);
  const b = commit(`${prefix}-b`, 'Add application', [a.id], { 'README.md': '# Demo\n', 'app.ts': 'export const value = 1;\n' }, 2);
  const c = commit(`${prefix}-c`, 'Refine application', [b.id], { 'README.md': '# Demo\n', 'app.ts': 'export const value = 2;\n' }, 3);
  return [a, b, c];
};

const factories: Record<ExecutableLessonId, () => GitState> = {
  b01: () => ({ ...createGitState(tree({ 'README.md': '# My project\n' })), branches: { main: { name: 'main', target: null } } }),
  b02: () => ({ ...createGitState(tree({ 'app.ts': '' })), initialized: true, branches: { main: { name: 'main', target: null } } }),
  b03: () => { const commits = linear('history'); return repository(commits, 'history-c'); },
  b04: () => { const [base] = linear('branch'); return repository([base], base.id); },
  b05: () => {
    const commits = linear('feature').slice(0, 2); const state = repository(commits, 'feature-b');
    state.branches.feature = { name: 'feature', target: 'feature-b' }; state.head = { kind: 'symbolic', branch: 'feature' }; return state;
  },
  b06: () => {
    const commits = linear('ff'); const state = repository(commits, 'ff-b');
    state.branches.feature = { name: 'feature', target: 'ff-c' }; return state;
  },
  b07: () => conflictScenario(false),
  b08: () => { const commits = linear('undo'); return repository(commits, 'undo-c'); },
  b09: () => {
    const commits = linear('stash').slice(0, 2); const state = repository(commits, 'stash-b');
    state.workingTree = tree({ ...contents(state.index), 'app.ts': 'export const value = 9;\n', 'notes.txt': 'WIP\n' }); return state;
  },
  b10: () => remoteScenario(false),
  a01: () => {
    const base = commit('rebase-base', 'Stable base', [], { 'app.ts': 'base\n' }, 1);
    const w1 = commit('rebase-w1', 'WIP one', [base.id], { 'app.ts': 'base\n', 'feature.ts': 'one\n' }, 2);
    const w2 = commit('rebase-w2', 'WIP two', [w1.id], { 'app.ts': 'base\n', 'feature.ts': 'two\n' }, 3);
    const w3 = commit('rebase-w3', 'WIP polish', [w2.id], { 'app.ts': 'base\n', 'feature.ts': 'three\n' }, 4);
    const state = repository([base, w1, w2, w3], w3.id, 'feature'); state.branches.main = { name: 'main', target: base.id }; return state;
  },
  a02: () => {
    const [base, main] = linear('pick'); const hotfix = commit('source-hotfix', 'Critical hotfix', [base.id], { ...contents(base.tree), 'hotfix.ts': 'fixed\n' }, 3);
    const state = repository([base, main, hotfix], main.id); state.branches.hotfix = { name: 'hotfix', target: hotfix.id }; return state;
  },
  a03: () => {
    const [base] = linear('multi-stash'); const state = repository([base], base.id);
    state.workingTree = tree({ ...contents(base.tree), 'login.ts': 'work in progress\n' }); return state;
  },
  a04: () => {
    const commits = linear('lost'); const state = repository(commits, 'lost-a');
    state.reflog = [{ sequence: 4, oldTarget: 'lost-c', newTarget: 'lost-a', ref: 'refs/heads/main', command: 'git reset --hard lost-a', message: 'reset: moving to lost-a', timestamp: 4 }];
    state.sequence = 4; return state;
  },
  a05: () => {
    const commits = linear('detached'); return repository(commits, 'detached-c');
  },
  a06: () => conflictScenario(true),
  a07: () => remoteScenario(true),
};

function contents(snapshot: TreeSnapshot): Record<string, string> {
  return Object.fromEntries(Object.entries(snapshot).map(([path, file]) => [path, file.content]));
}

function conflictScenario(complex: boolean): GitState {
  const base = commit(`${complex ? 'complex' : 'conflict'}-base`, 'Shared base', [], { 'app.ts': 'color=blue\n', 'README.md': '# App\n' }, 1);
  const main = commit(`${complex ? 'complex' : 'conflict'}-main`, 'Main change', [base.id], { 'app.ts': 'color=green\n', 'README.md': complex ? '# App\nMain docs\n' : '# App\n' }, 2);
  const feature = commit(`${complex ? 'complex' : 'conflict'}-feature`, 'Feature change', [base.id], { 'app.ts': 'color=red\n', 'README.md': '# App\n', ...(complex ? { 'feature.ts': 'enabled\n' } : {}) }, 3);
  const state = repository([base, main, feature], main.id); state.branches.feature = { name: 'feature', target: feature.id }; return state;
}

function remoteScenario(diverged: boolean): GitState {
  const base = commit(`remote-base-${diverged ? 'd' : 'b'}`, 'Shared remote base', [], { 'app.ts': 'base\n' }, 1);
  const local = commit(`remote-local-${diverged ? 'd' : 'b'}`, 'Local work', [base.id], { 'app.ts': 'base\n', 'local.ts': 'local\n' }, 2);
  const upstream = commit(`remote-upstream-${diverged ? 'd' : 'b'}`, 'Remote work', [base.id], { 'app.ts': 'base\n', 'remote.ts': 'remote\n' }, 3);
  const state = repository(diverged ? [base, local] : [base], diverged ? local.id : base.id);
  state.branches.main.upstream = { remote: 'origin', branch: 'main' };
  state.remotes.origin = { name: 'origin', url: 'https://example.test/repo.git', branches: { main: upstream.id }, commits: { [base.id]: base, [upstream.id]: upstream } };
  state.remoteTrackingBranches['origin/main'] = base.id; return state;
}

export const executableLessonIds = Object.freeze(Object.keys(factories) as ExecutableLessonId[]);

export function createLessonScenario(lessonId: LessonId): GitState | null {
  if (lessonId === 'a08' || lessonId === 'a09' || lessonId === 'a10') return null;
  const state = factories[lessonId]();
  const errors = validateState(state);
  if (errors.length > 0) throw new Error(`Invalid ${lessonId} scenario: ${errors.join(', ')}`);
  return structuredClone(state);
}

export function createScenarioById(id: ScenarioId): GitState | null {
  const lessonId = (Object.keys(scenarioIds) as ExecutableLessonId[]).find((candidate) => scenarioIds[candidate] === id);
  return lessonId ? createLessonScenario(lessonId) : null;
}

export const scenarioIds: Record<ExecutableLessonId, ScenarioId> = {
  b01: 'scenario-empty-folder', b02: 'scenario-first-change', b03: 'scenario-three-commits', b04: 'scenario-single-main',
  b05: 'scenario-main-clean', b06: 'scenario-fast-forward-feature', b07: 'scenario-conflicting-branches', b08: 'scenario-undo-lab',
  b09: 'scenario-dirty-worktree', b10: 'scenario-remote-divergence', a01: 'scenario-messy-feature-history',
  a02: 'scenario-hotfix-other-branch', a03: 'scenario-multi-stash', a04: 'scenario-lost-commits', a05: 'scenario-detached-head',
  a06: 'scenario-complex-conflict', a07: 'scenario-remote-diverged',
};
