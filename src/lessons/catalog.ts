import lessonsJson from '../../curriculum/lessons.json';
import challengesJson from '../../curriculum/challenges.json';
import confirmJson from '../../curriculum/confirm.json';
import demosJson from '../../curriculum/demo-scripts.json';
import scenariosJson from '../../curriculum/scenarios.json';
import en from '../i18n/en.json';
import de from '../i18n/de.json';
import { validatorRegistry } from './validators';
import type { ChallengeDefinition, ConfirmQuestion, DemoScript, LessonDefinition, LessonId, LessonRuntimeDefinition, ScenarioDefinition } from './types';

const lessonIdPattern = /^(?:b|a)(?:0[1-9]|10)$/;
const asLessonId = (value: unknown): LessonId => {
  if (typeof value !== 'string' || !lessonIdPattern.test(value)) throw new Error(`Invalid lesson id: ${String(value)}`);
  return value as LessonId;
};

const lessons = lessonsJson.map((raw): LessonDefinition => {
  const id = asLessonId(raw.id);
  const conceptual = id === 'a08' || id === 'a09' || id === 'a10';
  if (raw.conceptual !== conceptual) throw new Error(`${id} must be honestly labeled conceptual=${conceptual}`);
  return {
    ...raw, id, track: raw.track as LessonDefinition['track'], scenarioId: raw.scenarioId as LessonDefinition['scenarioId'],
    validatorId: raw.validatorId as LessonDefinition['validatorId'],
    interaction: { terminal: !conceptual, files: ['b02', 'b05', 'b07', 'b09', 'a03', 'a06'].includes(id), concepts: conceptual },
  };
});

if (lessons.length !== 20 || lessons.filter((lesson) => lesson.conceptual).map((lesson) => lesson.id).join(',') !== 'a08,a09,a10') {
  throw new Error('Curriculum must contain 20 lessons and exactly a08-a10 must be conceptual');
}

const challengeMap = new Map(challengesJson.map((raw) => [asLessonId(raw.lessonId), raw as ChallengeDefinition]));
const demoMap = new Map(demosJson.map((raw) => [asLessonId(raw.lessonId), raw as DemoScript]));
const scenarioMap = new Map(scenariosJson.map((raw) => [raw.id, raw as ScenarioDefinition]));
const confirmMap = new Map(confirmJson.map((raw) => [asLessonId(raw.lessonId), raw as { lessonId: LessonId; questions: ConfirmQuestion[] }]));

export const challengeCatalog: readonly ChallengeDefinition[] = Object.freeze([...challengeMap.values()]);
export const demoScriptCatalog: readonly DemoScript[] = Object.freeze([...demoMap.values()]);
export const scenarioCatalog: readonly ScenarioDefinition[] = Object.freeze([...scenarioMap.values()]);

const translations = { en: en.lessons, de: de.lessons } as const;

const resolveKey = (catalog: Record<string, unknown>, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, catalog);
  return typeof value === 'string' ? value : undefined;
};

export const lessonCatalog: readonly LessonRuntimeDefinition[] = Object.freeze(lessons.map((lesson) => {
  const challenge = challengeMap.get(lesson.id); const demo = demoMap.get(lesson.id); const scenario = scenarioMap.get(lesson.scenarioId);
  const englishHints = translations.en[lesson.id].hints; const germanHints = translations.de[lesson.id].hints;
  const validator = validatorRegistry[lesson.validatorId];
  if (!challenge || !demo || !scenario || !validator) throw new Error(`Incomplete curriculum adapter for ${lesson.id}`);
  if (englishHints.length !== 3 || germanHints.length !== 3) throw new Error(`${lesson.id} must have exactly three EN and DE hints`);
  const confirm = confirmMap.get(lesson.id)?.questions ?? [];
  for (const question of confirm) {
    if (question.kind === 'choice' && (question.correctIndex === undefined || question.correctIndex < 0 || question.correctIndex >= question.optionCount)) {
      throw new Error(`${lesson.id} confirm question ${question.id} needs a valid correctIndex`);
    }
    if (question.kind === 'order' && (!question.correctOrder || question.correctOrder.length !== question.optionCount)) {
      throw new Error(`${lesson.id} confirm question ${question.id} needs a full correctOrder`);
    }
    for (let index = 0; index < question.optionCount; index += 1) {
      if (!resolveKey(en as unknown as Record<string, unknown>, `confirm.${question.id}.option.${index}`)) {
        throw new Error(`Missing EN copy for confirm.${question.id}.option.${index}`);
      }
      if (!resolveKey(de as unknown as Record<string, unknown>, `confirm.${question.id}.option.${index}`)) {
        throw new Error(`Missing DE copy for confirm.${question.id}.option.${index}`);
      }
    }
  }
  return { ...lesson, challenge, demo, scenario, validator, hints: { en: englishHints as [string, string, string], de: germanHints as [string, string, string] }, confirm };
}));

export const lessonsById: Readonly<Record<LessonId, LessonRuntimeDefinition>> = Object.freeze(
  Object.fromEntries(lessonCatalog.map((lesson) => [lesson.id, lesson])) as Record<LessonId, LessonRuntimeDefinition>,
);

export const beginnerLessons = lessonCatalog.filter((lesson) => lesson.track === 'beginner');
export const advancedLessons = lessonCatalog.filter((lesson) => lesson.track === 'advanced');

export function getLesson(id: LessonId): LessonRuntimeDefinition { return lessonsById[id]; }
