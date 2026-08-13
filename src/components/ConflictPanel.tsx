import { useState } from 'react';
import type { GitState } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';

export function ConflictPanel({ state }: { state: GitState }) {
  const { dispatch } = useAppState();
  const { t } = useI18n();
  const conflict = state.operation ? Object.values(state.operation.conflicts)[0] : undefined;
  const [resolution, setResolution] = useState(conflict?.ours ?? '');
  if (!conflict) return null;
  return (
    <section className="panel conflict-panel" aria-labelledby="conflict-title">
      <div className="panel-heading"><div><p className="panel-kicker danger-text">{t('ui.mergePaused')}</p><h2 id="conflict-title">{t('ui.resolve')} {conflict.path}</h2></div><span className="conflict-badge">! {t('ui.needsDecision')}</span></div>
      <p>{t('ui.conflictIntro')}</p>
      <div className="conflict-columns"><article><h3>{t('ui.base')}</h3><pre>{conflict.base ?? '∅'}</pre></article><article><h3>{t('ui.ours')}</h3><pre>{conflict.ours ?? '∅'}</pre></article><article><h3>{t('ui.theirs')}</h3><pre>{conflict.theirs ?? '∅'}</pre></article></div>
      <label className="field-label">{t('ui.finalContent')}<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} /></label>
      <button className="primary-button" type="button" onClick={() => dispatch({ type: 'conflict/resolved', path: conflict.path, content: resolution })}>{t('ui.useResolution')}</button>
      <p className="next-step">{t('ui.nextStage')} <code>{conflict.path}</code></p>
    </section>
  );
}
