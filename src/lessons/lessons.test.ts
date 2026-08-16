import { describe, expect, it } from 'vitest';
import { createGitState, validateState } from '../../engine';
import {
  createDemoRuntime,
  createConceptualDemoRuntime,
  createLessonScenario,
  emptyLessonInteractions,
  executableLessonIds,
  lessonCatalog,
  recordConceptAnswer,
  runLessonDemo,
  validatorRegistry,
} from '.';

describe('curriculum catalog', () => {
  it('adapts all 20 complete bilingual lesson definitions', () => {
    expect(lessonCatalog).toHaveLength(20);
    expect(new Set(lessonCatalog.map((lesson) => lesson.id)).size).toBe(20);
    for (const lesson of lessonCatalog) {
      expect(lesson.scenario.id).toBe(lesson.scenarioId);
      expect(lesson.challenge.lessonId).toBe(lesson.id);
      expect(lesson.demo.lessonId).toBe(lesson.id);
      expect(lesson.hints.en).toHaveLength(3);
      expect(lesson.hints.de).toHaveLength(3);
      expect(lesson.validator).toBe(validatorRegistry[lesson.validatorId]);
    }
  });

  it('labels exactly a08-a10 as conceptual', () => {
    expect(lessonCatalog.filter((lesson) => lesson.conceptual).map((lesson) => lesson.id)).toEqual(['a08', 'a09', 'a10']);
    expect(lessonCatalog.filter((lesson) => lesson.conceptual).every((lesson) => !lesson.interaction.terminal && lesson.interaction.concepts)).toBe(true);
  });
});

describe('scenario factory', () => {
  it('creates valid deterministic isolated states for every executable lesson', () => {
    expect(executableLessonIds).toHaveLength(17);
    for (const lessonId of executableLessonIds) {
      const first = createLessonScenario(lessonId);
      const second = createLessonScenario(lessonId);
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
      expect(validateState(first!)).toEqual([]);
    }
  });

  it('does not pretend conceptual lessons have executable Git states', () => {
    expect(createLessonScenario('a08')).toBeNull();
    expect(createLessonScenario('a09')).toBeNull();
    expect(createLessonScenario('a10')).toBeNull();
    expect(createConceptualDemoRuntime('a08')).toMatchObject({ conceptual: true, state: null });
  });
});

describe('demo runner and validators', () => {
  it('runs terminal demo steps through the engine without command failures', () => {
    for (const lessonId of executableLessonIds) {
      const runtime = runLessonDemo(lessonId);
      expect(validateState(runtime.state), lessonId).toEqual([]);
      expect(runtime.lastCommand?.success ?? true, lessonId).toBe(true);
    }
  });

  it('uses real file state actions and records deterministic interaction flags', () => {
    const firstCommit = runLessonDemo('b02');
    expect(firstCommit.state.commits[firstCommit.state.branches.main.target!].tree['app.ts'].content).toBe('console.log("hello");\n');

    const stash = runLessonDemo('b09');
    expect(stash.interaction).toMatchObject({ stashCreated: true, stashInspected: true, stashRestored: true });
    expect(lessonCatalog.find((lesson) => lesson.id === 'b09')!.validator(stash).complete).toBe(true);

    const history = runLessonDemo('b03');
    expect(history.interaction.logExecuted).toBe(true);
    expect(lessonCatalog.find((lesson) => lesson.id === 'b03')!.validator(history).complete).toBe(true);

    const interactive = runLessonDemo('a01');
    expect(interactive.lastCommand?.effects.some((effect) => effect.type === 'COMMITS_REPLAYED')).toBe(true);
    expect(Object.values(interactive.state.commits).some((commit) => commit.message === 'Polished feature history')).toBe(true);
  });

  it('every demo script is a valid learner path that satisfies its own validator', () => {
    for (const lessonId of executableLessonIds) {
      const runtime = runLessonDemo(lessonId);
      const lesson = lessonCatalog.find((entry) => entry.id === lessonId)!;
      const validation = lesson.validator(runtime);
      expect(validation.complete, `${lessonId}: ${JSON.stringify(validation.remaining)}`).toBe(true);
    }
  });

  it('keeps validators pure and supports deterministic conceptual answers', () => {
    const runtime = createDemoRuntime('b01');
    const before = structuredClone(runtime);
    lessonCatalog[0].validator(runtime);
    expect(runtime).toEqual(before);

    const state = createGitState();
    const base = { lessonId: 'b01' as const, state, initialState: state, interaction: emptyLessonInteractions() };
    const answered = recordConceptAnswer(base, 'internalsOrder', ['blob', 'tree', 'commit', 'ref']);
    expect(validatorRegistry['validator-internals-concept'](answered).complete).toBe(true);
  });
});
