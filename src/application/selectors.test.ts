import { describe, expect, it } from 'vitest';
import { executeCommand } from '../../engine/commandExecutor';
import { createGitState, writeWorkingFile } from '../../engine/state';
import { layoutGraph } from './selectors';

describe('graph layout', () => {
  it('is deterministic and gives main lane zero', () => {
    let state = executeCommand(createGitState(), 'git init').nextState;
    state = writeWorkingFile(state, 'app.ts', 'one');
    state = executeCommand(state, 'git add app.ts').nextState;
    state = executeCommand(state, 'git commit -m "one"').nextState;
    expect(layoutGraph(state)).toEqual(layoutGraph(structuredClone(state)));
    expect(layoutGraph(state).nodes[0].lane).toBe(0);
  });
});
