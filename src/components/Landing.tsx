import { useEffect, useRef, useState } from 'react';
import { executeCommand } from '../../engine/commandExecutor';
import { createGitState, writeWorkingFile } from '../../engine/state';
import type { Locale } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import { createLessonScenario } from '../lessons';
import { useI18n } from '../i18n/i18n';
import { GitGraph } from './GitGraph';
import { GitXRay } from './GitXRay';

const delay = (milliseconds: number) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

export function Landing() {
  const { state, dispatch } = useAppState();
  const { locale, setLocale, t } = useI18n();
  const [running, setRunning] = useState(false);
  const runToken = useRef(0);
  useEffect(() => () => { runToken.current += 1; }, []);

  const completeOnboarding = (lessonId: 'b01' | 'b07') => {
    const scenario = createLessonScenario(lessonId);
    if (scenario) dispatch({ type: 'lesson/restarted', lessonId, git: scenario });
    dispatch({ type: 'onboarding/completed' });
  };

  const runDemo = async () => {
    if (running) return;
    const token = ++runToken.current;
    setRunning(true);
    let git = createGitState();
    const emit = async (effects: typeof state.effects = []) => {
      if (token !== runToken.current) return false;
      dispatch({ type: 'demo/state', git, effects });
      const reduced = typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
      await delay(reduced ? 20 : 560);
      return token === runToken.current;
    };
    if (!await emit()) return;
    let result = executeCommand(git, 'git init');
    git = result.nextState;
    if (!await emit(result.effects)) return;
    git = writeWorkingFile(git, 'app.ts', 'console.log("visible state");\n');
    if (!await emit([{ type: 'WORKTREE_CHANGED', paths: ['app.ts'] }])) return;
    result = executeCommand(git, 'git add app.ts');
    git = result.nextState;
    if (!await emit(result.effects)) return;
    result = executeCommand(git, 'git commit -m "See the snapshot"');
    git = result.nextState;
    if (!await emit(result.effects)) return;
    setRunning(false);
  };

  return (
    <main className="landing">
      <header className="landing-nav"><a className="brand" href="#hero"><span className="brand-mark">GF</span><span><b>{t('app.name')}</b><small>{t('ui.landingBrand')}</small></span></a><label className="language-select"><span>{t('language.label')}</span><select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}><option value="en">English</option><option value="de">Deutsch</option></select></label></header>
      <section className="landing-hero" id="hero"><div className="landing-copy"><p className="eyebrow">{t('hero.eyebrow')}</p><h1>{t('hero.title')}</h1><p>{t('hero.subtitle')}</p><div className="landing-actions"><button className="primary-button" type="button" onClick={() => completeOnboarding('b01')} disabled={running}>{t('hero.startZero')}</button><button className="ghost-button" type="button" onClick={() => completeOnboarding('b07')} disabled={running}>{t('hero.startAdvanced')}</button><button className="demo-button" type="button" onClick={runDemo} disabled={running}>{running ? t('ui.demoRunning') : t('hero.replay')}</button></div><p className="no-account">{t('ui.noAccount')}</p></div><aside className="landing-proof" aria-label={t('ui.liveSimulator')}><div className="proof-header"><span><i /> {t('ui.liveEngine')}</span><code>{state.git.initialized ? `${Object.keys(state.git.commits).length} ${t(Object.keys(state.git.commits).length === 1 ? 'ui.commit' : 'ui.commits')}` : t('ui.notInitialized')}</code></div><GitXRay state={state.git} effects={state.effects} /><GitGraph state={state.git} effects={state.effects} /><p className="proof-caption">{t('ui.proofCaption')} <code>git init → edit → git add → git commit</code></p></aside></section>
      <section className="landing-values"><article><span>01</span><h2>{t('ui.seeCausality')}</h2><p>{t('ui.seeCausalityBody')}</p></article><article><span>02</span><h2>{t('ui.trustSimulator')}</h2><p>{t('ui.trustSimulatorBody')}</p></article><article><span>03</span><h2>{t('ui.useAiSafely')}</h2><p>{t('ui.useAiSafelyBody')}</p></article></section>
    </main>
  );
}
