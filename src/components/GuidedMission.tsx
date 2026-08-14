import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';
import { createLessonScenario, getLesson, validateLesson, type LessonId } from '../lessons';

const beginnerIds = Array.from({ length: 10 }, (_, index) => `b${String(index + 1).padStart(2, '0')}`) as LessonId[];
const lessonCommands: Partial<Record<LessonId, readonly string[]>> = {
  b01: ['git init'],
  b02: ['git add <file>', 'git commit -m "<message>"'],
  b03: ['git log --oneline'],
  b04: ['git branch <name>', 'git switch <name>'],
  b05: ['git status', 'git add <file>', 'git commit -m "<message>"'],
  b06: ['git switch <target>', 'git merge <source>'],
  b07: ['git merge <branch>', 'git status', 'git add <resolved-file>', 'git commit'],
  b08: ['git reset', 'git revert'],
  b09: ['git stash', 'git stash list', 'git stash pop'],
  b10: ['git fetch', 'git pull', 'git push'],
};
const visualToolLessons = new Set<LessonId>(['b05', 'b07']);

const guidedCopy = {
  en: {
    understand: 'Understand',
    doIt: 'Do it yourself',
    confirm: 'Confirm the result',
    mission: 'Your mission',
    commandLabel: 'Commands to learn',
    commandNote: 'Read these first. Then type the command yourself in the terminal below; placeholders in <angle brackets> must be replaced.',
    instruction: 'Use the terminal directly below. You can experiment safely here; a wrong command does not break your real files.',
    instructionWithTools: 'Use the terminal plus the visual file/conflict tool shown below it. Everything is simulated, so you can experiment safely.',
    successTitle: 'Mission complete',
    successBody: 'The repository reached the target state. Look at what changed before moving on.',
    next: 'Next mission',
    trackComplete: 'Beginner track complete',
    trackCompleteBody: 'You cleared all ten beginner missions. Switch to Pro Mode when you want the full lab and advanced track.',
    criteria: 'criteria complete',
  },
  de: {
    understand: 'Verstehen',
    doIt: 'Selbst ausführen',
    confirm: 'Ergebnis prüfen',
    mission: 'Deine Mission',
    commandLabel: 'Diese Befehle lernst du',
    commandNote: 'Lies sie zuerst. Tippe den passenden Befehl danach selbst unten ins Terminal; Platzhalter in <spitzen Klammern> musst du ersetzen.',
    instruction: 'Nutze jetzt das Terminal direkt darunter. Du kannst hier gefahrlos ausprobieren; ein falscher Befehl verändert keine echten Dateien.',
    instructionWithTools: 'Nutze das Terminal zusammen mit dem Datei-/Konfliktwerkzeug darunter. Alles ist simuliert, du kannst also gefahrlos ausprobieren.',
    successTitle: 'Mission geschafft',
    successBody: 'Das Repository hat den Zielzustand erreicht. Schau dir kurz an, was sich verändert hat, bevor du weitergehst.',
    next: 'Nächste Mission',
    trackComplete: 'Einsteiger-Track abgeschlossen',
    trackCompleteBody: 'Du hast alle zehn Einsteiger-Missionen geschafft. Wechsle in den Pro-Modus, wenn du das volle Lab und den Advanced-Track nutzen möchtest.',
    criteria: 'Kriterien erfüllt',
  },
} as const;

export function GuidedMission() {
  const { state, dispatch } = useAppState();
  const { locale, t, tArray } = useI18n();
  const [hintCount, setHintCount] = useState(0);
  const id = state.activeLessonId as LessonId;
  const lesson = getLesson(id);
  const hints = tArray(`lessons.${id}.hints`);
  const commands = lessonCommands[id] ?? [];
  const copy = guidedCopy[locale];

  useEffect(() => setHintCount(0), [id]);

  const initialState = useMemo(() => createLessonScenario(id), [id]);
  const validation = initialState
    ? validateLesson(lesson.validatorId, { state: state.git, initialState, interaction: state.interaction })
    : null;

  useEffect(() => {
    if (!validation?.complete || state.progress[id]?.completed) return;
    dispatch({
      type: 'progress/updated',
      progress: {
        lessonId: id,
        completed: true,
        attempts: (state.progress[id]?.attempts ?? 0) + 1,
        hintsUsed: hintCount,
      },
    });
  }, [dispatch, hintCount, id, state.progress, validation?.complete]);

  const lessonIndex = beginnerIds.indexOf(id);
  const nextId = lessonIndex >= 0 && lessonIndex < beginnerIds.length - 1 ? beginnerIds[lessonIndex + 1] : null;
  const satisfied = validation?.satisfied.length ?? 0;
  const total = satisfied + (validation?.remaining.length ?? 0);

  const restart = () => {
    const scenario = createLessonScenario(id);
    setHintCount(0);
    if (scenario) dispatch({ type: 'lesson/restarted', lessonId: id, git: scenario });
  };

  const goNext = () => {
    if (!nextId) return;
    const scenario = createLessonScenario(nextId);
    if (scenario) dispatch({ type: 'lesson/restarted', lessonId: nextId, git: scenario });
    globalThis.requestAnimationFrame?.(() => document.querySelector('.guided-mission')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <section className="guided-mission" aria-labelledby="guided-mission-title">
      <ol className="guided-phases" aria-label={t('lesson.progress')}>
        <li className="phase-done"><span>1</span><b>{copy.understand}</b></li>
        <li className={validation?.complete ? 'phase-done' : 'phase-active'}><span>2</span><b>{copy.doIt}</b></li>
        <li className={validation?.complete ? 'phase-active' : ''}><span>3</span><b>{copy.confirm}</b></li>
      </ol>

      <div className="guided-hero">
        <p className="eyebrow">{id.startsWith('b') ? t('nav.beginner') : t('nav.advanced')} · {id.slice(1)}</p>
        <h1 id="guided-mission-title">{t(`lessons.${id}.title`)}</h1>
        <p className="guided-objective">{t(`lessons.${id}.objective`)}</p>
      </div>

      <div className="guided-concepts">
        <article>
          <small>{t('lesson.why')}</small>
          <p>{t(`lessons.${id}.why`)}</p>
        </article>
        <article>
          <small>{t('lesson.mentalModel')}</small>
          <p>{t(`lessons.${id}.mentalModel`)}</p>
        </article>
      </div>

      {commands.length > 0 && (
        <div className="guided-command-lesson">
          <small>{copy.commandLabel}</small>
          <div>{commands.map((command) => <code key={command}>{command}</code>)}</div>
          <p>{copy.commandNote}</p>
        </div>
      )}

      <div className={`guided-task ${validation?.complete ? 'guided-task-complete' : ''}`}>
        <div className="guided-task-heading">
          <small>{copy.mission}</small>
          {validation && <span>{validation.complete ? `✓ ${t('lesson.complete')}` : `${satisfied}/${total} ${copy.criteria}`}</span>}
        </div>
        <strong>{lesson.challenge.goal[locale]}</strong>
        {!validation?.complete && <p>{visualToolLessons.has(id) ? copy.instructionWithTools : copy.instruction}</p>}
      </div>

      {!validation?.complete && (
        <div className="hint-box guided-hints">
          <div><span aria-hidden="true">◎</span><p>{hintCount === 0 ? t('ui.hintIntro') : hints[hintCount - 1]}</p></div>
          <button type="button" onClick={() => setHintCount((count) => Math.min(3, count + 1))} disabled={hintCount >= 3}>
            {t('lesson.hint')} {Math.min(3, hintCount + 1)}/3
          </button>
        </div>
      )}

      <div className="guided-actions">
        <button className="ghost-button" type="button" onClick={restart}>{t('lesson.restart')}</button>
      </div>

      {validation?.complete && (
        <div className="guided-success" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <small>{copy.successTitle}</small>
            <strong>{nextId ? t('lesson.complete') : copy.trackComplete}</strong>
            <p>{nextId ? copy.successBody : copy.trackCompleteBody}</p>
          </div>
          {nextId && <button className="primary-button" type="button" onClick={goNext}>{copy.next} →</button>}
        </div>
      )}
    </section>
  );
}
