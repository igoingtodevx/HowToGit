import type { AITutorContext } from './schemas';

export const BEGINNER_STAGING_CONFUSION_CONTEXT: AITutorContext = {
  locale: 'de', mode: 'noob', intent: 'EXPLAIN_MISTAKE',
  currentLesson: {
    id: 'b02-three-zones',
    objective: 'Stage app.ts and create your first commit.',
    concepts: ['working-tree', 'staging-area', 'repository'],
  },
  repo: {
    initialized: true, currentBranch: 'main', detachedHead: null, headCommit: null,
    branches: [{ name: 'main', tip: null }], recentCommits: [],
    workingTree: [{ path: 'app.ts', status: 'untracked' }], staged: [], conflicts: [], remotes: [],
  },
  recentCommands: [{ input: 'git commit -m "first"', success: false, errorCode: 'NOTHING_TO_COMMIT' }],
  supportedCommandFamilies: ['status', 'add', 'commit', 'log', 'diff'],
};

export const LOST_COMMITS_CONTEXT: AITutorContext = {
  locale: 'en', mode: 'pro', intent: 'FIX_REPO',
  currentLesson: {
    id: 'a04-reflog', objective: 'Recover commits removed from normal branch reachability.',
    concepts: ['reflog', 'reset', 'recovery'],
  },
  repo: {
    initialized: true, currentBranch: 'main', detachedHead: null, headCommit: 'c000003',
    branches: [{ name: 'main', tip: 'c000003' }],
    recentCommits: [
      { id: 'c000003', message: 'Base', parents: ['c000002'] },
      { id: 'c000002', message: 'Setup', parents: ['c000001'] },
    ],
    workingTree: [], staged: [], conflicts: [], remotes: [],
  },
  recentCommands: [{ input: 'git reset --hard HEAD~2', success: true }],
  supportedCommandFamilies: ['reflog', 'reset', 'branch', 'checkout', 'switch'],
};
