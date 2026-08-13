import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import type { Locale } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import de from './de.json';
import en from './en.json';

type Catalog = Record<string, unknown>;
type Translate = (key: string) => string;

const catalogs: Record<Locale, Catalog> = { en, de };
const I18nContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: Translate; tArray: (key: string) => string[] } | null>(null);

function resolveMessage(catalog: Catalog, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Catalog)[segment];
  }, catalog);

  return typeof value === 'string' ? value : undefined;
}

function resolveArray(catalog: Catalog, key: string): string[] | undefined {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Catalog)[segment];
  }, catalog);
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

export function I18nProvider({ children }: PropsWithChildren) {
  const { state, dispatch } = useAppState();

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  const value = useMemo(() => ({
    locale: state.locale,
    setLocale: (locale: Locale) => dispatch({ type: 'locale/changed', locale }),
    t: (key: string) => resolveMessage(catalogs[state.locale], key) ?? resolveMessage(en, key) ?? key,
    tArray: (key: string) => resolveArray(catalogs[state.locale], key) ?? resolveArray(en, key) ?? [],
  }), [dispatch, state.locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
