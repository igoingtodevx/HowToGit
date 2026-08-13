import { describe, expect, it, vi } from 'vitest';
import { createInitializedState, writeWorkingFile } from '../../engine/state';
import type { GitState } from '../../engine/types';
import { serializeTutorContext } from './context';
import { PollinationsAIProvider } from './provider';
import { extractOpenAICompatibleResponse, validateTutorResponse } from './response';
import { requestTutorResponse } from './tutor';

const contextOptions = {
  locale: 'en' as const,
  mode: 'noob' as const,
  intent: 'ASK_GIT' as const,
  supportedCommandFamilies: ['status', 'add'],
};

describe('AI context', () => {
  it('creates a bounded immutable snapshot without file contents', () => {
    let state = createInitializedState();
    for (let index = 0; index < 40; index += 1) state = writeWorkingFile(state, `file-${index}.txt`, `secret-${index}`);
    const context = serializeTutorContext(state, {
      ...contextOptions,
      recentCommands: Array.from({ length: 20 }, (_, index) => ({ input: `git status ${index}`, success: false, timestamp: index })),
    });

    expect(context.repo.workingTree).toHaveLength(32);
    expect(context.recentCommands).toHaveLength(8);
    expect(JSON.stringify(context)).not.toContain('secret-');
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.repo.workingTree)).toBe(true);
  });
});

describe('PollinationsAIProvider', () => {
  it('posts OpenAI-compatible messages and returns parsed JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"choices":[]}', { status: 200 }));
    const provider = new PollinationsAIProvider({ endpoint: 'https://example.test/v1/chat/completions', model: 'openai' }, fetchMock);
    await expect(provider.complete({ system: 'system', user: 'user' })).resolves.toEqual({ choices: [] });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'openai', messages: [{ role: 'system' }, { role: 'user' }] });
  });

  it('reports non-2xx and invalid JSON responses', async () => {
    const httpProvider = new PollinationsAIProvider({ endpoint: 'x', model: 'm' }, vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 })));
    await expect(httpProvider.complete({ system: '', user: '' })).rejects.toMatchObject({ code: 'http', status: 503 });
    const invalidProvider = new PollinationsAIProvider({ endpoint: 'x', model: 'm' }, vi.fn<typeof fetch>().mockResolvedValue(new Response('not-json', { status: 200 })));
    await expect(invalidProvider.complete({ system: '', user: '' })).rejects.toMatchObject({ code: 'invalid-json' });
  });

  it('uses a finite timeout', async () => {
    vi.useFakeTimers();
    const neverFetch = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const provider = new PollinationsAIProvider({ endpoint: 'x', model: 'm', timeoutMs: 10 }, neverFetch);
    const completion = provider.complete({ system: '', user: '' });
    const expectation = expect(completion).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(10);
    await expectation;
    vi.useRealTimers();
  });
});

describe('AI response boundary', () => {
  it('extracts JSON and filters commands through parser and supported families', () => {
    const raw = { explanation: 'Inspect the state.', commands: [
      { command: 'git status', purpose: 'Inspect', risk: 'safe' },
      { command: 'git reset --hard HEAD', purpose: 'Reset', risk: 'destructive' },
      { command: 'rm -rf .git', purpose: 'No', risk: 'destructive' },
    ] };
    const extracted = extractOpenAICompatibleResponse({ choices: [{ message: { content: JSON.stringify(raw) } }] });
    expect(validateTutorResponse(extracted, ['status'])).toEqual({
      explanation: 'Inspect the state.',
      commands: [{ command: 'git status', purpose: 'Inspect', risk: 'safe' }],
    });
  });

  it('rejects excessive output sizes and array counts', () => {
    expect(() => validateTutorResponse({ explanation: 'x'.repeat(4_001), commands: [] }, [])).toThrow();
    expect(() => validateTutorResponse({ explanation: 'ok', commands: Array(6).fill({ command: 'git status', purpose: 'p', risk: 'safe' }) }, ['status'])).toThrow();
  });

  it('derives command risk from the deterministic catalog instead of model claims', () => {
    const response = validateTutorResponse({
      explanation: 'Review this carefully.',
      commands: [{ command: 'git reset --hard HEAD', purpose: 'Reset', risk: 'safe' }],
    }, ['reset']);
    expect(response.commands[0]?.risk).toBe('destructive');
  });
});

describe('AI tutor orchestration', () => {
  it('falls back deterministically and never mutates GitState', async () => {
    const state: GitState = writeWorkingFile(createInitializedState(), 'app.ts', 'private contents');
    const before = structuredClone(state);
    const provider = { complete: vi.fn().mockRejectedValue(new Error('offline')) };
    const first = await requestTutorResponse({ provider, state, context: contextOptions, question: 'What next?' });
    const second = await requestTutorResponse({ provider, state, context: contextOptions, question: 'What next?' });
    expect(first.source).toBe('offline');
    expect(first.response).toEqual(second.response);
    expect(first.response.commands[0]?.command).toBe('git add "app.ts"');
    expect(state).toEqual(before);
  });
});
