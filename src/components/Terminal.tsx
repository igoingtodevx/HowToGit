import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';

const quickCommands = ['git init', 'git status', 'git add .', 'git commit -m "First snapshot"'];
const feedbackCopy = {
  en: {
    success: 'Command executed. Check the mission state above and the visual state below.',
    error: 'That command did not work yet. Read Git’s output, try again, or reveal the next hint.',
  },
  de: {
    success: 'Befehl ausgeführt. Prüfe oben den Missionsfortschritt und unten den visuellen Zustand.',
    error: 'Der Befehl hat so noch nicht funktioniert. Lies die Git-Ausgabe, probiere erneut oder öffne den nächsten Hinweis.',
  },
} as const;

export function Terminal({ commandValue, onCommandValue }: { commandValue: string; onCommandValue: (value: string) => void }) {
  const { state, dispatch } = useAppState();
  const { locale, t } = useI18n();
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
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
  };
  return (
    <section className="panel terminal-panel" aria-labelledby="terminal-title">
      <div className="terminal-chrome"><div className="traffic-lights" aria-hidden="true"><i /><i /><i /></div><h2 id="terminal-title">{t('terminal.title')}</h2><span>~/academy</span></div>
      <div className="terminal-output" ref={outputRef} aria-live="polite">
        <div className="terminal-welcome"><span>{t('ui.terminalWelcome')}</span><small>{t('ui.terminalLocal')}</small></div>
        {state.terminal.map((entry) => <div className="terminal-entry" key={entry.id}><div className="terminal-command"><b>❯</b> {entry.input}</div>{entry.lines.map((item, index) => <pre className={`tone-${item.tone}`} key={index}>{item.text}</pre>)}{entry.explanationKey && state.mode === 'noob' && <p className="noob-explanation">↳ {t(entry.explanationKey)}</p>}{state.mode === 'noob' && <p className={`guided-command-feedback ${entry.success ? 'is-success' : 'is-error'}`}>↳ {entry.success ? feedbackCopy[locale].success : feedbackCopy[locale].error}</p>}</div>)}
      </div>
      <form className="terminal-form" onSubmit={submit}><span aria-hidden="true">❯</span><label className="sr-only" htmlFor="terminal-input">{t('terminal.placeholder')}</label><input id="terminal-input" value={commandValue} onChange={(event) => onCommandValue(event.target.value)} placeholder={t('terminal.placeholder')} autoComplete="off" spellCheck={false} onKeyDown={(event) => {
        if (!['ArrowUp', 'ArrowDown'].includes(event.key) || state.terminal.length === 0) return;
        event.preventDefault();
        const nextIndex = event.key === 'ArrowUp' ? Math.min(state.terminal.length - 1, historyIndex + 1) : Math.max(-1, historyIndex - 1);
        setHistoryIndex(nextIndex);
        onCommandValue(nextIndex === -1 ? '' : state.terminal[state.terminal.length - 1 - nextIndex].input);
      }} /><button type="submit">{t('ui.run')}</button></form>
      {state.mode === 'pro' && <div className="quick-commands" aria-label={t('ui.quickCommands')}>{quickCommands.map((command) => <button type="button" key={command} onClick={() => onCommandValue(command)}>{command}</button>)}</div>}
    </section>
  );
}
