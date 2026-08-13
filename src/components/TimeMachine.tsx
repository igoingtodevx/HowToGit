import type { GitState } from '../../engine/types';
import { useI18n } from '../i18n/i18n';

export function TimeMachine({ state, onCommand }: { state: GitState; onCommand: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <section className="panel time-panel" id="timeMachine" aria-labelledby="time-title">
      <div className="panel-heading"><div><p className="panel-kicker">{t('ui.reflogSafety')}</p><h2 id="time-title">{t('nav.timeMachine')}</h2></div><span>{state.reflog.length} {t('ui.movements')}</span></div>
      {state.reflog.length === 0 ? <p className="empty-copy">{t('ui.timeEmpty')}</p> : <ol className="reflog-list">{state.reflog.slice(0, 8).map((entry, index) => <li key={`${entry.sequence}-${index}`}><span className="timeline-dot" /><div><code>HEAD@{'{'}{index}{'}'}</code><strong>{entry.message}</strong><small>{entry.oldTarget?.slice(0, 7) ?? t('ui.unborn')} → {entry.newTarget?.slice(0, 7) ?? t('ui.unborn')}</small></div>{entry.newTarget && <button type="button" onClick={() => onCommand(`git reset --hard ${entry.newTarget}`)}>{t('ui.previewRecovery')}</button>}</li>)}</ol>}
    </section>
  );
}
