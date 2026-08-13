import { buildTutorSystemPrompt } from '../../ai/systemPrompt';
import type { GitTutorResponse } from '../../ai/schemas';
import type { GitState } from '../../engine/types';
import { serializeTutorContext, type TutorContextOptions } from './context';
import type { AIProvider } from './provider';
import { extractOpenAICompatibleResponse, validateTutorResponse } from './response';

export interface TutorRequest {
  provider: AIProvider;
  state: GitState;
  context: TutorContextOptions;
  question: string;
  signal?: AbortSignal;
}

export interface TutorResult {
  response: GitTutorResponse;
  source: 'provider' | 'offline';
  error?: Error;
}

export const buildOfflineTutorResponse = (
  context: ReturnType<typeof serializeTutorContext>,
): GitTutorResponse => {
  const de = context.locale === 'de';
  let command = 'git status';
  let explanation = de
    ? 'Der KI-Tutor ist gerade nicht erreichbar. Der Git-Simulator funktioniert weiterhin vollständig.'
    : 'The AI tutor is currently unavailable. The Git simulator remains fully functional.';
  if (!context.repo.initialized) {
    command = 'git init';
    explanation += de ? ' Initialisiere zuerst das Repository.' : ' Initialize the repository first.';
  } else if (context.repo.conflicts.some((conflict) => !conflict.resolved)) {
    explanation += de ? ' Prüfe zuerst die vorhandenen Konflikte.' : ' Inspect the existing conflicts first.';
  } else if (context.repo.staged.length > 0) {
    command = 'git commit -m "checkpoint"';
    explanation += de ? ' Es liegen bereits Änderungen in der Staging Area.' : ' Changes are already in the staging area.';
  } else if (context.repo.workingTree.length > 0) {
    const path = context.repo.workingTree[0]?.path ?? '.';
    command = `git add ${JSON.stringify(path.slice(0, 220))}`;
    explanation += de ? ' Im Working Tree gibt es noch nicht gestagte Änderungen.' : ' The working tree has unstaged changes.';
  }
  const family = command.split(/\s+/)[1] ?? '';
  const commands = context.supportedCommandFamilies.includes(family)
    ? [{ command, purpose: de ? 'Sicherer nächster Schritt im Simulator.' : 'Safe next step in the simulator.', risk: 'safe' as const }]
    : [];
  return { explanation, commands };
};

export const requestTutorResponse = async (request: TutorRequest): Promise<TutorResult> => {
  const context = serializeTutorContext(request.state, request.context);
  try {
    const envelope = await request.provider.complete({
      system: buildTutorSystemPrompt(context.locale, context.mode),
      user: JSON.stringify({ question: request.question.slice(0, 2_000), context }),
      signal: request.signal,
    });
    const response = validateTutorResponse(
      extractOpenAICompatibleResponse(envelope),
      context.supportedCommandFamilies,
    );
    return { response, source: 'provider' };
  } catch (error) {
    return {
      response: buildOfflineTutorResponse(context),
      source: 'offline',
      error: error instanceof Error ? error : new Error('Unknown AI provider failure.'),
    };
  }
};
