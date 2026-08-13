export interface ExpectedBehaviorScenario { id: string; given: string[]; when: string; expect: string[]; }

export const EXPECTED_BEHAVIORS: readonly ExpectedBehaviorScenario[] = [
  {
    id: 'commit-snapshots-index-not-working-tree',
    given: ['HEAD app.ts=v1', 'index app.ts=v2', 'working tree app.ts=v3'],
    when: 'git commit -m "stage v2"',
    expect: ['new commit app.ts=v2', 'working tree app.ts=v3', 'app.ts remains unstaged-modified'],
  },
  {
    id: 'fast-forward-no-merge-node',
    given: ['main=B', 'feature descends B→C', 'HEAD=main'],
    when: 'git merge feature',
    expect: ['main=C', 'no commit object created', 'MERGE_FAST_FORWARD emitted'],
  },
  {
    id: 'true-merge-two-parents',
    given: ['main A-B-D', 'feature A-B-C', 'non-conflicting', 'HEAD main@D'],
    when: 'git merge feature',
    expect: ['merge commit M', 'M.parents=[D,C]', 'main=M', 'MERGE_COMMIT_CREATED emitted'],
  },
  {
    id: 'soft-reset',
    given: ['main=C', 'target=B'],
    when: 'git reset --soft B',
    expect: ['main=B', 'index unchanged', 'working tree unchanged', 'C remains recoverable'],
  },
  {
    id: 'mixed-reset',
    given: ['main=C', 'target=B'],
    when: 'git reset --mixed B',
    expect: ['main=B', 'index=B.tree', 'working tree unchanged', 'former C changes become unstaged'],
  },
  {
    id: 'hard-reset',
    given: ['main=C', 'target=B', 'local working changes'],
    when: 'git reset --hard B',
    expect: ['main=B', 'index=B.tree', 'working tree=B.tree', 'C remains in reflog/object state'],
  },
  {
    id: 'revert-preserves-history',
    given: ['main A-B-C', 'C changes app.ts'],
    when: 'git revert C',
    expect: ['new D created', 'history A-B-C-D', 'D inverses C', 'branch never moved backward'],
  },
  {
    id: 'cherry-pick-new-identity',
    given: ['feature has C', 'main=B'],
    when: 'git cherry-pick C',
    expect: ['new D on main', 'D id != C id', 'D change semantically matches C patch'],
  },
  {
    id: 'rebase-replays',
    given: ['main A-B-D', 'feature A-B-C1-C2', 'HEAD=feature'],
    when: 'git rebase main',
    expect: ['feature descends from D', 'C1/C2 changes replay in order', 'new ids', 'old ids remain recoverable'],
  },
  {
    id: 'locale-preserves-state',
    given: ['active GitState', 'locale=en'],
    when: 'switch locale to de',
    expect: ['GitState unchanged', 'progress unchanged', 'UI German', 'Git CLI output English'],
  },
] as const;
