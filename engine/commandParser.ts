import type { ResetMode } from './types';

export type ParsedCommand =
  | { kind: 'init' }
  | { kind: 'status'; short: boolean }
  | { kind: 'add'; paths: string[] }
  | { kind: 'commit'; message: string; stageAll: boolean }
  | { kind: 'show'; target?: string }
  | { kind: 'log'; oneline: boolean; graph: boolean; all: boolean }
  | { kind: 'diff'; staged: boolean }
  | { kind: 'branch'; action: 'list' }
  | { kind: 'branch'; action: 'create' | 'delete'; name: string }
  | { kind: 'switch'; create: boolean; target: string }
  | { kind: 'checkout'; create: boolean; target: string }
  | { kind: 'merge'; target: string }
  | { kind: 'reset'; mode: ResetMode; target: string }
  | { kind: 'revert'; target: string }
  | { kind: 'stash'; action: 'create'; message: string }
  | { kind: 'stash'; action: 'list' | 'pop' }
  | { kind: 'tag'; action: 'list' }
  | { kind: 'tag'; action: 'create'; name: string; target?: string }
  | { kind: 'cherry-pick'; target: string }
  | { kind: 'rebase'; target: string; interactive: boolean }
  | { kind: 'reflog' }
  | { kind: 'remote'; action: 'list' }
  | { kind: 'remote'; action: 'add'; name: string; url: string }
  | { kind: 'fetch'; remote?: string }
  | { kind: 'pull' }
  | { kind: 'push'; setUpstream: boolean; remote?: string; branch?: string };

export interface ParseSuccess { success: true; command: ParsedCommand }
export interface ParseFailure { success: false; message: string }
export type ParseResult = ParseSuccess | ParseFailure;

const fail = (message: string): ParseFailure => ({ success: false, message });

export const tokenizeCommand = (input: string): string[] | null => {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;
  for (const character of input.trim()) {
    if (escaping) {
      current += character;
      escaping = false;
      continue;
    }
    if (character === '\\') {
      escaping = true;
      continue;
    }
    if (quote !== null) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += character;
  }
  if (quote !== null || escaping) return null;
  if (current.length > 0) tokens.push(current);
  return tokens;
};

const exactly = (args: string[], count: number, usage: string): ParseFailure | null =>
  args.length === count ? null : fail(`usage: ${usage}`);

export const parseCommand = (input: string): ParseResult => {
  const tokens = tokenizeCommand(input);
  if (tokens === null) return fail('Unterminated quote or escape sequence.');
  if (tokens[0] !== 'git' || !tokens[1]) return fail('Only supported Git commands beginning with `git` can run here.');
  const family = tokens[1];
  const args = tokens.slice(2);

  switch (family) {
    case 'init': {
      const error = exactly(args, 0, 'git init');
      return error ?? { success: true, command: { kind: 'init' } };
    }
    case 'status':
      if (args.some((arg) => arg !== '--short')) return fail('usage: git status [--short]');
      return { success: true, command: { kind: 'status', short: args.includes('--short') } };
    case 'add':
      if (args.length === 0) return fail('Nothing specified, nothing added.');
      return { success: true, command: { kind: 'add', paths: args } };
    case 'commit': {
      const messageIndex = args.indexOf('-m');
      const shorthandIndex = args.indexOf('-am');
      const stageAll = args.includes('-a') || shorthandIndex !== -1;
      const flagCount = args.filter((arg) => arg === '-a' || arg === '-am' || arg === '-m').length;
      if (flagCount !== args.length - 1) return fail('usage: git commit [-a] -m "<message>"');
      if (shorthandIndex !== -1) {
        if (shorthandIndex !== args.length - 2) return fail('usage: git commit [-a] -m "<message>"');
        return { success: true, command: { kind: 'commit', message: args[shorthandIndex + 1], stageAll: true } };
      }
      if (messageIndex !== args.length - 2) return fail('usage: git commit [-a] -m "<message>"');
      return { success: true, command: { kind: 'commit', message: args[messageIndex + 1], stageAll } };
    }
    case 'show':
      if (args.length <= 1) return { success: true, command: { kind: 'show', target: args[0] } };
      return fail('usage: git show [<commit-ish>]');
    case 'log':
      if (args.some((arg) => !['--oneline', '--graph', '--all'].includes(arg))) return fail('usage: git log [--oneline] [--graph] [--all]');
      return { success: true, command: { kind: 'log', oneline: args.includes('--oneline'), graph: args.includes('--graph'), all: args.includes('--all') } };
    case 'diff':
      if (args.some((arg) => !['--staged', '--cached'].includes(arg)) || args.length > 1) return fail('usage: git diff [--staged|--cached]');
      return { success: true, command: { kind: 'diff', staged: args.length === 1 } };
    case 'branch':
      if (args.length === 0) return { success: true, command: { kind: 'branch', action: 'list' } };
      if (args[0] === '-d' && args.length === 2) return { success: true, command: { kind: 'branch', action: 'delete', name: args[1] } };
      if (args.length === 1 && !args[0].startsWith('-')) return { success: true, command: { kind: 'branch', action: 'create', name: args[0] } };
      return fail('usage: git branch [-d <name>] [<name>]');
    case 'switch':
      if (args[0] === '-c' && args.length === 2) return { success: true, command: { kind: 'switch', create: true, target: args[1] } };
      if (args.length === 1) return { success: true, command: { kind: 'switch', create: false, target: args[0] } };
      return fail('usage: git switch [-c] <branch>');
    case 'checkout':
      if (args[0] === '-b' && args.length === 2) return { success: true, command: { kind: 'checkout', create: true, target: args[1] } };
      if (args.length === 1) return { success: true, command: { kind: 'checkout', create: false, target: args[0] } };
      return fail('usage: git checkout [-b] <branch|commit>');
    case 'merge':
      return args.length === 1 ? { success: true, command: { kind: 'merge', target: args[0] } } : fail('usage: git merge <branch>');
    case 'reset': {
      const flag = args.find((arg) => arg.startsWith('--'));
      if (flag && !['--soft', '--mixed', '--hard'].includes(flag)) return fail('usage: git reset [--soft|--mixed|--hard] <commit-ish>');
      const target = args.find((arg) => !arg.startsWith('--'));
      if (!target || args.length > 2) return fail('usage: git reset [--soft|--mixed|--hard] <commit-ish>');
      return { success: true, command: { kind: 'reset', mode: (flag?.slice(2) as ResetMode | undefined) ?? 'mixed', target } };
    }
    case 'revert':
      return args.length === 1 ? { success: true, command: { kind: 'revert', target: args[0] } } : fail('usage: git revert <commit-ish>');
    case 'stash':
      if (args.length === 0 || (args[0] === 'push' && args.length === 1)) return { success: true, command: { kind: 'stash', action: 'create', message: 'WIP' } };
      if (args[0] === 'list' && args.length === 1) return { success: true, command: { kind: 'stash', action: 'list' } };
      if (args[0] === 'pop' && args.length === 1) return { success: true, command: { kind: 'stash', action: 'pop' } };
      if ((args[0] === '-m' && args.length === 2) || (args[0] === 'push' && args[1] === '-m' && args.length === 3)) {
        return { success: true, command: { kind: 'stash', action: 'create', message: args.at(-1) ?? 'WIP' } };
      }
      return fail('usage: git stash [-m "<message>"] | git stash list | git stash pop');
    case 'tag':
      if (args.length === 0) return { success: true, command: { kind: 'tag', action: 'list' } };
      if (args.length <= 2) return { success: true, command: { kind: 'tag', action: 'create', name: args[0], target: args[1] } };
      return fail('usage: git tag [<name> [<commit-ish>]]');
    case 'cherry-pick':
      return args.length === 1 ? { success: true, command: { kind: 'cherry-pick', target: args[0] } } : fail('usage: git cherry-pick <commit-ish>');
    case 'rebase':
      if (args[0] === '-i' && args.length === 2) return { success: true, command: { kind: 'rebase', target: args[1], interactive: true } };
      if (args.length === 1) return { success: true, command: { kind: 'rebase', target: args[0], interactive: false } };
      return fail('usage: git rebase [-i] <branch|commit-ish>');
    case 'reflog':
      return args.length === 0 ? { success: true, command: { kind: 'reflog' } } : fail('usage: git reflog');
    case 'remote':
      if ((args.length === 0) || (args.length === 1 && args[0] === '-v')) return { success: true, command: { kind: 'remote', action: 'list' } };
      if (args[0] === 'add' && args.length === 3) return { success: true, command: { kind: 'remote', action: 'add', name: args[1], url: args[2] } };
      return fail('usage: git remote -v | git remote add <name> <url>');
    case 'fetch':
      return args.length <= 1 ? { success: true, command: { kind: 'fetch', remote: args[0] } } : fail('usage: git fetch [remote]');
    case 'pull':
      return args.length === 0 ? { success: true, command: { kind: 'pull' } } : fail('usage: git pull');
    case 'push': {
      if (args[0] === '-u' && args.length === 3) return { success: true, command: { kind: 'push', setUpstream: true, remote: args[1], branch: args[2] } };
      if (args.length === 0) return { success: true, command: { kind: 'push', setUpstream: false } };
      if (args.length === 2) return { success: true, command: { kind: 'push', setUpstream: false, remote: args[0], branch: args[1] } };
      return fail('usage: git push [-u <remote> <branch>] | git push <remote> <branch>');
    }
    default:
      return fail(`Unsupported Git command: git ${family}`);
  }
};
