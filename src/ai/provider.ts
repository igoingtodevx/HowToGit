export interface AIProvider {
  complete(request: { system: string; user: string; signal?: AbortSignal }): Promise<unknown>;
}

export type AIProviderErrorCode = 'aborted' | 'timeout' | 'http' | 'invalid-json' | 'network';

export class AIProviderError extends Error {
  constructor(
    public readonly code: AIProviderErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export interface PollinationsProviderConfig {
  endpoint: string;
  model: string;
  timeoutMs?: number;
}

type AIEnvironment = Partial<Record<'VITE_AI_ENDPOINT' | 'VITE_AI_MODEL', string>>;

const DEFAULT_ENDPOINT = 'https://gen.pollinations.ai/v1/chat/completions';
const DEFAULT_MODEL = 'openai';
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 60_000;

export const readAIProviderConfig = (
  environment: AIEnvironment = import.meta.env as unknown as AIEnvironment,
): PollinationsProviderConfig => ({
  endpoint: environment.VITE_AI_ENDPOINT?.trim() || DEFAULT_ENDPOINT,
  model: environment.VITE_AI_MODEL?.trim() || DEFAULT_MODEL,
  timeoutMs: DEFAULT_TIMEOUT_MS,
});

const finiteTimeout = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.floor(value), MAX_TIMEOUT_MS);
};

export class PollinationsAIProvider implements AIProvider {
  private readonly timeoutMs: number;

  constructor(
    private readonly config: PollinationsProviderConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {
    this.timeoutMs = finiteTimeout(config.timeoutMs);
  }

  async complete(request: { system: string; user: string; signal?: AbortSignal }): Promise<unknown> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const forwardAbort = (): void => controller.abort(request.signal?.reason);
    request.signal?.addEventListener('abort', forwardAbort, { once: true });
    if (request.signal?.aborted) forwardAbort();

    try {
      const response = await this.fetchImplementation(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) {
        throw new AIProviderError('http', `AI provider returned HTTP ${response.status}.`, response.status);
      }
      try {
        return await response.json() as unknown;
      } catch {
        throw new AIProviderError('invalid-json', 'AI provider returned invalid JSON.');
      }
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      if (controller.signal.aborted) {
        throw new AIProviderError(timedOut ? 'timeout' : 'aborted', timedOut ? 'AI request timed out.' : 'AI request was cancelled.');
      }
      throw new AIProviderError('network', error instanceof Error ? error.message : 'AI provider request failed.');
    } finally {
      globalThis.clearTimeout(timeout);
      request.signal?.removeEventListener('abort', forwardAbort);
    }
  }
}

export const createPollinationsAIProvider = (
  config: PollinationsProviderConfig = readAIProviderConfig(),
  fetchImplementation: typeof fetch = fetch,
): AIProvider => new PollinationsAIProvider(config, fetchImplementation);
