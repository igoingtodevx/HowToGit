import { previewCommand } from '../../engine/preview';
import { headCommitId } from '../../engine/state';
import { useAppState } from '../application/AppStateProvider';
import { selectStatuses } from '../application/selectors';
import { useI18n } from '../i18n/i18n';

export function CommandLens({ command, onCommand }: { command: string; onCommand: (value: string) => void }) {
  const { state, dispatch } = useAppState();
  const { t } = useI18n();
  const preview = command.trim().startsWith('git ') ? previewCommand(state.git, command.trim()) : null;
  if (!preview) return null;
  const before = headCommitId(state.git);
  const after = headCommitId(preview.result.nextState);
  const statuses = selectStatuses(preview.result.nextState);
  const staged = statuses.filter((item) => item.staged).map((item) => item.path);
  const working = statuses.filter((item) => item.unstaged).map((item) => item.path);
  const effects = preview.result.effects.map((effect) => effect.type);
  return (
    <aside className={`command-lens risk-${preview.risk}`} aria-label={t('commandLens.title')}>
      <div><span className="risk-label">{t(`commandLens.risk.${preview.risk}`)}</span><strong>{t('commandLens.title')}</strong><code>{preview.command}</code></div>
      <div className="lens-comparison"><span><small>{t('commandLens.before')}</small><b>{before?.slice(0, 7) ?? 'unborn'}</b></span><i>→</i><span><small>{t('commandLens.after')}</small><b>{after?.slice(0, 7) ?? 'unborn'}</b></span></div>
      <div className="lens-impact"><span><b>{staged.length}</b> {t('ui.indexImpact')}</span><span><b>{working.length}</b> {t('ui.worktreeImpact')}</span><span title={effects.join(', ')}><b>{effects.length}</b> {t('ui.semanticEffects')}</span></div>
      <div className="lens-actions"><button type="button" className="ghost-button" onClick={() => onCommand(preview.command)}>{t('commandLens.putInTerminal')}</button><button type="button" className="primary-button" disabled={!preview.result.success} onClick={() => dispatch({ type: 'command/executed', input: preview.command })}>{t('commandLens.run')}</button></div>
    </aside>
  );
}
