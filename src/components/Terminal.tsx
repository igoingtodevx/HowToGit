import { FormEvent, useEffect, useRef, useState, type RefObject } from 'react';
import type { GitEffect } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';
import { useLessonValidation } from '../lessons/useLessonValidation';

/** Pro-mode convenience chips: inspection commands only — never lesson answers. */
const proQuickCommands = ['git status', 'git log --oneline', 'git diff', 'git stash list'];

const primaryEffectKey = (effects: readonly GitEffect[]): string | undefined => {
  const priorities = ['MERGE_COMMIT_CREATED', 'MERGE_FAST_FORWARD', 'COMMIT_CREATED', 'CONFLICT_CREATED', 'STASH_CREATED', 'STASH_APPLIED', 'RESET_PERFORMED', 'COMMITS_REPLAYED', 'CHERRY_PICK_CREATED', 'BRANCH_CREATED', 'BRANCH_MOVED', 'HEAD_MOVED', 'TAG_CREATED', 'REMOTE_UPDATED', 'CONFLICT_RESOLVED', 'FILE_STAGED', 'INDEX_CHANGED', 'WORKTREE_CHANGED'] as const;
  const types = new Set(effects.map((effect) => effect.type));
  return priorities.find((type) => types.has(type));
};

interface TerminalProps {
  commandValue: string;
  onCommandValue: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function Terminal({ commandValue, onCommandValue, inputRef }: TerminalProps) {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const lastEntry = state.terminal[state.terminal.length - 1];
  const lastEffects = lastEntry ? state.effects : [];
  const validation = useLessonValidation();

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [state.terminal]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = commandValue.trim();
    if (!input) return;
    dispatch({ type: 'command/executed', input });
    onCommandValue('');
    setHistoryIndex(-1);
    inputRef.current?.focus();
  };

  const restoreHistory = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || state.terminal.length === 0) return;
    event.preventDefault();
    const nextIndex = event.key === 'ArrowUp' ? Math.min(state.terminal.length - 1, historyIndex + 1) : Math.max(-1, historyIndex - 1);
    setHistoryIndex(nextIndex);
    onCommandValue(nextIndex === -1 ? '' : state.terminal[state.terminal.length - 1 - nextIndex].input);
  };

  const lastSuccessKey = primaryEffectKey(lastEffects);
  const announce = lastEntry
    ? (lastEntry.success ? t('terminal.announceSuccess') : t('terminal.announceFailure'))
    : '';

  return (
    <section className="panel terminal-panel" aria-labelledby="terminal-title">
      <div className="terminal-chrome">
        <div className="traffic-lights" aria-hidden="true"><i /><i /><i /></div>
        <h2 id="terminal-title">{t('terminal.title')}</h2>
        <div className="terminal-chrome-right">
          {state.mode === 'noob' && validation && (
            <span className="mission-chip" aria-label={t('flow.missionProgress', { n: validation.satisfied.length, m: validation.satisfied.length + validation.remaining.length })}>
              {t('flow.missionProgress', { n: validation.satisfied.length, m: validation.satisfied.length + validation.remaining.length })}
            </span>
          )}
          <span className="terminal-path">~/academy</span>
        </div>
      </div>
      <div className="terminal-output" ref={outputRef}>
        <p className="sr-only" role="status">{announce}</p>
        <div className="terminal-welcome"><span>{t('ui.terminalWelcome')}</span><small>{t('ui.terminalLocal')}</small></div>
        {state.terminal.map((entry, index) => (
          <div className="terminal-entry" key={entry.id}>
            <div className="terminal-command"><b aria-hidden="true">❯</b> {entry.input}</div>
            {entry.lines.map((item, lineIndex) => <pre className={`tone-${item.tone}`} key={lineIndex}>{item.text}</pre>)}
            {state.mode === 'noob' && index === state.terminal.length - 1 && entry.success && lastSuccessKey && (
              <p className="noob-explanation">↳ {t(`effects.${lastSuccessKey}`)}</p>
            )}
            {state.mode === 'noob' && entry.explanationKey && (
              <p className="noob-explanation noob-explanation-error">↳ {t(entry.explanationKey)}</p>
            )}
            {entry.correction && (
              <button className="correction-button" type="button" onClick={() => { onCommandValue(entry.correction!); inputRef.current?.focus(); }}>
                {t('terminal.correction', { command: entry.correction })}
              </button>
            )}
          </div>
        ))}
      </div>
      <form className="terminal-form" onSubmit={submit}>
        <span aria-hidden="true">❯</span>
        <label className="sr-only" htmlFor="terminal-input">{t('terminal.placeholder')}</label>
        <input id="terminal-input" ref={inputRef} value={commandValue} onChange={(event) => onCommandValue(event.target.value)} placeholder={t('terminal.placeholder')} autoComplete="off" spellCheck={false} onKeyDown={restoreHistory} />
        <span className="history-hint" aria-hidden="true">{t('terminal.historyHint')}</span>
        <button type="submit">{t('ui.run')}</button>
      </form>
      {state.mode === 'pro' && (
        <div className="quick-commands" role="group" aria-label={t('ui.quickCommands')}>
          {proQuickCommands.map((command) => <button type="button" key={command} onClick={() => { onCommandValue(command); inputRef.current?.focus(); }}>{command}</button>)}
        </div>
      )}
    </section>
  );
}
