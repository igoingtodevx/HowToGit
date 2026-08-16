import { useEffect, useMemo, useRef, useState } from 'react';
import type { GitEffect } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';
import { getLesson, validateLesson, createLessonScenario, type LessonId } from '../lessons';
import type { LessonStage } from '../application/appState';
import { Mentor, type MentorEvent } from '../mentor/mentor';

const STAGES: readonly LessonStage[] = ['learn', 'try', 'see', 'confirm', 'done'];

const stageIndexOf = (stage: LessonStage): number => STAGES.indexOf(stage);

/** Lessons where the learner's first physical action happens in the file editor. */
const EDITOR_FIRST: readonly string[] = ['b02', 'b05'];

interface FlowProps {
  onSelectLesson: (lessonId: LessonId) => void;
  onFocusTerminal: () => void;
}

export function BeginnerFlow({ onSelectLesson, onFocusTerminal }: FlowProps) {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const id = state.activeLessonId as LessonId;
  const lesson = getLesson(id);
  const flow = state.flow;
  const conceptual = lesson.conceptual;

  const initialState = conceptual ? null : createLessonScenario(id);
  const validation = conceptual
    ? validateLesson(lesson.validatorId, { state: state.git, initialState: state.git, interaction: state.interaction })
    : initialState
      ? validateLesson(lesson.validatorId, { state: state.git, initialState, interaction: state.interaction })
      : null;

  const satisfiedCount = validation?.satisfied.length ?? 0;
  const totalCount = validation ? validation.satisfied.length + validation.remaining.length : 0;

  // Complete the lesson once the mission is satisfied during the Try stage.
  const completedFor = useRef<string | null>(null);
  useEffect(() => {
    if (flow.stage !== 'try' || !validation?.complete) return;
    if (completedFor.current === id) return;
    completedFor.current = id;
    const previous = state.progress[id];
    const firstCompletion = !previous?.completed;
    const milestone: 'b05' | 'b10' | undefined = firstCompletion && (id === 'b05' || id === 'b10') ? id : undefined;
    dispatch({
      type: 'progress/updated',
      progress: {
        lessonId: id,
        completed: true,
        attempts: (previous?.attempts ?? 0) + 1,
        hintsUsed: flow.hintCount,
        perfect: flow.hintCount === 0,
      },
    });
    dispatch({ type: 'flow/stage', stage: 'see' });
    if (milestone) dispatch({ type: 'flow/reset', flow: { celebrateKey: milestone } });
  }, [dispatch, flow.hintCount, flow.stage, id, state.progress, validation?.complete]);

  // Track failures and stalled success (valid command, mission unmoved) for mentor reactions.
  const [stalled, setStalled] = useState(false);
  const previousSatisfied = useRef(satisfiedCount);
  const terminalLength = state.terminal.length;
  useEffect(() => {
    const last = state.terminal[terminalLength - 1];
    if (!last) return;
    if (!last.success) setStalled(false);
    else if (flow.stage === 'try' && satisfiedCount === previousSatisfied.current) setStalled(true);
    else setStalled(false);
    previousSatisfied.current = satisfiedCount;
  }, [terminalLength, satisfiedCount, flow.stage, state.terminal]);

  const failures = state.terminal.filter((entry) => !entry.success).length;
  const successes = state.terminal.filter((entry) => entry.success).length;

  const mentorEvent: MentorEvent = useMemo(() => {
    if (flow.stage === 'learn') return { kind: 'intro', lessonId: id };
    if (flow.stage === 'see') return flow.celebrateKey ? { kind: 'milestone', lessonId: flow.celebrateKey } : { kind: 'line', tone: 'see' };
    if (flow.stage === 'done') return { kind: 'line', tone: 'done' };
    if (flow.stage === 'confirm') return { kind: 'line', tone: 'takeaway' };
    const last = state.terminal[state.terminal.length - 1];
    if (last && !last.success) {
      if (last.explanationKey === 'errors.notGit') return { kind: 'wrong', reason: 'notGit' };
      if (failures >= 2) return { kind: 'wrong', reason: 'stuck' };
      return { kind: 'wrong', reason: 'generic' };
    }
    if (stalled) return { kind: 'wrong', reason: 'noProgress' };
    if (last && last.success) return { kind: 'success', context: successes <= 1 ? 'first' : 'next' };
    return { kind: 'intro', lessonId: id };
  }, [flow.stage, flow.celebrateKey, id, state.terminal, failures, successes, stalled]);

  const startChallenge = () => {
    dispatch({ type: 'flow/stage', stage: 'try' });
    onFocusTerminal();
  };

  const revealHint = () => dispatch({ type: 'flow/hintRevealed' });
  const hasConflict = state.git.operation !== null;
  const actionSurface: 'terminal' | 'editor' | 'conflict' = hasConflict ? 'conflict'
    : EDITOR_FIRST.includes(id) && state.git.operation === null && totalCount > satisfiedCount ? 'editor' : 'terminal';

  const allQuestionsCorrect = lesson.confirm.length > 0 && lesson.confirm.every((question) => {
    const answer = flow.confirmAnswers[question.id];
    if (question.kind === 'choice') return typeof answer === 'number' && answer === question.correctIndex;
    return Array.isArray(answer) && question.correctOrder !== undefined && String(answer) === String(question.correctOrder);
  });

  const nextLesson = lesson.track === 'beginner'
    ? (Number(id.slice(1)) < 10 ? `b${String(Number(id.slice(1)) + 1).padStart(2, '0')}` as LessonId : null)
    : (Number(id.slice(1)) < 10 ? `a${String(Number(id.slice(1)) + 1).padStart(2, '0')}` as LessonId : null);

  const visibleStages = conceptual ? (['learn', 'confirm', 'done'] as const) : STAGES;

  return (
    <section className="beginner-flow" id="learn" aria-labelledby="lesson-title">
      <div className="lesson-meta">
        <span>{t(`nav.${lesson.track}`)} · {id.slice(1)}</span>
        {conceptual && <b>{t('ui.conceptualLabel')}</b>}
      </div>
      <h1 id="lesson-title">{t(`lessons.${id}.title`)}</h1>

      <ol className="flow-stepper" aria-label={t('flow.stepOf', { n: stageIndexOf(flow.stage) + 1, total: STAGES.length })}>
        {STAGES.map((stage) => {
          const reached = stageIndexOf(flow.stage) >= stageIndexOf(stage);
          const active = flow.stage === stage;
          const hidden = conceptual && !visibleStages.includes(stage as typeof visibleStages[number]);
          return (
            <li key={stage} className={`${active ? 'step-active' : ''}${reached ? 'step-reached' : ''}${hidden ? 'step-hidden' : ''}`} aria-current={active ? 'step' : undefined}>
              <span className="step-dot" aria-hidden="true">{reached && stage !== 'try' ? '✓' : stageIndexOf(stage) + 1}</span>
              <span className="step-label"><b>{t(`flow.${stage}`)}</b><small>{t(`flow.stepDesc.${stage}`)}</small></span>
            </li>
          );
        })}
      </ol>

      <Mentor event={mentorEvent} live={flow.stage === 'try'} />

      {flow.stage === 'learn' && (
        <div className="flow-stage flow-learn">
          <article className="flow-card">
            <h2>{t('flow.scenarioTitle')}</h2>
            <p>{t(`lessons.${id}.scenario`)}</p>
          </article>
          <article className="flow-card">
            <h2>{t('lesson.mentalModel')}</h2>
            <p>{t(`lessons.${id}.mentalModel`)}</p>
            <p className="flow-why">{t('lesson.why')}: {t(`lessons.${id}.why`)}</p>
          </article>
          {!conceptual && (
            <article className="flow-card">
              <h2>{t('flow.commandTitle')}</h2>
              <p>{t(`lessons.${id}.commandIntro`)}</p>
              <div className="command-chips" aria-label={t('flow.commandTitle')}>
                {lesson.commands.map((command) => <code key={command}>{command}</code>)}
              </div>
            </article>
          )}
          {lesson.concepts.length > 0 && (
            <ul className="concept-chips" aria-label={t('flow.youWillLearn')}>
              {lesson.concepts.map((concept) => <li key={concept}><span aria-hidden="true">+</span>{t(`concepts.${concept}`)}</li>)}
            </ul>
          )}
          <button className="primary-button flow-cta" type="button" onClick={startChallenge}>
            {conceptual ? t('flow.checkUnderstanding') : t('flow.startChallenge')}
          </button>
        </div>
      )}

      {flow.stage === 'try' && (
        <div className="flow-stage flow-try">
          <article className="mission-card" aria-label={t('flow.mission')}>
            <p className="mission-kicker">{t('flow.mission')}</p>
            <strong>{lesson.challenge.goal[state.locale]}</strong>
            {validation && (
              <ul className="criteria-list" aria-label={t('flow.criteriaTitle')}>
                {[...validation.satisfied, ...validation.remaining].map((item, index) => {
                  const done = index < validation.satisfied.length;
                  return (
                    <li key={item.key} className={done ? 'criteria-done' : 'criteria-open'}>
                      <span className="criteria-mark" aria-hidden="true">{done ? '✓' : '○'}</span>
                      {t(item.labelKey)}
                    </li>
                  );
                })}
              </ul>
            )}
            {validation?.feedbackKey && <p className="criteria-feedback">{t(validation.feedbackKey)}</p>}
            <p className="where-to-act" aria-live="polite">
              <span aria-hidden="true">☞</span>
              {actionSurface === 'editor' ? t('flow.whereEditor') : actionSurface === 'conflict' ? t('flow.whereConflict') : t('flow.whereTerminal')}
            </p>
          </article>

          <div className="hint-box">
            <div>
              {flow.hintCount === 0
                ? <p>{t('ui.hintIntro')}</p>
                : (
                  <ol className="hint-list">
                    {Array.from({ length: flow.hintCount }, (_, index) => (
                      <li key={index}><span aria-hidden="true">{index + 1}.</span>{t(`lessons.${id}.hints[${index}]`)}</li>
                    ))}
                  </ol>
                )}
            </div>
            <button type="button" onClick={revealHint} disabled={flow.hintCount >= 3}>
              {t('lesson.hint')} {Math.min(3, flow.hintCount + 1)}/3
            </button>
          </div>
          <button className="ghost-button flow-restart" type="button" onClick={() => { const scenario = createLessonScenario(id); if (scenario) dispatch({ type: 'lesson/restarted', lessonId: id, git: scenario }); }}>
            {t('lesson.restart')}
          </button>
        </div>
      )}

      {flow.stage === 'see' && (
        <div className="flow-stage flow-see">
          {flow.celebrateKey && (
            <Celebration kind={flow.celebrateKey} perfect={state.progress[id]?.perfect} />
          )}
          <article className="flow-card">
            <h2>{t('flow.whatChangedTitle')}</h2>
            <EffectExplanations effects={state.effects} />
          </article>
          <article className="flow-card flow-takeaway">
            <h2>{t('flow.takeawayTitle')}</h2>
            <p>{t(`lessons.${id}.takeaway`)}</p>
          </article>
          <button className="primary-button flow-cta" type="button" onClick={() => dispatch({ type: 'flow/stage', stage: 'confirm' })}>
            {t('flow.checkUnderstanding')}
          </button>
        </div>
      )}

      {flow.stage === 'confirm' && (
        <div className="flow-stage flow-confirm">
          {conceptual ? <ConceptualExercise id={id as 'a08' | 'a09' | 'a10'} />
            : (
              <>
                {lesson.confirm.map((question, questionIndex) => (
                  <ConfirmQuestionCard key={question.id} questionIndex={questionIndex} total={lesson.confirm.length} />
                ))}
                {lesson.confirm.length === 0 && <p className="flow-no-questions">{t('lesson.complete')}</p>}
                <button className="primary-button flow-cta" type="button" disabled={!allQuestionsCorrect} onClick={() => dispatch({ type: 'flow/stage', stage: 'done' })}>
                  {t('flow.finishLesson')}
                </button>
              </>
            )}
        </div>
      )}

      {flow.stage === 'done' && (
        <div className="flow-stage flow-done">
          <div className="done-mark" aria-hidden="true">✓</div>
          <p className="done-title">{t('celebration.lesson.title')}</p>
          {state.progress[id]?.perfect && <p className="done-perfect">{t('celebration.perfect')}</p>}
          <p className="done-takeaway">{t(`lessons.${id}.takeaway`)}</p>
          <div className="flow-done-actions">
            {nextLesson && (
              <button className="primary-button" type="button" onClick={() => onSelectLesson(nextLesson)}>
                {t('flow.nextLesson', { title: t(`lessons.${nextLesson}.title`) })}
              </button>
            )}
            <button className="ghost-button" type="button" onClick={() => { const scenario = createLessonScenario(id); if (scenario) dispatch({ type: 'lesson/restarted', lessonId: id, git: scenario }); }}>
              {t('flow.doItAgain')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function EffectExplanations({ effects }: { effects: readonly GitEffect[] }) {
  const { t } = useI18n();
  const types = [...new Set(effects.map((effect) => effect.type))];
  if (types.length === 0) return <p className="flow-no-effects">{t('ui.nothingHere')}</p>;
  return (
    <ul className="effect-list">
      {types.map((type) => <li key={type}><span aria-hidden="true">↳</span>{t(`effects.${type}`)}</li>)}
    </ul>
  );
}

function Celebration({ kind, perfect }: { kind: 'b05' | 'b10'; perfect?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`celebration celebration-${kind}`} role="status">
      <span className="celebration-mark" aria-hidden="true">{kind === 'b05' ? '✦' : '★'}</span>
      <div>
        <strong>{t(`celebration.${kind === 'b05' ? 'halfway' : 'course'}.title`)}</strong>
        <p>{t(`celebration.${kind === 'b05' ? 'halfway' : 'course'}.body`)}</p>
        {perfect && <p className="celebration-perfect">{t('celebration.perfect')}</p>}
      </div>
    </div>
  );
}

function ConfirmQuestionCard({ questionIndex, total }: { questionIndex: number; total: number }) {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const id = state.activeLessonId as LessonId;
  const lesson = getLesson(id);
  const question = lesson.confirm[questionIndex];
  const answer = state.flow.confirmAnswers[question.id];
  const isCorrect = question.kind === 'choice'
    ? typeof answer === 'number' && answer === question.correctIndex
    : Array.isArray(answer) && question.correctOrder !== undefined && String(answer) === String(question.correctOrder);
  const answered = answer !== undefined;

  return (
    <article className="confirm-question" aria-label={t('flow.checkUnderstanding')}>
      <p className="question-kicker">{t('flow.questionOf', { n: questionIndex + 1, total })}</p>
      <h2>{t(`confirm.${question.id}.prompt`)}</h2>
      <div className="concept-options">
        {Array.from({ length: question.optionCount }, (_, index) => {
          const chosen = answer === index || (Array.isArray(answer) && answer.length > 0 && answer[answer.length - 1] === index);
          return (
            <button
              key={index}
              type="button"
              className={`${chosen && !isCorrect ? 'option-wrong' : ''}${chosen && isCorrect ? 'option-correct' : ''}`}
              aria-pressed={chosen}
              onClick={() => dispatch({ type: 'flow/confirmAnswered', key: question.id, value: index })}
            >
              {t(`confirm.${question.id}.option.${index}`)}
            </button>
          );
        })}
      </div>
      {answered && (isCorrect
        ? <p className="confirm-explain" role="status">✓ {t('flow.correct')} {t(`confirm.${question.id}.explain`)}</p>
        : <p className="confirm-retry" role="status">{t('flow.notYet')}</p>)}
    </article>
  );
}

export function ConceptualExercise({ id }: { id: 'a08' | 'a09' | 'a10' }) {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const definitions = {
    a08: { key: 'firstBadCorrect', correct: true, wrong: false, question: 'ui.conceptQuestionA08', answer: 'ui.conceptAnswerA08', distractor: 'ui.conceptDistractorA08' },
    a09: { key: 'submoduleSubtreeScore', correct: 'full', wrong: 'none', question: 'ui.conceptQuestionA09', answer: 'ui.conceptAnswerA09', distractor: 'ui.conceptDistractorA09' },
    a10: { key: 'internalsOrder', correct: ['blob', 'tree', 'commit', 'ref'] as readonly string[], wrong: ['ref', 'blob', 'commit', 'tree'] as readonly string[], question: 'ui.conceptQuestionA10', answer: 'ui.conceptAnswerA10', distractor: 'ui.conceptDistractorA10' },
  } as const;
  const definition = definitions[id];
  const value = state.interaction.conceptAnswers[definition.key];
  const answered = value !== undefined;
  const correct = value === definition.correct || (Array.isArray(definition.correct) && Array.isArray(value) && String(value) === String(definition.correct));
  const complete = state.progress[id]?.completed ?? false;
  return (
    <section className="concept-exercise" aria-labelledby="concept-question">
      <h2 id="concept-question">{t(definition.question)}</h2>
      <div className="concept-options">
        <button type="button" className={answered && correct ? 'option-correct' : answered && !correct ? 'option-wrong' : ''} onClick={() => dispatch({ type: 'concept/answered', key: definition.key, value: definition.correct })}>{t(definition.answer)}</button>
        <button type="button" className={answered && !correct ? 'option-wrong' : ''} onClick={() => dispatch({ type: 'concept/answered', key: definition.key, value: definition.wrong })}>{t(definition.distractor)}</button>
      </div>
      {answered && <p aria-live="polite" className={correct ? 'confirm-explain' : 'confirm-retry'}>{correct ? `✓ ${t('flow.correct')}` : t('flow.notYet')}</p>}
      {correct && !complete && (
        <button className="primary-button" type="button" onClick={() => {
          dispatch({ type: 'progress/updated', progress: { lessonId: id, completed: true, attempts: (state.progress[id]?.attempts ?? 0) + 1, hintsUsed: state.flow.hintCount, perfect: state.flow.hintCount === 0 } });
          dispatch({ type: 'flow/stage', stage: 'done' });
        }}>
          {t('flow.finishLesson')}
        </button>
      )}
      {complete && <p className="confirm-explain">✓ {t('lesson.complete')}</p>}
    </section>
  );
}
