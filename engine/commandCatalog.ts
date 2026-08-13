export type CommandFamily =
  | 'init' | 'status' | 'add' | 'commit' | 'log' | 'diff'
  | 'branch' | 'switch' | 'checkout' | 'merge' | 'reset' | 'revert'
  | 'stash' | 'tag' | 'cherry-pick' | 'rebase' | 'reflog'
  | 'remote' | 'fetch' | 'pull' | 'push';

export interface CommandCapability {
  family: CommandFamily;
  beginner: boolean;
  patterns: string[];
  risk: 'safe' | 'caution' | 'destructive';
}

export const COMMAND_CAPABILITIES: readonly CommandCapability[] = [
  { family: 'init', beginner: true, patterns: ['git init'], risk: 'safe' },
  { family: 'status', beginner: true, patterns: ['git status', 'git status --short'], risk: 'safe' },
  { family: 'add', beginner: true, patterns: ['git add <path...>', 'git add .', 'git add -A'], risk: 'safe' },
  { family: 'commit', beginner: true, patterns: ['git commit -m "<message>"'], risk: 'safe' },
  { family: 'log', beginner: true, patterns: ['git log [--oneline] [--graph] [--all]'], risk: 'safe' },
  { family: 'diff', beginner: true, patterns: ['git diff', 'git diff --staged'], risk: 'safe' },
  { family: 'branch', beginner: true, patterns: ['git branch', 'git branch <name>', 'git branch -d <name>'], risk: 'caution' },
  { family: 'switch', beginner: true, patterns: ['git switch <branch>', 'git switch -c <branch>'], risk: 'caution' },
  { family: 'checkout', beginner: true, patterns: ['git checkout <branch|commit>', 'git checkout -b <branch>'], risk: 'caution' },
  { family: 'merge', beginner: true, patterns: ['git merge <branch>'], risk: 'caution' },
  { family: 'reset', beginner: true, patterns: ['git reset [--soft|--mixed|--hard] <commit-ish>'], risk: 'destructive' },
  { family: 'revert', beginner: true, patterns: ['git revert <commit-ish>'], risk: 'caution' },
  { family: 'stash', beginner: true, patterns: ['git stash', 'git stash -m "<message>"', 'git stash list', 'git stash pop'], risk: 'caution' },
  { family: 'tag', beginner: false, patterns: ['git tag', 'git tag <name> [commit-ish]'], risk: 'safe' },
  { family: 'cherry-pick', beginner: false, patterns: ['git cherry-pick <commit-ish>'], risk: 'caution' },
  { family: 'rebase', beginner: false, patterns: ['git rebase <branch>', 'git rebase -i <base>'], risk: 'destructive' },
  { family: 'reflog', beginner: false, patterns: ['git reflog'], risk: 'safe' },
  { family: 'remote', beginner: true, patterns: ['git remote add <name> <url>', 'git remote -v'], risk: 'safe' },
  { family: 'fetch', beginner: true, patterns: ['git fetch [remote]'], risk: 'safe' },
  { family: 'pull', beginner: true, patterns: ['git pull'], risk: 'caution' },
  { family: 'push', beginner: true, patterns: ['git push', 'git push -u <remote> <branch>', 'git push <remote> <branch>'], risk: 'caution' },
] as const;
