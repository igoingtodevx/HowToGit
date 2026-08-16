import { createContext, type PropsWithChildren, useContext, useEffect, useMemo } from 'react';
import type { Locale } from '../../engine/types';
import { useAppState } from '../application/AppStateProvider';
import de from './de.json';
import en from './en.json';

type Catalog = Record<string, unknown>;
type TranslateParams = Record<string, string | number>;
type Translate = (key: string, params?: TranslateParams) => string;

const catalogs: Record<Locale, Catalog> = { en, de };
const I18nContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: Translate; tArray: (key: string) => string[] } | null>(null);

const ARRAY_INDEX_PATTERN = /^(\w+)\[(\d+)\]$/;

function resolvePath(catalog: Catalog, key: string): string | string[] | undefined {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    const indexMatch = ARRAY_INDEX_PATTERN.exec(segment);
    if (indexMatch) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
      const child = (current as Catalog)[indexMatch[1]];
      return Array.isArray(child) ? child[Number(indexMatch[2])] : undefined;
    }
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Catalog)[segment];
  }, catalog);
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value as string[];
  return undefined;
}

function resolveMessage(catalog: Catalog, key: string): string | undefined {
  const value = resolvePath(catalog, key);
  return typeof value === 'string' ? value : undefined;
}

function resolveArray(catalog: Catalog, key: string): string[] | undefined {
  const value = resolvePath(catalog, key);
  return Array.isArray(value) ? value : undefined;
}

const interpolate = (message: string, params?: TranslateParams): string => {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
};

export function I18nProvider({ children }: PropsWithChildren) {
  const { state, dispatch } = useAppState();

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  const value = useMemo(() => ({
    locale: state.locale,
    setLocale: (locale: Locale) => dispatch({ type: 'locale/changed', locale }),
    t: (key: string, params?: TranslateParams) => {
      const message = resolveMessage(catalogs[state.locale], key) ?? resolveMessage(en, key) ?? key;
      return interpolate(message, params);
    },
    tArray: (key: string) => resolveArray(catalogs[state.locale], key) ?? resolveArray(en, key) ?? [],
  }), [dispatch, state.locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
