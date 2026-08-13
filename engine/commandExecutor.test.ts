import { describe, expect, it } from 'vitest';
import { executeCommand, executeInteractiveRebase, resolveCommitish } from './commandExecutor';
import { isAncestor } from './graphAlgorithms';
import { previewCommand } from './preview';
import { createGitState, headCommitId, headTree, validateState, writeWorkingFile } from './state';
import { fileWithContent } from './tree';
import type { GitState, TreeSnapshot } from './types';

const run = (state: GitState, command: string): GitState => {
  const result = executeCommand(state, command);
  expect(result.success, `${command}: ${result.output.map((item) => item.text).join('\n')}`).toBe(true);
  expect(validateState(result.nextState)).toEqual([]);
  return result.nextState;
};

const edit = (state: GitState, path: string, content: string) => writeWorkingFile(state, path, content);

const init = (files: TreeSnapshot = {}) => run(createGitState(files), 'git init');

const commitFile = (state: GitState, path: string, content: string, message: string): GitState => {
  let next = edit(state, path, content);
  next = run(next, `git add ${path}`);
  return run(next, `git commit -m "${message}"`);
};

describe('repository basics and the architecture-proof vertical slice', () => {
  it('initializes an unborn main and keeps repeated init deterministic', () => {
    const state = init({ 'README.md': fileWithContent('README.md', '# Demo\n') });
    expect(state.head).toEqual({ kind: 'unborn', branch: 'main' });
    expect(state.branches.main.target).toBeNull();
    const repeated = executeCommand(state, 'git init');
    expect(repeated.success).toBe(true);
    expect(repeated.nextState).toEqual(state);
  });

  it('runs modify → status → add → commit with semantic effects', () => {
    let state = init();
    state = edit(state, 'app.ts', 'console.log("hello");\n');
    expect(executeCommand(state, 'git status --short').output[0]?.text).toBe('?? app.ts');
    const added = executeCommand(state, 'git add app.ts');
    expect(added.effects).toContainEqual({ type: 'FILE_STAGED', paths: ['app.ts'] });
    const committed = executeCommand(added.nextState, 'git commit -m "First snapshot"');
    expect(committed.success).toBe(true);
    expect(committed.effects[0]?.type).toBe('COMMIT_CREATED');
    expect(Object.values(committed.nextState.commits)).toHaveLength(1);
    expect(headTree(committed.nextState)['app.ts'].content).toContain('hello');
  });

  it('commits the staged snapshot and preserves a later unstaged edit', () => {
    let state = init();
    state = edit(state, 'app.ts', 'v2');
    state = run(state, 'git add app.ts');
    state = edit(state, 'app.ts', 'v3');
    state = run(state, 'git commit -m "stage v2"');
    expect(headTree(state)['app.ts'].content).toBe('v2');
    expect(state.workingTree['app.ts'].content).toBe('v3');
    expect(executeCommand(state, 'git status --short').output[0]?.text).toBe(' M app.ts');
  });

  it('stages deletion and rejects empty commits', () => {
    let state = init();
    state = commitFile(state, 'gone.txt', 'tracked', 'track file');
    const deleted = structuredClone(state);
    const workingTree = { ...deleted.workingTree };
    delete workingTree['gone.txt'];
    deleted.workingTree = workingTree;
    state = run(deleted, 'git add -A');
    expect(state.index['gone.txt']).toBeUndefined();
    state = run(state, 'git commit -m "delete file"');
    expect(headTree(state)['gone.txt']).toBeUndefined();
    expect(executeCommand(state, 'git commit -m "empty"').errorCode).toBe('NOTHING_TO_COMMIT');
  });
});

describe('branches, DAG merge and conflicts', () => {
  it('creates/switches branches and checks out a raw commit detached', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    const base = headCommitId(state)!;
    state = run(state, 'git switch -c feature');
    expect(state.head).toEqual({ kind: 'symbolic', branch: 'feature' });
    state = run(state, `git checkout ${base}`);
    expect(state.head).toEqual({ kind: 'detached', target: base });
    expect(executeCommand(state, 'git branch -d main').success).toBe(true);
  });

  it('fast-forwards without creating a merge commit', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = run(state, 'git switch -c feature');
    state = commitFile(state, 'feature.ts', 'feature', 'feature');
    const featureTip = headCommitId(state)!;
    const count = Object.keys(state.commits).length;
    state = run(state, 'git switch main');
    const result = executeCommand(state, 'git merge feature');
    expect(result.success).toBe(true);
    expect(result.effects.some((effect) => effect.type === 'MERGE_FAST_FORWARD')).toBe(true);
    expect(Object.keys(result.nextState.commits)).toHaveLength(count);
    expect(result.nextState.branches.main.target).toBe(featureTip);
  });

  it('creates a true two-parent merge from a DAG-derived base', () => {
    let state = commitFile(init(), 'base.txt', 'base', 'base');
    state = run(state, 'git branch feature');
    state = commitFile(state, 'main.txt', 'main', 'main work');
    const mainTip = headCommitId(state)!;
    state = run(state, 'git switch feature');
    state = commitFile(state, 'feature.txt', 'feature', 'feature work');
    const featureTip = headCommitId(state)!;
    state = run(state, 'git switch main');
    const result = executeCommand(state, 'git merge feature');
    expect(result.success).toBe(true);
    const merge = result.nextState.commits[headCommitId(result.nextState)!];
    expect(merge.parents).toEqual([mainTip, featureTip]);
    expect(result.effects[0]?.type).toBe('MERGE_COMMIT_CREATED');
    expect(merge.tree['main.txt']).toBeDefined();
    expect(merge.tree['feature.txt']).toBeDefined();
  });

  it.each([
    ['staged', (state: GitState) => run(edit(state, 'app.ts', 'local staged'), 'git add app.ts')],
    ['unstaged', (state: GitState) => edit(state, 'app.ts', 'local unstaged')],
    ['staged and unstaged', (state: GitState) => edit(run(edit(state, 'app.ts', 'local staged'), 'git add app.ts'), 'app.ts', 'local unstaged')],
  ])('rejects a merge that would overwrite %s changes', (_label, makeDirty) => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = run(state, 'git switch -c feature');
    state = commitFile(state, 'app.ts', 'feature', 'feature changes app');
    state = run(state, 'git switch main');
    state = makeDirty(state);

    const result = executeCommand(state, 'git merge feature');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('LOCAL_CHANGES_OVERWRITTEN');
    expect(result.nextState).toBe(state);
    expect(result.output.map((entry) => entry.text).join('\n')).toContain('app.ts');
  });

  it('preserves unrelated staged and unstaged work across a safe merge', () => {
    let state = commitFile(init(), 'local.txt', 'base', 'base');
    state = run(state, 'git switch -c feature');
    state = commitFile(state, 'feature.txt', 'feature', 'feature work');
    const featureTip = headCommitId(state)!;
    state = run(state, 'git switch main');
    state = edit(state, 'local.txt', 'staged local');
    state = run(state, 'git add local.txt');
    state = edit(state, 'local.txt', 'unstaged local');

    const result = executeCommand(state, 'git merge feature');

    expect(result.success).toBe(true);
    expect(headCommitId(result.nextState)).toBe(featureTip);
    expect(result.nextState.index['local.txt'].content).toBe('staged local');
    expect(result.nextState.workingTree['local.txt'].content).toBe('unstaged local');
    expect(result.nextState.index['feature.txt'].content).toBe('feature');
    expect(result.nextState.workingTree['feature.txt'].content).toBe('feature');
  });

  it('stores base/ours/theirs and commits only after edit and stage', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = run(state, 'git branch feature');
    state = commitFile(state, 'app.ts', 'ours', 'main change');
    const mainTip = headCommitId(state)!;
    state = run(state, 'git switch feature');
    state = commitFile(state, 'app.ts', 'theirs', 'feature change');
    const featureTip = headCommitId(state)!;
    state = run(state, 'git switch main');
    const conflicted = executeCommand(state, 'git merge feature');
    expect(conflicted.success).toBe(true);
    expect(headCommitId(conflicted.nextState)).toBe(mainTip);
    expect(conflicted.nextState.operation?.conflicts['app.ts']).toMatchObject({ base: 'base', ours: 'ours', theirs: 'theirs', resolved: false });
    expect(executeCommand(conflicted.nextState, 'git commit -m "too early"').errorCode).toBe('UNRESOLVED_CONFLICTS');
    state = edit(conflicted.nextState, 'app.ts', 'ours + theirs');
    const unstagedResolution = executeCommand(state, 'git commit -m "still too early"');
    expect(unstagedResolution.errorCode).toBe('CONFLICT_RESOLUTION_NOT_STAGED');
    expect(unstagedResolution.nextState).toBe(state);
    state = run(state, 'git add app.ts');
    state = edit(state, 'app.ts', 'ours + theirs, refined');
    expect(executeCommand(state, 'git commit -m "edited after add"').errorCode).toBe('CONFLICT_RESOLUTION_NOT_STAGED');
    state = run(state, 'git add app.ts');
    state = run(state, 'git commit -m "resolve"');
    expect(state.operation).toBeNull();
    expect(headTree(state)['app.ts'].content).toBe('ours + theirs, refined');
    expect(state.commits[headCommitId(state)!].parents).toEqual([mainTip, featureTip]);
  });
});

describe('undo, stash, replay, reflog and preview', () => {
  it('keeps soft/mixed/hard reset semantics distinct and objects recoverable', () => {
    let state = commitFile(init(), 'app.ts', 'one', 'one');
    const first = headCommitId(state)!;
    state = commitFile(state, 'app.ts', 'two', 'two');
    const second = headCommitId(state)!;

    const soft = run(state, `git reset --soft ${first}`);
    expect(soft.branches.main.target).toBe(first);
    expect(soft.index['app.ts'].content).toBe('two');
    expect(soft.workingTree['app.ts'].content).toBe('two');
    expect(soft.commits[second]).toBeDefined();

    const mixed = run(state, `git reset ${first}`);
    expect(mixed.index['app.ts'].content).toBe('one');
    expect(mixed.workingTree['app.ts'].content).toBe('two');

    const dirty = edit(state, 'app.ts', 'dirty');
    const hard = run(dirty, `git reset --hard ${first}`);
    expect(hard.index['app.ts'].content).toBe('one');
    expect(hard.workingTree['app.ts'].content).toBe('one');
    expect(hard.commits[second]).toBeDefined();
    expect(resolveCommitish(hard, second.slice(0, 7))).toBe(second);
  });

  it('revert makes correcting history instead of moving backward', () => {
    let state = commitFile(init(), 'app.ts', 'one', 'one');
    state = commitFile(state, 'app.ts', 'bad', 'bad change');
    const bad = headCommitId(state)!;
    state = run(state, `git revert ${bad}`);
    const reverted = headCommitId(state)!;
    expect(reverted).not.toBe(bad);
    expect(state.commits[reverted].parents).toEqual([bad]);
    expect(headTree(state)['app.ts'].content).toBe('one');
  });

  it('rejects revert when its patch overlaps local changes and preserves unrelated staged work', () => {
    let state = commitFile(init(), 'app.ts', 'one', 'one');
    state = commitFile(state, 'app.ts', 'bad', 'bad change');
    const bad = headCommitId(state)!;

    const overlapping = edit(state, 'app.ts', 'local correction');
    const rejected = executeCommand(overlapping, `git revert ${bad}`);
    expect(rejected.errorCode).toBe('LOCAL_CHANGES_OVERWRITTEN');
    expect(rejected.nextState).toBe(overlapping);

    state = edit(state, 'notes.ts', 'staged notes');
    state = run(state, 'git add notes.ts');
    state = edit(state, 'notes.ts', 'unstaged notes');
    const reverted = run(state, `git revert ${bad}`);
    expect(headTree(reverted)['app.ts'].content).toBe('one');
    expect(reverted.index['notes.ts'].content).toBe('staged notes');
    expect(reverted.workingTree['notes.ts'].content).toBe('unstaged notes');
  });

  it('round-trips a named stash and retains it on failed pop', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = edit(state, 'app.ts', 'wip');
    state = run(state, 'git stash -m "WIP login"');
    expect(state.stashes[0].message).toBe('WIP login');
    expect(state.workingTree['app.ts'].content).toBe('base');
    const dirty = edit(state, 'other.ts', 'local');
    const failed = executeCommand(dirty, 'git stash pop');
    expect(failed.success).toBe(false);
    expect(failed.nextState.stashes).toHaveLength(1);
    state = run(state, 'git stash pop');
    expect(state.stashes).toHaveLength(0);
    expect(state.workingTree['app.ts'].content).toBe('wip');
  });

  it('cherry-picks the patch with a new identity and parent', () => {
    let state = commitFile(init(), 'base.ts', 'base', 'base');
    const base = headCommitId(state)!;
    state = run(state, 'git switch -c hotfix');
    state = commitFile(state, 'fix.ts', 'fixed', 'hotfix');
    const source = headCommitId(state)!;
    state = run(state, 'git switch main');
    state = run(state, `git cherry-pick ${source}`);
    const picked = headCommitId(state)!;
    expect(picked).not.toBe(source);
    expect(state.commits[picked].parents).toEqual([base]);
    expect(headTree(state)['fix.ts'].content).toBe('fixed');
  });

  it('rejects overlapping cherry-pick dirt and preserves unrelated staged and unstaged work', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = run(state, 'git switch -c feature');
    state = commitFile(state, 'app.ts', 'feature', 'feature app');
    const source = headCommitId(state)!;
    state = run(state, 'git switch main');

    const overlapping = run(edit(state, 'app.ts', 'local staged'), 'git add app.ts');
    const rejected = executeCommand(overlapping, `git cherry-pick ${source}`);
    expect(rejected.errorCode).toBe('LOCAL_CHANGES_OVERWRITTEN');
    expect(rejected.nextState).toBe(overlapping);

    state = edit(state, 'notes.ts', 'staged notes');
    state = run(state, 'git add notes.ts');
    state = edit(state, 'notes.ts', 'unstaged notes');
    const picked = run(state, `git cherry-pick ${source}`);
    expect(headTree(picked)['app.ts'].content).toBe('feature');
    expect(picked.index['notes.ts'].content).toBe('staged notes');
    expect(picked.workingTree['notes.ts'].content).toBe('unstaged notes');
  });

  it('rebases unique commits in order with new identities and old objects retained', () => {
    let state = commitFile(init(), 'base.ts', 'base', 'base');
    state = run(state, 'git branch feature');
    state = commitFile(state, 'main.ts', 'main', 'main');
    const mainTip = headCommitId(state)!;
    state = run(state, 'git switch feature');
    state = commitFile(state, 'feature.ts', 'one', 'feature one');
    state = commitFile(state, 'feature.ts', 'two', 'feature two');
    const oldTip = headCommitId(state)!;
    const oldAncestors = [...new Set([oldTip, state.commits[oldTip].parents[0]])];
    const result = executeCommand(state, 'git rebase main');
    expect(result.success).toBe(true);
    const next = result.nextState;
    const newTip = headCommitId(next)!;
    expect(newTip).not.toBe(oldTip);
    expect(isAncestor(next.commits, mainTip, newTip)).toBe(true);
    expect(headTree(next)['feature.ts'].content).toBe('two');
    oldAncestors.forEach((id) => expect(next.commits[id]).toBeDefined());
    expect(result.effects[0]).toMatchObject({ type: 'COMMITS_REPLAYED' });
  });

  it('rejects overlapping rebase dirt and preserves unrelated staged and unstaged work', () => {
    let state = commitFile(init(), 'base.ts', 'base', 'base');
    state = run(state, 'git branch feature');
    state = commitFile(state, 'main.ts', 'main', 'main work');
    state = run(state, 'git switch feature');
    state = commitFile(state, 'feature.ts', 'feature', 'feature work');

    const overlapping = edit(state, 'main.ts', 'local main');
    const rejected = executeCommand(overlapping, 'git rebase main');
    expect(rejected.errorCode).toBe('LOCAL_CHANGES_OVERWRITTEN');
    expect(rejected.nextState).toBe(overlapping);

    state = edit(state, 'notes.ts', 'staged notes');
    state = run(state, 'git add notes.ts');
    state = edit(state, 'notes.ts', 'unstaged notes');
    const rebased = run(state, 'git rebase main');
    expect(headTree(rebased)['main.ts'].content).toBe('main');
    expect(headTree(rebased)['feature.ts'].content).toBe('feature');
    expect(rebased.index['notes.ts'].content).toBe('staged notes');
    expect(rebased.workingTree['notes.ts'].content).toBe('unstaged notes');
  });

  it('interactive rebase supports pick, reword, squash and drop with new identities', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    const base = headCommitId(state)!;
    state = commitFile(state, 'one.ts', 'one', 'one');
    const one = headCommitId(state)!;
    state = commitFile(state, 'two.ts', 'two', 'two');
    const two = headCommitId(state)!;
    state = commitFile(state, 'drop.ts', 'drop', 'drop');
    const drop = headCommitId(state)!;
    const result = executeInteractiveRebase(state, base, [
      { commitId: one, action: 'reword', message: 'feature foundation' },
      { commitId: two, action: 'squash' },
      { commitId: drop, action: 'drop' },
    ]);
    expect(result.success).toBe(true);
    const tip = headCommitId(result.nextState)!;
    expect(result.nextState.commits[tip].message).toContain('feature foundation');
    expect(result.nextState.commits[tip].tree['one.ts']).toBeDefined();
    expect(result.nextState.commits[tip].tree['two.ts']).toBeDefined();
    expect(result.nextState.commits[tip].tree['drop.ts']).toBeUndefined();
    expect([one, two, drop]).not.toContain(tip);
  });

  it('guards interactive rebase dirt and preserves unrelated local work', () => {
    let state = commitFile(init(), 'base.ts', 'base', 'base');
    const base = headCommitId(state)!;
    state = commitFile(state, 'keep.ts', 'keep', 'keep');
    const keep = headCommitId(state)!;
    state = commitFile(state, 'drop.ts', 'drop', 'drop');
    const drop = headCommitId(state)!;
    const plan = [
      { commitId: keep, action: 'pick' as const },
      { commitId: drop, action: 'drop' as const },
    ];

    const overlapping = edit(state, 'drop.ts', 'local drop edits');
    const rejected = executeInteractiveRebase(overlapping, base, plan);
    expect(rejected.errorCode).toBe('LOCAL_CHANGES_OVERWRITTEN');
    expect(rejected.nextState).toBe(overlapping);

    state = edit(state, 'notes.ts', 'staged notes');
    state = run(state, 'git add notes.ts');
    state = edit(state, 'notes.ts', 'unstaged notes');
    const rebased = executeInteractiveRebase(state, base, plan);
    expect(rebased.success).toBe(true);
    expect(headTree(rebased.nextState)['drop.ts']).toBeUndefined();
    expect(rebased.nextState.index['notes.ts'].content).toBe('staged notes');
    expect(rebased.nextState.workingTree['notes.ts'].content).toBe('unstaged notes');
  });

  it('fast-forwards a rebase when the upstream already contains HEAD', () => {
    let state = commitFile(init(), 'base.ts', 'base', 'base');
    state = run(state, 'git branch feature');
    state = commitFile(state, 'main.ts', 'ahead', 'main ahead');
    const mainTip = headCommitId(state)!;
    state = run(state, 'git switch feature');
    state = run(state, 'git rebase main');
    expect(state.branches.feature.target).toBe(mainTip);
    expect(state.index).toEqual(state.commits[mainTip].tree);
  });

  it('records reflog movement and previews purely/equivalently', () => {
    let state = commitFile(init(), 'app.ts', 'one', 'one');
    state = commitFile(state, 'app.ts', 'two', 'two');
    const untouched = structuredClone(state);
    const preview = previewCommand(state, 'git reset --hard HEAD~1');
    expect(state).toEqual(untouched);
    const execution = executeCommand(state, 'git reset --hard HEAD~1');
    expect(preview.result.nextState).toEqual(execution.nextState);
    expect(execution.nextState.reflog[0].message).toContain('reset');
  });
});

describe('reachable history rendering', () => {
  it('shows both parents of a merge and renders a deterministic graph connector', () => {
    let state = commitFile(init(), 'base.txt', 'base', 'base');
    state = run(state, 'git branch feature');
    state = commitFile(state, 'main.txt', 'main', 'main work');
    state = run(state, 'git switch feature');
    state = commitFile(state, 'feature.txt', 'feature', 'feature work');
    const featureTip = headCommitId(state)!;
    state = run(state, 'git switch main');
    state = run(state, 'git merge feature');

    const output = executeCommand(state, 'git log --oneline --graph').output.map((entry) => entry.text);

    expect(output.join('\n')).toContain(`${featureTip.slice(0, 7)} feature work`);
    expect(output).toContain('|\\  ');
  });

  it('includes commits reachable only from another ref with --all', () => {
    let state = commitFile(init(), 'base.txt', 'base', 'base');
    state = run(state, 'git switch -c side');
    state = commitFile(state, 'side.txt', 'side', 'side only');
    const sideTip = headCommitId(state)!;
    state = run(state, 'git switch main');

    const currentOnly = executeCommand(state, 'git log --oneline').output.map((entry) => entry.text).join('\n');
    const allRefs = executeCommand(state, 'git log --oneline --all').output.map((entry) => entry.text).join('\n');

    expect(currentOnly).not.toContain(sideTip.slice(0, 7));
    expect(allRefs).toContain(`${sideTip.slice(0, 7)} side only`);
  });
});

describe('remote separation and integration', () => {
  it('fetch updates remote tracking without moving local main; push checks fast-forward', () => {
    let state = commitFile(init(), 'app.ts', 'local base', 'base');
    state = run(state, 'git remote add origin https://example.test/repo.git');
    const localTip = headCommitId(state)!;
    const remoteCommit = {
      ...state.commits[localTip],
      id: 'remote0001',
      message: 'remote work',
      timestamp: 100,
      parents: [localTip],
      tree: { ...headTree(state), 'remote.ts': fileWithContent('remote.ts', 'remote') },
    };
    state.remotes.origin.commits = { [localTip]: structuredClone(state.commits[localTip]), [remoteCommit.id]: remoteCommit };
    state.remotes.origin.branches.main = remoteCommit.id;
    const fetched = executeCommand(state, 'git fetch origin');
    expect(fetched.success).toBe(true);
    expect(fetched.nextState.branches.main.target).toBe(localTip);
    expect(fetched.nextState.remoteTrackingBranches['origin/main']).toBe(remoteCommit.id);
    expect(executeCommand(fetched.nextState, 'git push -u origin main').errorCode).toBe('NON_FAST_FORWARD');
    let next = run(fetched.nextState, 'git merge origin/main');
    next = run(next, 'git push -u origin main');
    expect(next.remotes.origin.branches.main).toBe(next.branches.main.target);
    expect(next.branches.main.upstream).toEqual({ remote: 'origin', branch: 'main' });
  });

  it('composes pull as fetch plus merge with one original-state transaction', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = run(state, 'git remote add origin https://example.test/repo.git');
    state = run(state, 'git push -u origin main');
    const localTip = headCommitId(state)!;
    const remoteCommit = {
      ...state.commits[localTip],
      id: 'remote0002',
      message: 'remote follow-up',
      timestamp: 200,
      parents: [localTip],
      tree: { ...headTree(state), 'remote.ts': fileWithContent('remote.ts', 'remote') },
    };
    state.remotes.origin.commits[remoteCommit.id] = remoteCommit;
    state.remotes.origin.branches.main = remoteCommit.id;
    const original = structuredClone(state);

    const pulled = executeCommand(state, 'git pull');

    expect(pulled.success).toBe(true);
    expect(pulled.previousState).toBe(state);
    expect(pulled.previousState).toEqual(original);
    expect(headCommitId(pulled.nextState)).toBe(remoteCommit.id);
    expect(pulled.output.map((entry) => entry.text).join('\n')).toContain('From https://example.test/repo.git');
    expect(pulled.output.map((entry) => entry.text).join('\n')).toContain('Fast-forward');
    expect(pulled.effects.map((effect) => effect.type)).toEqual(expect.arrayContaining(['REMOTE_UPDATED', 'MERGE_FAST_FORWARD']));
  });

  it('keeps fetched refs and fetch evidence when pull cannot merge dirty work', () => {
    let state = commitFile(init(), 'app.ts', 'base', 'base');
    state = run(state, 'git remote add origin https://example.test/repo.git');
    state = run(state, 'git push -u origin main');
    const localTip = headCommitId(state)!;
    const remoteCommit = {
      ...state.commits[localTip],
      id: 'remote0003',
      message: 'remote app change',
      timestamp: 300,
      parents: [localTip],
      tree: { ...headTree(state), 'app.ts': fileWithContent('app.ts', 'remote') },
    };
    state.remotes.origin.commits[remoteCommit.id] = remoteCommit;
    state.remotes.origin.branches.main = remoteCommit.id;
    state = edit(state, 'app.ts', 'local dirty');

    const pulled = executeCommand(state, 'git pull');

    expect(pulled.success).toBe(false);
    expect(pulled.errorCode).toBe('LOCAL_CHANGES_OVERWRITTEN');
    expect(pulled.previousState).toBe(state);
    expect(pulled.nextState.remoteTrackingBranches['origin/main']).toBe(remoteCommit.id);
    expect(pulled.nextState.workingTree['app.ts'].content).toBe('local dirty');
    expect(pulled.output.map((entry) => entry.text).join('\n')).toContain('From https://example.test/repo.git');
    expect(pulled.effects).toContainEqual({ type: 'REMOTE_UPDATED', remote: 'origin', refs: ['origin/main'] });
  });

  it('keeps CLI output English independently of application locale', () => {
    const output = executeCommand(init(), 'git status').output.map((entry) => entry.text).join('\n');
    expect(output).toContain('On branch main');
    expect(output).not.toContain('Branch-Zeiger');
  });
});
