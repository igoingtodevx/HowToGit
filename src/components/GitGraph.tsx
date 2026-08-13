import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import type { GitEffect, GitState } from '../../engine/types';
import { layoutGraph } from '../application/selectors';
import { useI18n } from '../i18n/i18n';

const laneColors = ['var(--branch-main)', 'var(--branch-1)', 'var(--branch-2)', 'var(--branch-3)', 'var(--branch-4)', 'var(--branch-5)'];

export function GitGraph({ state, effects = [] }: { state: GitState; effects?: GitEffect[] }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const layout = useMemo(() => layoutGraph(state), [state]);
  const summary = state.initialized
    ? `${state.head.kind === 'detached' ? 'HEAD detached' : `HEAD → ${state.head.branch}`}. ${layout.nodes.length} ${t(layout.nodes.length === 1 ? 'ui.commit' : 'ui.commits')}.`
    : t('ui.notInitialized');
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectTypes = new Set(effects.map((effect) => effect.type));
  const historyChanged = effectTypes.has('COMMITS_REPLAYED') || effectTypes.has('MERGE_COMMIT_CREATED') || effectTypes.has('COMMIT_CREATED');
  const selected = selectedId ? state.commits[selectedId] : undefined;
  const selectedNode = selectedId ? layout.nodes.find((node) => node.id === selectedId) : undefined;

  const resetView = () => {
    setZoom(1);
    viewportRef.current?.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <section className="panel graph-panel" aria-labelledby="graph-title">
      <div className="panel-heading">
        <div><p className="panel-kicker">{t('ui.commitDag')}</p><h2 id="graph-title">{t('ui.gitGraph')}</h2></div>
        <div className="graph-heading-actions">
          <span className="graph-count">{layout.nodes.length} {t(layout.nodes.length === 1 ? 'ui.commit' : 'ui.commits')}</span>
          <div className="graph-controls">
            <button type="button" onClick={() => setZoom((value) => Math.max(.65, value - .15))} aria-label={t('ui.zoomOut')}>−</button>
            <button type="button" onClick={resetView} aria-label={t('ui.resetView')}>{Math.round(zoom * 100)}%</button>
            <button type="button" onClick={() => setZoom((value) => Math.min(1.75, value + .15))} aria-label={t('ui.zoomIn')}>+</button>
          </div>
        </div>
      </div>
      <p className="sr-only" id="graph-summary">{summary}</p>
      <div className="graph-viewport" ref={viewportRef} role="img" aria-describedby="graph-summary" aria-label={t('ui.commitGraph')}>
        {layout.nodes.length === 0 ? <div className="graph-empty"><span>○</span><p>{t('ui.firstCommit')}</p></div> : (
          <svg width={layout.width * zoom} height={layout.height * zoom} viewBox={`0 0 ${layout.width} ${layout.height}`}>
            {layout.edges.map((edge) => (
              <path key={`${edge.from}-${edge.to}`} d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${edge.y2}`} fill="none" stroke="var(--border-strong)" strokeWidth="3" />
            ))}
            {layout.nodes.map((node) => {
              const commit = state.commits[node.id];
              const color = laneColors[node.lane % laneColors.length];
              const select = () => setSelectedId((current) => current === node.id ? null : node.id);
              return (
                <g key={node.id} className="graph-node" tabIndex={0} role="button" aria-pressed={selectedId === node.id} aria-label={`${node.id.slice(0, 7)} ${commit.message}${node.head ? ', HEAD' : ''}`} onClick={select} onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  select();
                }}>
                  <motion.circle cx={node.x} cy={node.y} r={node.head ? 11 : 8} fill="var(--bg-surface)" stroke={color} strokeWidth={node.head ? 5 : 3} initial={reduceMotion ? false : historyChanged ? { scale: 0, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduceMotion ? 0 : .32 }} />
                  <text x={node.x + 20} y={node.y - 4} className="graph-hash">{node.id.slice(0, 7)}</text>
                  <text x={node.x + 20} y={node.y + 14} className="graph-message">{commit.message}</text>
                  {node.refs.map((ref, index) => <text key={ref} x={node.x + 20 + index * 68} y={node.y - 20} className="graph-ref">{node.head && index === 0 ? `HEAD → ${ref}` : ref}</text>)}
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {effects.length > 0 && <p className="graph-effect-cue" aria-live="polite">{[...effectTypes].join(' · ')}</p>}
      {selected && <aside className="graph-details" aria-live="polite"><div><small>{t('ui.commitDetails')}</small><strong>{selected.message}</strong></div><code>{selected.id.slice(0, 12)}</code><span>{t('ui.parents')}: {selected.parents.length ? selected.parents.map((id) => id.slice(0, 7)).join(', ') : '∅'}</span><span>{t('ui.branches')}: {selectedNode?.refs.join(', ') || '∅'}</span></aside>}
    </section>
  );
}
