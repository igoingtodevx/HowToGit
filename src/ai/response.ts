import type { GitTutorResponse, TutorCommandSuggestion } from '../../ai/schemas';
import { parseCommand } from '../../engine/commandParser';
import { riskForCommand } from '../../engine/preview';

export const TUTOR_RESPONSE_LIMITS = Object.freeze({
  explanation: 4_000,
  diagnosis: 2_000,
  commands: 5,
  command: 240,
  purpose: 500,
  concepts: 12,
  concept: 100,
  nextQuestion: 500,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const boundedString = (value: unknown, maximum: number, allowEmpty = false): value is string =>
  typeof value === 'string' && (allowEmpty || value.length > 0) && value.length <= maximum;
const isRisk = (value: unknown): value is TutorCommandSuggestion['risk'] =>
  value === 'safe' || value === 'caution' || value === 'destructive';

export class InvalidTutorResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTutorResponseError';
  }
}

export const extractOpenAICompatibleResponse = (envelope: unknown): unknown => {
  if (!isRecord(envelope) || !Array.isArray(envelope.choices) || !isRecord(envelope.choices[0])) {
    throw new InvalidTutorResponseError('AI response is not an OpenAI-compatible envelope.');
  }
  const message = envelope.choices[0].message;
  if (!isRecord(message) || typeof message.content !== 'string') {
    throw new InvalidTutorResponseError('AI response does not contain text message content.');
  }
  try {
    return JSON.parse(message.content) as unknown;
  } catch {
    throw new InvalidTutorResponseError('AI message content is not valid JSON.');
  }
};

const validSuggestionShape = (value: unknown): value is TutorCommandSuggestion => isRecord(value)
  && boundedString(value.command, TUTOR_RESPONSE_LIMITS.command)
  && boundedString(value.purpose, TUTOR_RESPONSE_LIMITS.purpose)
  && isRisk(value.risk);

const isValidResponseShape = (value: unknown): value is GitTutorResponse => {
  if (!isRecord(value) || !boundedString(value.explanation, TUTOR_RESPONSE_LIMITS.explanation)) return false;
  if (value.diagnosis !== undefined && !boundedString(value.diagnosis, TUTOR_RESPONSE_LIMITS.diagnosis, true)) return false;
  if (!Array.isArray(value.commands) || value.commands.length > TUTOR_RESPONSE_LIMITS.commands || !value.commands.every(validSuggestionShape)) return false;
  if (value.concepts !== undefined && (
    !Array.isArray(value.concepts)
    || value.concepts.length > TUTOR_RESPONSE_LIMITS.concepts
    || !value.concepts.every((concept) => boundedString(concept, TUTOR_RESPONSE_LIMITS.concept))
  )) return false;
  return value.nextQuestion === undefined || boundedString(value.nextQuestion, TUTOR_RESPONSE_LIMITS.nextQuestion, true);
};

export const validateTutorResponse = (
  value: unknown,
  supportedCommandFamilies: readonly string[],
): GitTutorResponse => {
  if (!isValidResponseShape(value)) throw new InvalidTutorResponseError('AI response failed runtime validation.');
  const supported = new Set(supportedCommandFamilies);
  const commands = value.commands.filter((suggestion) => {
    const parsed = parseCommand(suggestion.command);
    return parsed.success && supported.has(parsed.command.kind);
  }).map((suggestion) => Object.freeze({ ...suggestion, risk: riskForCommand(suggestion.command) }));
  return Object.freeze({
    explanation: value.explanation,
    ...(value.diagnosis !== undefined ? { diagnosis: value.diagnosis } : {}),
    commands: Object.freeze(commands) as unknown as TutorCommandSuggestion[],
    ...(value.concepts !== undefined ? { concepts: Object.freeze([...value.concepts]) as unknown as string[] } : {}),
    ...(value.nextQuestion !== undefined ? { nextQuestion: value.nextQuestion } : {}),
  });
};
