import { useEffect, useRef, useState } from 'react';
import type { GitState } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import { useI18n } from '../i18n/i18n';

export function FileEditor({ state }: { state: GitState }) {
  const { dispatch } = useAppState();
  const { t } = useI18n();
  const firstPath = Object.keys(state.workingTree)[0] ?? 'app.ts';
  const [path, setPath] = useState(firstPath);
  const current = state.workingTree[path]?.content ?? '';
  const [content, setContent] = useState(current);
  const previousTree = useRef(state.workingTree);
  useEffect(() => {
    const before = previousTree.current;
    previousTree.current = state.workingTree;
    if (before[path]?.content === state.workingTree[path]?.content && (before[path] || !state.workingTree[path])) return;
    const nextPath = state.workingTree[path] ? path : Object.keys(state.workingTree)[0] ?? 'app.ts';
    setPath(nextPath);
    setContent(state.workingTree[nextPath]?.content ?? '');
  }, [state.workingTree, path]);
  return (
    <section className="panel editor-panel" aria-labelledby="editor-title">
      <div className="panel-heading compact"><div><p className="panel-kicker">{t('ui.virtualFile')}</p><h2 id="editor-title">{t('ui.fileEditor')}</h2></div><span className="editor-dirty">{t('ui.editable')}</span></div>
      <label className="field-label">{t('ui.filename')}<input value={path} onChange={(event) => { setPath(event.target.value); setContent(state.workingTree[event.target.value]?.content ?? ''); }} /></label>
      <label className="field-label">{t('ui.content')}<textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} /></label>
      <div className="button-row"><button className="primary-button" type="button" onClick={() => dispatch({ type: 'file/edited', path, content })}>{t('ui.saveChange')}</button>{state.workingTree[path] && <button className="ghost-button" type="button" onClick={() => dispatch({ type: 'file/deleted', path })}>{t('ui.deleteFile')}</button>}</div>
    </section>
  );
}
