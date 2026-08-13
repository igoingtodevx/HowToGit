import { createContext, type Dispatch, type PropsWithChildren, useContext, useEffect, useReducer } from 'react';
import type { AppAction } from './actions';
import { appReducer } from './appReducer';
import { createInitialAppState, type AppState } from './appState';
import { detectBrowserLocale, getStorage, loadLabState, loadPreferences, saveLabState, savePreferences } from './persistence';

interface AppStateContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function initializeState(): AppState {
  const preferences = loadPreferences(getStorage());
  return createInitialAppState(
    preferences.locale ?? detectBrowserLocale(),
    preferences.progress,
    preferences.mode,
    loadLabState(getStorage()),
    preferences.onboarded,
  );
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, undefined, initializeState);

  useEffect(() => {
    savePreferences(getStorage(), {
      locale: state.locale,
      mode: state.mode,
      progress: state.progress,
      onboarded: state.onboarded,
    });
  }, [state.locale, state.mode, state.progress, state.onboarded]);

  useEffect(() => {
    saveLabState(getStorage(), state.git);
  }, [state.git]);

  return <AppStateContext.Provider value={{ state, dispatch }}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
