# AI Tutor Contract

## Rule

The tutor explains/proposes. The deterministic simulator decides/mutates.

## Context

Bounded snapshot should contain:

- locale (`en|de`);
- mode (`noob|pro`);
- intent;
- current lesson objective/concepts;
- initialized/current branch/detached HEAD/head commit;
- branch tips;
- recent commits only;
- working/index statuses;
- conflicts;
- remotes/tracking summary;
- recent commands/errors;
- supported command families.

Do not dump unlimited state.

## Response

```ts
interface GitTutorResponse {
  explanation: string;
  diagnosis?: string;
  commands: Array<{
    command: string;
    purpose: string;
    risk: 'safe' | 'caution' | 'destructive';
  }>;
  concepts?: string[];
  nextQuestion?: string;
}
```

Treat external output as `unknown`, validate shape/length/enums and only expose command actions for valid suggestions.

## Intents

- ASK_GIT
- EXPLAIN_SELECTION
- DIAGNOSE_STATE
- FIX_REPO
- EXPLAIN_MISTAKE
- PREVIEW_COMMAND

## Noob behavior

- short;
- define jargon in place;
- anchor explanations in Working Tree → Staging → Repository;
- prefer one safe next action;
- do not reveal challenge solution before strongest hint.

## Pro behavior

Compact and exact. Mention history-rewrite/data-loss/collaboration implications.

## Provider failure

Retry/dismiss. Core lab and deterministic explanations remain functional.
