import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { GitTutorResponse, TutorIntent } from '../../ai/schemas';
import { createPollinationsAIProvider, requestTutorResponse } from '../ai';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';

const intentOptions: Array<{ intent: TutorIntent; key: string }> = [
  { intent: 'ASK_GIT', key: 'askGit' },
  { intent: 'DIAGNOSE_STATE', key: 'diagnose' },
  { intent: 'EXPLAIN_MISTAKE', key: 'mistake' },
  { intent: 'FIX_REPO', key: 'fix' },
];

export function AITutor({ onCommand }: { onCommand: (value: string) => void }) {
  const { state } = useAppState();
  const { t } = useI18n();
  const provider = useMemo(() => createPollinationsAIProvider(), []);
  const [question, setQuestion] = useState('');
  const [intent, setIntent] = useState<TutorIntent>('ASK_GIT');
  const [response, setResponse] = useState<GitTutorResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'provider' | 'offline'>('idle');
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => {
    controllerRef.current?.abort();
    setResponse(null);
    setStatus('idle');
  }, [state.git, state.activeLessonId]);

  const ask = async (event?: FormEvent) => {
    event?.preventDefault();
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    const result = await requestTutorResponse({
      provider,
      state: state.git,
      context: {
        locale: state.locale,
        mode: state.mode,
        intent,
        currentLesson: {
          id: state.activeLessonId,
          objective: t(`lessons.${state.activeLessonId}.objective`),
          concepts: [],
        },
        recentCommands: state.terminal.map((entry) => ({ input: entry.input, success: entry.success, ...(entry.errorCode ? { errorCode: entry.errorCode } : {}), timestamp: entry.id })),
      },
      question: question || t('tutor.diagnose'),
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    setResponse(result.response);
    setStatus(result.source);
  };

  return (
    <section className="panel tutor-panel" aria-labelledby="tutor-title">
      <div className="panel-heading"><div><p className="panel-kicker">{t('ui.tutorBoundary')}</p><h2 id="tutor-title">{t('tutor.title')}</h2></div><span className={status === 'provider' ? 'ai-online' : status === 'offline' ? 'ai-offline' : ''}>{status === 'provider' ? `● ${t('ui.liveProvider')}` : status === 'offline' ? `○ ${t('ui.offlineGuide')}` : t('ui.trustBoundary')}</span></div>
      <div className="tutor-layout">
        <div className="tutor-context"><p>{t('ui.tutorContext')}</p><div className="context-pills"><span>{state.git.head.kind === 'detached' ? 'detached' : state.git.head.branch}</span><span>{Object.keys(state.git.commits).length} {t(Object.keys(state.git.commits).length === 1 ? 'ui.commit' : 'ui.commits')}</span><span>{state.git.operation ? `${Object.keys(state.git.operation.conflicts).length} conflict` : t('ui.noConflicts')}</span></div></div>
        <form className="tutor-form" onSubmit={ask}>
          <div className="intent-row">{intentOptions.map((option) => <button type="button" aria-pressed={intent === option.intent} key={option.intent} onClick={() => setIntent(option.intent)}>{t(`tutor.${option.key}`)}</button>)}</div>
          <label className="sr-only" htmlFor="tutor-question">{t('tutor.askPlaceholder')}</label>
          <textarea id="tutor-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('tutor.askPlaceholder')} />
          <button className="primary-button" type="submit" disabled={status === 'loading'}>{status === 'loading' ? t('ui.thinking') : t('tutor.askGit')}</button>
        </form>
        {response && <article className="tutor-response" aria-live="polite"><div className="response-source">{status === 'offline' ? <><b>{t('tutor.offlineTitle')}</b><span>{t('tutor.offlineBody')}</span></> : <b>{t('ui.grounded')}</b>}</div><p>{response.explanation}</p>{response.diagnosis && <blockquote>{response.diagnosis}</blockquote>}{response.commands.map((suggestion) => <div className={`suggestion suggestion-${suggestion.risk}`} key={suggestion.command}><div><code>{suggestion.command}</code><p>{suggestion.purpose}</p><span>{suggestion.risk}</span></div><div><button className="ghost-button" type="button" onClick={() => onCommand(suggestion.command)}>{t('ui.preview')}</button><button className="ghost-button" type="button" onClick={() => onCommand(suggestion.command)}>{t('commandLens.putInTerminal')}</button></div></div>)}</article>}
      </div>
    </section>
  );
}
