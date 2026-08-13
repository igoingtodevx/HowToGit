import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { headTree } from '../../engine/state';
import type { GitEffect, GitState, TreeSnapshot } from '../../engine/types';
import { selectStatuses } from '../application/selectors';
import { useI18n } from '../i18n/i18n';

interface ZoneProps {
  title: string;
  subtitle: string;
  kind: string;
  tree: TreeSnapshot;
  states: Record<string, string>;
  active: boolean;
}

function Zone({ title, subtitle, kind, tree, states, active }: ZoneProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  return (
    <section className={`xray-zone xray-zone-${kind}${active ? ' xray-zone-active' : ''}`} aria-label={`${title}: ${subtitle}`}>
      <header><span className="zone-icon" aria-hidden="true">{kind === 'working' ? '✎' : kind === 'staging' ? '◇' : '●'}</span><div><h3>{title}</h3><p>{subtitle}</p></div></header>
      <div className="file-stack">
        <AnimatePresence initial={false}>
          {Object.values(tree).map((file) => (
            <motion.article
              className={`file-card file-${states[file.path] ?? 'unchanged'}`}
              key={`${kind}-${file.path}`}
              layout
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92, x: active ? (kind === 'working' ? -14 : 14) : 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: reduceMotion ? 0 : 0.32 }}
            >
              <span className="file-state-icon" aria-hidden="true">{states[file.path] === 'conflicted' ? '!' : states[file.path] === 'staged' ? '✓' : kind === 'repository' ? '◆' : '•'}</span>
              <span><strong>{file.path}</strong><small>{t(`fileState.${states[file.path] ?? 'unchanged'}`)}</small></span>
            </motion.article>
          ))}
        </AnimatePresence>
        {Object.keys(tree).length === 0 && <p className="zone-empty">{t('ui.nothingHere')}</p>}
      </div>
    </section>
  );
}

export function GitXRay({ state, effects }: { state: GitState; effects: GitEffect[] }) {
  const { t } = useI18n();
  const statuses = selectStatuses(state);
  const workStates = Object.fromEntries(statuses.map((status) => [status.path, status.conflicted ? 'conflicted' : status.unstaged ?? 'unchanged']));
  const indexStates = Object.fromEntries(statuses.filter((status) => status.staged).map((status) => [status.path, status.conflicted ? 'conflicted' : 'staged']));
  const types = new Set(effects.map((effect) => effect.type));
  return (
    <section className="panel xray-panel" aria-labelledby="xray-title">
      <div className="panel-heading"><div><p className="panel-kicker">STATE PIPELINE</p><h2 id="xray-title">Git X-Ray</h2></div><span className="live-badge"><i /> {t('ui.xraySignature')}</span></div>
      <div className="xray-flow">
        <Zone title={t('gitZones.workingTree.title')} subtitle={t('gitZones.workingTree.subtitle')} kind="working" tree={state.workingTree} states={workStates} active={types.has('WORKTREE_CHANGED')} />
        <span className="flow-arrow" aria-hidden="true">→</span>
        <Zone title={t('gitZones.staging.title')} subtitle={t('gitZones.staging.subtitle')} kind="staging" tree={state.index} states={indexStates} active={types.has('FILE_STAGED') || types.has('INDEX_CHANGED')} />
        <span className="flow-arrow" aria-hidden="true">→</span>
        <Zone title={t('gitZones.repository.title')} subtitle={t('gitZones.repository.subtitle')} kind="repository" tree={headTree(state)} states={{}} active={types.has('COMMIT_CREATED')} />
      </div>
    </section>
  );
}
