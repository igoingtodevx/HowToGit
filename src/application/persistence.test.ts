import { describe, expect, it, vi } from 'vitest';
import { createGitState } from '../../engine/state';
import { detectBrowserLocale, loadLabState, loadPreferences, savePreferences } from './persistence';

describe('preferences', () => {
  it('uses German for de browser locales and English otherwise', () => {
    expect(detectBrowserLocale('de-CH')).toBe('de');
    expect(detectBrowserLocale('en-GB')).toBe('en');
  });

  it('round-trips the manual locale override', () => {
    let persisted: string | null = null;
    const storage = {
      getItem: vi.fn(() => persisted),
      setItem: vi.fn((_key: string, value: string) => { persisted = value; }),
    };

    savePreferences(storage, { locale: 'de', mode: 'noob', progress: {}, onboarded: true, lessonId: 'b01' });

    expect(loadPreferences(storage).locale).toBe('de');
  });

  it('rejects incomplete or internally invalid persisted Git state', () => {
    const incomplete = { getItem: () => JSON.stringify({ version: 1, git: { initialized: true, sequence: 1, index: {}, workingTree: {} } }) };
    expect(loadLabState(incomplete)).toBeUndefined();
    const invalid = createGitState();
    invalid.head = { kind: 'symbolic', branch: 'missing' };
    expect(loadLabState({ getItem: () => JSON.stringify({ version: 1, git: invalid }) })).toBeUndefined();
  });
});
