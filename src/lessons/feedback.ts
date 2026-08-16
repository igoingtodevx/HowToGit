/**
 * Educational feedback for terminal commands.
 *
 * The engine decides *what happened* (success / errorCode / effects).
 * This module only maps engine results to localized feedback keys and
 * derives lightweight "did you mean" corrections for obvious typos.
 * It never changes Git semantics — the engine remains the only truth.
 */

const GIT_VERBS = [
  'init', 'status', 'add', 'commit', 'log', 'diff', 'branch', 'switch',
  'checkout', 'merge', 'reset', 'revert', 'stash', 'tag', 'cherry-pick',
  'rebase', 'reflog', 'remote', 'fetch', 'pull', 'push',
];

/** errorCode → i18n feedback key. Unknown codes fall back to `errors.generic`. */
const ERROR_FEEDBACK: Readonly<Record<string, string>> = {
  NOT_A_REPOSITORY: 'errors.notARepository',
  NOTHING_TO_COMMIT: 'errors.nothingToCommit',
  UNSUPPORTED_SYNTAX: 'errors.unsupportedSyntax',
  UNRESOLVED_CONFLICTS: 'errors.unresolvedConflicts',
  CONFLICT_NOT_EDITED: 'errors.conflictNotEdited',
  OPERATION_IN_PROGRESS: 'errors.operationInProgress',
  UNKNOWN_BRANCH: 'errors.unknownBranch',
  UNKNOWN_REVISION: 'errors.unknownRevision',
  PATHSPEC_NOT_FOUND: 'errors.pathspecNotFound',
  LOCAL_CHANGES_OVERWRITTEN: 'errors.localChangesOverwritten',
  NO_UPSTREAM: 'errors.noUpstream',
  NON_FAST_FORWARD: 'errors.nonFastForward',
  NO_STASH: 'errors.noStash',
  BRANCH_EXISTS: 'errors.branchExists',
  DELETE_CURRENT_BRANCH: 'errors.deleteCurrentBranch',
  NO_CURRENT_BRANCH: 'errors.noCurrentBranch',
  DETACHED_MERGE: 'errors.detachedMerge',
  DETACHED_REBASE: 'errors.detachedRebase',
  TAG_EXISTS: 'errors.tagExists',
  REMOTE_EXISTS: 'errors.remoteExists',
  UNKNOWN_REMOTE: 'errors.unknownRemote',
  EMPTY_CHERRY_PICK: 'errors.emptyCherryPick',
  MERGE_CHERRY_PICK_UNSUPPORTED: 'errors.operationBlocked',
  MERGE_REVERT_UNSUPPORTED: 'errors.operationBlocked',
  CHERRY_PICK_CONFLICT: 'errors.conflictCreated',
  REVERT_CONFLICT: 'errors.conflictCreated',
  STASH_POP_CONFLICT: 'errors.conflictCreated',
  REBASE_CONFLICT: 'errors.conflictCreated',
  INTERACTIVE_REBASE_UI_REQUIRED: 'errors.interactiveRebaseUi',
  INVALID_REBASE_PLAN: 'errors.invalidRebasePlan',
};

/** All errorCodes the engine can produce; keeps the map above honest. */
export const KNOWN_ERROR_CODES = Object.keys(ERROR_FEEDBACK);

const levenshtein = (left: string, right: string): number => {
  if (Math.abs(left.length - right.length) > 2) return 3;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[right.length];
};

const tokensOf = (input: string): string[] => input.toLowerCase().split(/\s+/).filter(Boolean);

/** Variants of a verb token: as typed, and each single adjacent-character swap. */
const candidateSpellings = (token: string): string[] => {
  const candidates = [token];
  for (let i = 0; i < token.length - 1; i += 1) {
    candidates.push(`${token.slice(0, i)}${token[i + 1]}${token[i]}${token.slice(i + 2)}`);
  }
  return candidates;
};

/** Returns `git <verb>` when the learner's verb is one typo away from a known Git verb. */
export function correctionFor(input: string): string | undefined {
  const tokens = tokensOf(input);
  if (tokens[0] !== 'git' || !tokens[1]) return undefined;
  const verb = tokens[1];
  if (GIT_VERBS.includes(verb)) return undefined;
  for (const spelling of candidateSpellings(verb)) {
    for (const known of GIT_VERBS) {
      if (spelling === known || (spelling.length >= 3 && levenshtein(spelling, known) <= 1)) {
        return `git ${known}`;
      }
    }
  }
  return undefined;
}

export interface CommandFeedback {
  /** i18n key of the educational explanation to show under the command. */
  feedbackKey?: string;
  /** `git <verb>` the learner probably meant; presented as a fill-in, not auto-run. */
  correction?: string;
}

/** Feedback for a failed command. Success feedback is derived from effects instead. */
export function feedbackFor(input: string, errorCode?: string): CommandFeedback {
  if (!errorCode) return {};
  const tokens = tokensOf(input);
  if (tokens[0] !== 'git') return { feedbackKey: 'errors.notGit' };
  if (errorCode === 'UNSUPPORTED_SYNTAX') {
    const correction = correctionFor(input);
    if (correction) return { feedbackKey: 'errors.typo', correction };
  }
  return { feedbackKey: ERROR_FEEDBACK[errorCode] ?? 'errors.generic' };
}
