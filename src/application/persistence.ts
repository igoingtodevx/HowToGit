import type { GitState, LearningMode, LessonProgress, Locale } from '../../engine/types';
import { validateState } from '../../engine/state';

const STORAGE_KEY = 'gitflow-academy:preferences:v1';
const LAB_STORAGE_KEY = 'gitflow-academy:lab:v1';

interface PersistedPreferences {
  locale?: Locale;
  mode?: LearningMode;
  progress?: Record<string, LessonProgress>;
  onboarded?: boolean;
}

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'de';
}

function isLearningMode(value: unknown): value is LearningMode {
  return value === 'noob' || value === 'pro';
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function isHydratableGitState(value: unknown): value is GitState {
  if (!isRecord(value) || typeof value.initialized !== 'boolean' || typeof value.sequence !== 'number') return false;
  if (!isRecord(value.commits) || !isRecord(value.branches) || !isRecord(value.tags) || !isRecord(value.index) || !isRecord(value.workingTree)) return false;
  if (!isRecord(value.head) || !['symbolic', 'detached', 'unborn'].includes(String(value.head.kind))) return false;
  if (!Array.isArray(value.stashes) || !Array.isArray(value.reflog) || !isRecord(value.remotes) || !isRecord(value.remoteTrackingBranches)) return false;
  if (value.operation !== null && !isRecord(value.operation)) return false;
  try {
    return validateState(value as unknown as GitState).length === 0;
  } catch {
    return false;
  }
}

export function detectBrowserLocale(language?: string): Locale {
  const browserLanguage = language ?? (typeof navigator === 'undefined' ? '' : navigator.language);
  return browserLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function loadPreferences(storage: Pick<Storage, 'getItem'> | undefined): PersistedPreferences {
  if (!storage) return {};

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...(isLocale(parsed.locale) ? { locale: parsed.locale } : {}),
      ...(isLearningMode(parsed.mode) ? { mode: parsed.mode } : {}),
      ...(parsed.progress && typeof parsed.progress === 'object'
        ? { progress: parsed.progress as Record<string, LessonProgress> }
        : {}),
      ...(typeof parsed.onboarded === 'boolean' ? { onboarded: parsed.onboarded } : {}),
    };
  } catch {
    return {};
  }
}

export function savePreferences(
  storage: Pick<Storage, 'setItem'> | undefined,
  preferences: Required<PersistedPreferences>,
): void {
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable in privacy mode; the app remains usable in memory.
  }
}

export function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadLabState(storage: Pick<Storage, 'getItem'> | undefined): GitState | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(LAB_STORAGE_KEY);
    if (!raw) return undefined;
    const envelope = JSON.parse(raw) as { version?: unknown; git?: unknown };
    if (envelope.version !== 1 || !isHydratableGitState(envelope.git)) return undefined;
    return envelope.git;
  } catch {
    return undefined;
  }
}

export function saveLabState(storage: Pick<Storage, 'setItem'> | undefined, git: GitState): void {
  if (!storage) return;
  try {
    storage.setItem(LAB_STORAGE_KEY, JSON.stringify({ version: 1, git }));
  } catch {
    // Persistence is progressive enhancement; the in-memory simulator remains usable.
  }
}
