import { executeCommand } from './commandExecutor';
import { cloneState } from './state';
import type { CommandPreview, GitState, RiskLevel } from './types';

export const riskForCommand = (command: string): RiskLevel => {
  if (/^git\s+(reset\s+--hard|rebase)/.test(command)) return 'destructive';
  if (/^git\s+(merge|reset|revert|stash\s+pop|cherry-pick|pull|push|checkout|switch)/.test(command)) return 'caution';
  return 'safe';
};

export const previewCommand = (state: GitState, command: string): CommandPreview => ({
  command,
  risk: riskForCommand(command),
  result: executeCommand(cloneState(state), command),
  summaryKey: `commandLens.${riskForCommand(command)}`,
});
