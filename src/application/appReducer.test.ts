import { describe, expect, it } from 'vitest';
import { appReducer } from './appReducer';
import { createInitialAppState } from './appState';

describe('appReducer', () => {
  it('defaults to Noob mode', () => {
    expect(createInitialAppState('en').mode).toBe('noob');
  });

  it('preserves Git state and progress when changing locale', () => {
    const state = createInitialAppState('en', {
      b01: { lessonId: 'b01', completed: true, attempts: 1, hintsUsed: 0 },
    });
    state.git.sequence = 7;

    const nextState = appReducer(state, { type: 'locale/changed', locale: 'de' });

    expect(nextState.locale).toBe('de');
    expect(nextState.git).toBe(state.git);
    expect(nextState.progress).toBe(state.progress);
  });
});
