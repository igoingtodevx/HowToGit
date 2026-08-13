import type { Locale, LearningMode, RiskLevel } from '../engine/types';

export type TutorIntent =
  | 'ASK_GIT'
  | 'EXPLAIN_SELECTION'
  | 'DIAGNOSE_STATE'
  | 'FIX_REPO'
  | 'EXPLAIN_MISTAKE'
  | 'PREVIEW_COMMAND';

export interface AITutorContext {
  locale: Locale;
  mode: LearningMode;
  intent: TutorIntent;
  currentLesson?: { id: string; objective: string; concepts: string[] };
  repo: {
    initialized: boolean;
    currentBranch: string | null;
    detachedHead: string | null;
    headCommit: string | null;
    branches: Array<{ name: string; tip: string | null }>;
    recentCommits: Array<{ id: string; message: string; parents: string[] }>;
    workingTree: Array<{ path: string; status: string }>;
    staged: Array<{ path: string; status: string }>;
    conflicts: Array<{ path: string; resolved: boolean }>;
    remotes: Array<{ name: string; trackedBranches: string[] }>;
  };
  recentCommands: Array<{ input: string; success: boolean; errorCode?: string }>;
  supportedCommandFamilies: string[];
}

export interface TutorCommandSuggestion { command: string; purpose: string; risk: RiskLevel; }
export interface GitTutorResponse {
  explanation: string;
  diagnosis?: string;
  commands: TutorCommandSuggestion[];
  concepts?: string[];
  nextQuestion?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isRisk = (v: unknown): v is RiskLevel => v === 'safe' || v === 'caution' || v === 'destructive';
const isSuggestion = (v: unknown): v is TutorCommandSuggestion => {
  if (!isRecord(v)) return false;
  return typeof v.command === 'string' && v.command.length > 0 && v.command.length <= 240 &&
    typeof v.purpose === 'string' && isRisk(v.risk);
};

export const isGitTutorResponse = (v: unknown): v is GitTutorResponse => {
  if (!isRecord(v) || typeof v.explanation !== 'string') return false;
  if (v.diagnosis !== undefined && typeof v.diagnosis !== 'string') return false;
  if (!Array.isArray(v.commands) || !v.commands.every(isSuggestion)) return false;
  if (v.concepts !== undefined && !isStringArray(v.concepts)) return false;
  if (v.nextQuestion !== undefined && typeof v.nextQuestion !== 'string') return false;
  return true;
};
