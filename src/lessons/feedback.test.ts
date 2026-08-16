import { describe, expect, it } from 'vitest';
import { executeCommand } from '../../engine/commandExecutor';
import { parseCommand } from '../../engine/commandParser';
import { createInitializedState, writeWorkingFile } from '../../engine/state';
import { fileWithContent, cloneTree } from '../../engine/tree';
import { feedbackFor, correctionFor } from './feedback';

const repoWithCommit = () => {
  const work = cloneTree({ 'app.ts': fileWithContent('app.ts', 'v1\n') });
  const state = createInitializedState(work);
  const staged = executeCommand(state, 'git add app.ts');
  return executeCommand(staged.nextState, 'git commit -m "first"').nextState;
};

describe('git show', () => {
  it('prints commit details and the diff against the first parent', () => {
    const state = repoWithCommit();
    const result = executeCommand(state, 'git show HEAD');
    expect(result.success).toBe(true);
    const text = result.output.map((line) => line.text).join('\n');
    expect(text).toContain('commit ');
    expect(text).toContain('Author: GitFlow Learner');
    expect(text).toContain('first');
    expect(text).toContain('+v1');
  });

  it('fails with UNKNOWN_REVISION for unknown targets', () => {
    const result = executeCommand(repoWithCommit(), 'git show nope');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('UNKNOWN_REVISION');
  });
});

describe('git commit -a', () => {
  it('stages tracked modifications before committing', () => {
    const state = writeWorkingFile(repoWithCommit(), 'app.ts', 'v2\n');
    const result = executeCommand(state, 'git commit -a -m "second"');
    expect(result.success).toBe(true);
    expect(result.effects.map((effect) => effect.type)).toContain('FILE_STAGED');
    expect(result.effects.map((effect) => effect.type)).toContain('COMMIT_CREATED');
    const commit = result.nextState.commits[result.nextState.branches.main.target!];
    expect(commit.tree['app.ts'].content).toBe('v2\n');
  });

  it('supports the -am shorthand', () => {
    const state = writeWorkingFile(repoWithCommit(), 'app.ts', 'v3\n');
    const result = executeCommand(state, 'git commit -am "third"');
    expect(result.success).toBe(true);
    const commit = result.nextState.commits[result.nextState.branches.main.target!];
    expect(commit.tree['app.ts'].content).toBe('v3\n');
  });

  it('does not stage untracked files', () => {
    const state = writeWorkingFile(repoWithCommit(), 'new.ts', 'x\n');
    const result = executeCommand(state, 'git commit -am "only tracked"');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOTHING_TO_COMMIT');
  });

  it('parser rejects mixed flags', () => {
    expect(parseCommand('git commit -a -b -m "x"').success).toBe(false);
  });
});

describe('typo feedback', () => {
  it('detects one-typo verbs', () => {
    expect(correctionFor('git inti')).toBe('git init');
    expect(correctionFor('git stauts')).toBe('git status');
    expect(correctionFor('git commmit -m "x"')).toBe('git commit');
  });

  it('ignores exact and unknown commands', () => {
    expect(correctionFor('git init')).toBeUndefined();
    expect(correctionFor('echo hi')).toBeUndefined();
    expect(correctionFor('git frobnicate')).toBeUndefined();
  });

  it('maps error codes to educational copy and non-git input to notGit', () => {
    expect(feedbackFor('echo hi', 'UNSUPPORTED_SYNTAX')).toEqual({ feedbackKey: 'errors.notGit' });
    expect(feedbackFor('git commit -m x', 'NOTHING_TO_COMMIT').feedbackKey).toBe('errors.nothingToCommit');
    expect(feedbackFor('git stauts', 'UNSUPPORTED_SYNTAX')).toEqual({ feedbackKey: 'errors.typo', correction: 'git status' });
  });

  it('returns nothing for successful commands', () => {
    expect(feedbackFor('git init', undefined)).toEqual({});
  });
});
