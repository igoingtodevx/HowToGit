# AI Provider Contract

```ts
export interface AIProvider {
  complete(request: { system: string; user: string; signal?: AbortSignal }): Promise<unknown>;
}
```

Provider output is deliberately `unknown`.

Use the requested Pollinations OpenAI-compatible text endpoint behind one provider/config file. Treat endpoint/model availability as external and fallible.

Required network behavior:
- AbortController timeout;
- cancellation on replacement/unmount;
- non-2xx handling;
- invalid JSON handling;
- retry affordance;
- no infinite retries.

Send only the minimum useful simulator snapshot. Never send unrelated app/localStorage/device data.

If provider fails, the terminal, engine, lessons, validators and deterministic beginner explanations remain functional.
