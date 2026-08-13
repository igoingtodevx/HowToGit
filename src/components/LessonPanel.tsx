import { useEffect, useState } from 'react';
import { executeInteractiveRebase, uniqueCommitsSince } from '../../engine';
import { useAppState } from '../application/AppStateProvider';
import type { InteractionState } from '../application/appState';
import { useI18n } from '../i18n/i18n';
import { createDemoRuntime, createLessonScenario, getLesson, runDemoStep, validateLesson, type DemoRuntime, type DemoStep, type LessonId } from '../lessons';

const beginnerIds = Array.from({ length: 10 }, (_, index) => `b${String(index + 1).padStart(2, '0')}`);
const advancedIds = Array.from({ length: 10 }, (_, index) => `a${String(index + 1).padStart(2, '0')}`);

export function LessonNavigation() {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  return (
    <nav className="lesson-navigation" aria-label={t('ui.courseLessons')}>
      <p className="sidebar-label">{t('nav.beginner')} · 10</p>
      <ol>{beginnerIds.map((id, index) => <li key={id}><button type="button" className={state.activeLessonId === id ? 'lesson-link active' : 'lesson-link'} onClick={() => dispatch({ type: 'lesson/selected', lessonId: id })}><span>{String(index + 1).padStart(2, '0')}</span><span><b>{t(`lessons.${id}.title`)}</b><small>{state.progress[id]?.completed ? `✓ ${t('ui.complete')}` : index === 0 ? t('ui.startHere') : t('ui.interactive')}</small></span></button></li>)}</ol>
      <p className="sidebar-label advanced-label">{t('nav.advanced')} · 10</p>
      <ol>{advancedIds.map((id, index) => <li key={id}><button type="button" className={state.activeLessonId === id ? 'lesson-link active' : 'lesson-link'} onClick={() => dispatch({ type: 'lesson/selected', lessonId: id })}><span>{String(index + 1).padStart(2, '0')}</span><span><b>{t(`lessons.${id}.title`)}</b><small>{index >= 7 ? t('ui.conceptualModule') : t('ui.simulatorLesson')}</small></span></button></li>)}</ol>
    </nav>
  );
}

export function LessonPanel() {
  const { state, dispatch } = useAppState();
  const { t, tArray } = useI18n();
  const [hintCount, setHintCount] = useState(0);
  const id = state.activeLessonId;
  useEffect(() => setHintCount(0), [id]);
  const hints = tArray(`lessons.${id}.hints`);
  const conceptual = ['a08', 'a09', 'a10'].includes(id);
  const lesson = getLesson(id as LessonId);
  const initialState = createLessonScenario(id as LessonId);
  const validation = conceptual
    ? validateLesson(lesson.validatorId, { state: state.git, initialState: state.git, interaction: state.interaction })
    : initialState ? validateLesson(lesson.validatorId, { state: state.git, initialState, interaction: state.interaction }) : null;
  useEffect(() => {
    if (!validation?.complete || state.progress[id]?.completed) return;
    dispatch({ type: 'progress/updated', progress: { lessonId: id, completed: true, attempts: (state.progress[id]?.attempts ?? 0) + 1, hintsUsed: hintCount } });
  }, [dispatch, hintCount, id, state.progress, validation?.complete]);
  const loadScenario = () => {
    if (conceptual) {
      dispatch({ type: 'concept/reset' });
      return;
    }
    const scenario = createLessonScenario(id as LessonId);
    if (scenario) dispatch({ type: 'lesson/restarted', lessonId: id, git: scenario });
  };
  return (
    <section className="lesson-panel" id="learn" aria-labelledby="lesson-title">
      <div className="lesson-meta"><span>{id.startsWith('b') ? t('nav.beginner') : t('nav.advanced')} · {id.slice(1)}</span>{conceptual && <b>{t('ui.conceptualLabel')}</b>}</div>
      <h1 id="lesson-title">{t(`lessons.${id}.title`)}</h1>
      <div className="lesson-goal"><small>{t('lesson.goal')}</small><strong>{t(`lessons.${id}.objective`)}</strong></div>
      <div className="lesson-actions"><button className="primary-button" type="button" onClick={loadScenario}>{t('lesson.restart')}</button>{validation && <span className={validation.complete ? 'challenge-complete' : 'challenge-progress'}>{validation.complete ? `✓ ${t('lesson.complete')}` : `${validation.satisfied.length}/${validation.satisfied.length + validation.remaining.length} ${t('ui.challengeCriteria')}`}</span>}</div>
      <div className="challenge-card"><small>{t('lesson.challenge')}</small><p>{lesson.challenge.goal[state.locale]}</p></div>
      <details><summary>{t('lesson.why')}</summary><p>{t(`lessons.${id}.why`)}</p></details>
      <details><summary>{t('lesson.mentalModel')}</summary><p>{t(`lessons.${id}.mentalModel`)}</p></details>
      <div className="hint-box"><div><span aria-hidden="true">◎</span><p>{hintCount === 0 ? t('ui.hintIntro') : hints[hintCount - 1]}</p></div><button type="button" onClick={() => setHintCount((count) => Math.min(3, count + 1))} disabled={hintCount >= 3}>{t('lesson.hint')} {Math.min(3, hintCount + 1)}/3</button></div>
      {conceptual ? <ConceptualExercise id={id as 'a08' | 'a09' | 'a10'} /> : <DemoController key={id} id={id as LessonId} />}
      {id === 'a01' && <InteractiveRebaseLesson />}
    </section>
  );
}

const mutableInteraction = (runtime: DemoRuntime): InteractionState => ({
  ...runtime.interaction,
  commands: [...runtime.interaction.commands],
  inspectedRefs: [...runtime.interaction.inspectedRefs],
  conceptAnswers: { ...runtime.interaction.conceptAnswers },
});

const effectsForStep = (step: DemoStep, runtime: DemoRuntime) => {
  if (step.kind === 'terminal') return runtime.lastCommand?.effects ?? [];
  if (step.kind === 'fileEdit') return [{ type: 'WORKTREE_CHANGED' as const, paths: [(step.value as { path: string }).path] }];
  if (step.kind === 'resolveConflict') return [{ type: 'WORKTREE_CHANGED' as const, paths: [(step.value as { path: string }).path] }];
  return [];
};

function DemoController({ id }: { id: LessonId }) {
  const { dispatch } = useAppState();
  const { locale, t } = useI18n();
  const lesson = getLesson(id);
  const [runtime, setRuntime] = useState(() => createDemoRuntime(id));
  const [stepIndex, setStepIndex] = useState(0);
  const [narration, setNarration] = useState('');
  const restart = () => {
    const next = createDemoRuntime(id);
    setRuntime(next);
    setStepIndex(0);
    setNarration('');
    dispatch({ type: 'demo/state', git: next.state, effects: [], interaction: mutableInteraction(next) });
  };
  const next = () => {
    const step = lesson.demo.steps[stepIndex];
    if (!step) return;
    const updated = runDemoStep(runtime, step);
    setRuntime(updated);
    setNarration(step.narration[locale]);
    setStepIndex((value) => value + 1);
    dispatch({ type: 'demo/state', git: updated.state, effects: effectsForStep(step, updated), interaction: mutableInteraction(updated) });
  };
  const complete = stepIndex >= lesson.demo.steps.length;
  return <section className="demo-controller" aria-label={t('lesson.showMe')}><div><small>{t('lesson.showMe')} · {Math.min(stepIndex + 1, lesson.demo.steps.length)}/{lesson.demo.steps.length}</small><p aria-live="polite">{narration || lesson.demo.steps[0]?.narration[locale]}</p></div><div className="button-row"><button className="ghost-button" type="button" onClick={restart}>{t('ui.restartDemo')}</button><button className="primary-button" type="button" onClick={next} disabled={complete}>{complete ? t('ui.demoComplete') : t('ui.nextDemoStep')}</button></div></section>;
}

function ConceptualExercise({ id }: { id: 'a08' | 'a09' | 'a10' }) {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const definitions = {
    a08: { key: 'firstBadCorrect', correct: true, wrong: false, question: 'ui.conceptQuestionA08', answer: 'ui.conceptAnswerA08', distractor: 'ui.conceptDistractorA08' },
    a09: { key: 'submoduleSubtreeScore', correct: 'full', wrong: 'none', question: 'ui.conceptQuestionA09', answer: 'ui.conceptAnswerA09', distractor: 'ui.conceptDistractorA09' },
    a10: { key: 'internalsOrder', correct: ['blob', 'tree', 'commit', 'ref'] as readonly string[], wrong: ['ref', 'blob', 'commit', 'tree'] as readonly string[], question: 'ui.conceptQuestionA10', answer: 'ui.conceptAnswerA10', distractor: 'ui.conceptDistractorA10' },
  } as const;
  const definition = definitions[id];
  const answered = state.interaction.conceptAnswers[definition.key] !== undefined;
  return <section className="concept-exercise" aria-labelledby="concept-question"><small>{t('lesson.tryIt')}</small><h2 id="concept-question">{t(definition.question)}</h2><div className="concept-options"><button type="button" onClick={() => dispatch({ type: 'concept/answered', key: definition.key, value: definition.correct })}>{t(definition.answer)}</button><button type="button" onClick={() => dispatch({ type: 'concept/answered', key: definition.key, value: definition.wrong })}>{t(definition.distractor)}</button></div>{answered && <p aria-live="polite">{state.interaction.conceptAnswers[definition.key] === definition.correct || (Array.isArray(definition.correct) && Array.isArray(state.interaction.conceptAnswers[definition.key]) && String(state.interaction.conceptAnswers[definition.key]) === String(definition.correct)) ? `✓ ${t('lesson.complete')}` : t('lesson.hint')}</p>}</section>;
}

function InteractiveRebaseLesson() {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const branch = state.git.head.kind === 'symbolic' ? state.git.head.branch : null;
  const tip = branch ? state.git.branches[branch]?.target ?? null : null;
  const base = state.git.branches.main?.target ?? null;
  const commits = tip && base ? uniqueCommitsSince(state.git.commits, tip, base) : [];
  const [actions, setActions] = useState<Record<string, 'pick' | 'reword' | 'squash' | 'drop'>>({});
  const [message, setMessage] = useState('Clean feature story');
  if (commits.length === 0) return null;
  return <section className="rebase-editor" aria-labelledby="rebase-editor-title"><h2 id="rebase-editor-title">{t('ui.rebaseEditor')}</h2><p>{t('ui.rebaseIntro')}</p><ol>{commits.map((id) => <li key={id}><code>{id.slice(0, 7)}</code><span>{state.git.commits[id].message}</span><select aria-label={`${t('ui.rebaseEditor')}: ${state.git.commits[id].message}`} value={actions[id] ?? 'pick'} onChange={(event) => setActions((current) => ({ ...current, [id]: event.target.value as 'pick' | 'reword' | 'squash' | 'drop' }))}><option value="pick">pick</option><option value="reword">reword</option><option value="squash">squash</option><option value="drop">drop</option></select></li>)}</ol>{Object.values(actions).includes('reword') && <label className="field-label">{t('ui.rewordedMessage')}<input value={message} onChange={(event) => setMessage(event.target.value)} /></label>}<button className="primary-button" type="button" onClick={() => {
    if (!base) return;
    const result = executeInteractiveRebase(state.git, base, commits.map((commitId) => {
      const action = actions[commitId] ?? 'pick';
      return action === 'reword' ? { commitId, action, message } : { commitId, action };
    }));
    if (result.success) dispatch({ type: 'demo/state', git: result.nextState, effects: result.effects });
  }}>{t('ui.applyReplay')}</button></section>;
}
