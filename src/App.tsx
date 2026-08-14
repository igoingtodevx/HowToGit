import { useEffect, useRef, useState } from 'react';
import type { LearningMode, Locale } from '../engine/types';
import { useAppState } from './application/AppStateProvider';
import { CommandLens } from './components/CommandLens';
import { AITutor } from './components/AITutor';
import { ConflictPanel } from './components/ConflictPanel';
import { FileEditor } from './components/FileEditor';
import { GitGraph } from './components/GitGraph';
import { GitXRay } from './components/GitXRay';
import { GuidedMission } from './components/GuidedMission';
import { LessonNavigation, LessonPanel } from './components/LessonPanel';
import { Landing } from './components/Landing';
import { Terminal } from './components/Terminal';
import { TimeMachine } from './components/TimeMachine';
import { useI18n } from './i18n/i18n';
import './styles/guided.css';

const guidedFileLessons = new Set(['b02', 'b05', 'b07', 'b09']);
const guidedGraphLessons = new Set(['b03', 'b04', 'b05', 'b06', 'b07', 'b08', 'b10']);

export default function App() {
  const { state, dispatch } = useAppState();
  const { locale, setLocale, t } = useI18n();
  const [command, setCommand] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [mobileViewport, setMobileViewport] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const query = globalThis.matchMedia('(max-width: 760px)');
    const update = () => setMobileViewport(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    const handleDrawerKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (!mobileViewport || event.key !== 'Tab') return;
      const focusable = [...(sidebarRef.current?.querySelectorAll<HTMLElement>('button, a, select, input, [tabindex]:not([tabindex="-1"])') ?? [])].filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    globalThis.addEventListener('keydown', handleDrawerKeys);
    if (mobileViewport) globalThis.requestAnimationFrame(() => sidebarRef.current?.querySelector<HTMLElement>('button')?.focus());
    return () => globalThis.removeEventListener('keydown', handleDrawerKeys);
  }, [mobileViewport, navOpen]);

  if (!state.onboarded) return <Landing />;

  const changeMode = (mode: LearningMode) => dispatch({ type: 'mode/changed', mode });
  const changeLocale = (nextLocale: Locale) => setLocale(nextLocale);
  const guidedBeginner = state.mode === 'noob' && /^b(?:0[1-9]|10)$/.test(state.activeLessonId);
  const showGuidedFiles = guidedFileLessons.has(state.activeLessonId);
  const showGuidedGraph = guidedGraphLessons.has(state.activeLessonId);

  return (
    <div className={`app-shell mode-${state.mode}`}>
      <a className="skip-link" href="#workspace">{t('shell.skipToContent')}</a>
      <aside ref={sidebarRef} className={navOpen ? 'sidebar sidebar-open' : 'sidebar'} aria-label={t('shell.primaryNavigation')} aria-modal={mobileViewport && navOpen ? true : undefined} inert={mobileViewport && !navOpen ? true : undefined} role={mobileViewport && navOpen ? 'dialog' : undefined}>
        <div className="sidebar-top"><a className="brand" href="#workspace"><span className="brand-mark" aria-hidden="true">GF</span><span><b>{t('app.name')}</b><small>{t('ui.brandSubtitle')}</small></span></a><button className="mobile-close" type="button" onClick={() => { setNavOpen(false); menuButtonRef.current?.focus(); }} aria-label={t('ui.closeNavigation')}>×</button></div>
        <LessonNavigation />
        <div className="sidebar-settings">
          <fieldset className="segmented-control"><legend>{t('shell.learningMode')}</legend>{(['noob', 'pro'] as const).map((mode) => <button aria-pressed={state.mode === mode} className={state.mode === mode ? 'segment segment-active' : 'segment'} key={mode} onClick={() => changeMode(mode)} type="button">{t(`mode.${mode}`)}</button>)}</fieldset>
          <label className="language-select"><span>{t('language.label')}</span><select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}><option value="en">English</option><option value="de">Deutsch</option></select></label>
        </div>
      </aside>

      <main className="workspace" id="workspace" tabIndex={-1}>
        <header className="workspace-toolbar"><button ref={menuButtonRef} className="mobile-menu" type="button" onClick={() => setNavOpen(true)} aria-expanded={navOpen} aria-label={t('ui.openLessons')}>☰</button><div><span className="workspace-status"><i /> {t('ui.engineReady')}</span><span className="repo-status">{state.git.initialized ? `${Object.keys(state.git.commits).length} ${t(Object.keys(state.git.commits).length === 1 ? 'ui.commit' : 'ui.commits')} · ${state.git.head.kind === 'detached' ? 'detached HEAD' : state.git.head.branch}` : t('ui.notInitialized')}</span></div><div className="toolbar-actions"><button type="button" className="ghost-button" onClick={() => dispatch({ type: 'lab/reset' })}>{t('ui.resetLab')}</button>{!guidedBeginner && <a className="ghost-button" href="#timeMachine">{t('nav.timeMachine')}</a>}</div></header>

        {guidedBeginner ? (
          <>
            <GuidedMission />

            <section className="guided-practice-shell" aria-labelledby="guided-practice-title">
              <div className="guided-section-heading">
                <span aria-hidden="true">02</span>
                <div><small>{t('lesson.tryIt')}</small><h2 id="guided-practice-title">{t('terminal.title')}</h2><p>{t('ui.terminalLocal')}</p></div>
              </div>
              <Terminal commandValue={command} onCommandValue={setCommand} />
            </section>

            <section className="guided-visual-shell" aria-labelledby="guided-visual-title">
              <div className="guided-section-heading">
                <span aria-hidden="true">03</span>
                <div><small>{t('lesson.progress')}</small><h2 id="guided-visual-title">{t('shell.gitZones')}</h2><p>{t('ui.xraySignature')}</p></div>
              </div>
              <GitXRay state={state.git} effects={state.effects} />
              {showGuidedGraph && <GitGraph state={state.git} effects={state.effects} />}
              {showGuidedFiles && <FileEditor state={state.git} />}
              <ConflictPanel state={state.git} />
            </section>
          </>
        ) : (
          <>
            <LessonPanel />
            <GitXRay state={state.git} effects={state.effects} />
            <div className="workspace-grid"><GitGraph state={state.git} effects={state.effects} /><FileEditor state={state.git} /></div>
            <ConflictPanel state={state.git} />
            <CommandLens command={command} onCommand={setCommand} />
            <Terminal commandValue={command} onCommandValue={setCommand} />
            <AITutor onCommand={setCommand} />
            <TimeMachine state={state.git} onCommand={setCommand} />
          </>
        )}

        <footer><span>GitFlow Academy</span><p>{t('ui.footerTruth')}</p><button type="button" onClick={() => changeLocale(locale === 'en' ? 'de' : 'en')}>{locale.toUpperCase()}</button></footer>
      </main>
      {navOpen && <button className="nav-backdrop" aria-label={t('ui.closeNavigation')} onClick={() => { setNavOpen(false); menuButtonRef.current?.focus(); }} />}
    </div>
  );
}
