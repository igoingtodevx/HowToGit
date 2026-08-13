import { ancestorsOf, headCommitId, isAncestor, treeEquals, uniqueCommitsSince } from '../../engine';
import type { GitState } from '../../engine';
import type { ChallengeValidationResult, LessonValidator, ValidationContext, ValidatorId } from './types';

type Check = readonly [key: string, passed: boolean];

const result = (checks: readonly Check[]): ChallengeValidationResult => {
  const toItem = ([key]: Check) => ({ key, labelKey: `challenge.criteria.${key}` });
  const satisfied = checks.filter((check) => check[1]).map(toItem);
  const remaining = checks.filter((check) => !check[1]).map(toItem);
  return { complete: remaining.length === 0, satisfied, remaining, ...(remaining.length ? { feedbackKey: `challenge.feedback.${remaining[0].key}` } : {}) };
};

const branchTip = (state: GitState, name: string) => state.branches[name]?.target ?? null;
const headHas = (state: GitState, path: string) => {
  const head = headCommitId(state); return head !== null && state.commits[head]?.tree[path] !== undefined;
};
const symbolicOn = (state: GitState, branch: string) => state.head.kind === 'symbolic' && state.head.branch === branch;
const commandSeen = (context: ValidationContext, pattern: RegExp) => context.interaction.commands.some((command) => pattern.test(command));

const validators = {
  'validator-repo-initialized': ({ state }) => result([['repositoryInitialized', state.initialized && Boolean(state.branches.main)]]),
  'validator-first-commit': ({ state }) => result([
    ['commitReachable', branchTip(state, 'main') !== null], ['expectedFileCommitted', headHas(state, 'app.ts')], ['operationComplete', state.operation === null],
  ]),
  'validator-inspected-history': (context) => result([['historyInspected', context.interaction.logExecuted]]),
  'validator-on-feature-branch': ({ state }) => result([
    ['featureExists', Boolean(state.branches.feature)], ['headOnFeature', symbolicOn(state, 'feature')],
  ]),
  'validator-feature-two-commits': ({ state, initialState }) => {
    const tip = branchTip(state, 'feature'); const base = branchTip(initialState, 'main');
    return result([['featureExists', tip !== null], ['twoFeatureCommits', tip !== null && uniqueCommitsSince(state.commits, tip, base).length >= 2], ['mainUnmoved', branchTip(state, 'main') === base]]);
  },
  'validator-feature-merged': ({ state, initialState }) => {
    const feature = branchTip(initialState, 'feature'); const main = branchTip(state, 'main');
    return result([['headOnMain', symbolicOn(state, 'main')], ['featureIncluded', feature !== null && isAncestor(state.commits, feature, main)], ['operationComplete', state.operation === null]]);
  },
  'validator-conflict-resolved': ({ state, initialState }) => {
    const head = headCommitId(state); const originalMain = branchTip(initialState, 'main'); const feature = branchTip(initialState, 'feature');
    const parents = head ? state.commits[head]?.parents ?? [] : [];
    return result([['operationComplete', state.operation === null], ['mergeParentsPreserved', originalMain !== null && feature !== null && parents.includes(originalMain) && parents.includes(feature)], ['resolvedFileCommitted', headHas(state, 'app.ts')]]);
  },
  'validator-safe-undo-complete': (context) => result([
    ['resetCompared', context.interaction.undoResetSeen], ['revertCompared', context.interaction.undoRevertSeen], ['operationComplete', context.state.operation === null],
  ]),
  'validator-stash-roundtrip': ({ state, initialState, interaction }) => result([
    ['stashCreated', interaction.stashCreated], ['stashInspected', interaction.stashInspected], ['stashRestored', interaction.stashRestored], ['workingChangesRestored', treeEquals(state.workingTree, initialState.workingTree)],
  ]),
  'validator-remote-synced': ({ state, interaction }) => result([
    ['remoteFetched', interaction.fetched], ['remoteSynchronized', branchTip(state, 'main') === state.remotes.origin?.branches.main], ['operationComplete', state.operation === null],
  ]),
  'validator-rebase-clean-history': ({ state, initialState }) => {
    const oldTip = branchTip(initialState, 'feature'); const newTip = branchTip(state, 'feature'); const base = branchTip(initialState, 'main');
    const oldUnique = oldTip ? uniqueCommitsSince(initialState.commits, oldTip, base) : [];
    const newUnique = newTip ? uniqueCommitsSince(state.commits, newTip, base) : [];
    return result([['featureOnTargetBase', isAncestor(state.commits, base, newTip)], ['changesPreserved', oldTip !== null && newTip !== null && treeEquals(initialState.commits[oldTip].tree, state.commits[newTip].tree)], ['identitiesReplayed', newUnique.length > 0 && newUnique.every((id) => !oldUnique.includes(id))], ['historyRewritten', newUnique.length <= oldUnique.length], ['operationComplete', state.operation === null]]);
  },
  'validator-cherry-picked': ({ state, initialState }) => {
    const source = initialState.commits['source-hotfix']; const head = headCommitId(state);
    const reachable = ancestorsOf(state.commits, head);
    const equivalent = [...reachable].some((id) => id !== source?.id && source && treeEquals(state.commits[id].tree, source.tree));
    return result([['patchPresent', Boolean(equivalent)], ['newCommitIdentity', !reachable.has('source-hotfix')]]);
  },
  'validator-stash-managed': ({ state, interaction }) => result([
    ['stashNamed', state.stashes.some((entry) => entry.message !== 'WIP') || (interaction.stashCreated && interaction.stashRestored)], ['stashInspected', interaction.stashInspected],
  ]),
  'validator-reflog-recovered': ({ state, initialState, interaction }) => {
    const lost = initialState.reflog[0]?.oldTarget ?? null; const head = headCommitId(state);
    return result([['reflogInspected', commandSeen({ state, initialState, interaction }, /^git reflog$/)], ['lostHistoryReachable', lost !== null && isAncestor(state.commits, lost, head)]]);
  },
  'validator-detached-work-saved': ({ state }) => result([
    ['headSymbolic', state.head.kind === 'symbolic'], ['namedRescueBranch', state.head.kind === 'symbolic' && state.head.branch !== 'main'], ['workReachable', headCommitId(state) !== null],
  ]),
  'validator-advanced-merge': ({ state, initialState }) => {
    const head = headCommitId(state); const main = branchTip(initialState, 'main'); const feature = branchTip(initialState, 'feature');
    const parents = head ? state.commits[head]?.parents ?? [] : [];
    return result([['operationComplete', state.operation === null], ['mergeParentsPreserved', main !== null && feature !== null && parents.includes(main) && parents.includes(feature)], ['compatibleChangePreserved', headHas(state, 'feature.ts')], ['conflictResolved', headHas(state, 'app.ts')]]);
  },
  'validator-divergence-resolved': ({ state, interaction }) => result([
    ['remoteFetched', interaction.fetched], ['localRemoteEqual', branchTip(state, 'main') === state.remotes.origin?.branches.main], ['operationComplete', state.operation === null],
  ]),
  'validator-bisect-concept': ({ interaction }) => result([['firstBadIdentified', interaction.conceptAnswers.firstBadCorrect === true]]),
  'validator-submodule-concept': ({ interaction }) => result([['compositionClassified', interaction.conceptAnswers.submoduleSubtreeScore === 'full']]),
  'validator-internals-concept': ({ interaction }) => result([['objectChainCorrect', Array.isArray(interaction.conceptAnswers.internalsOrder) && interaction.conceptAnswers.internalsOrder.join('>') === 'blob>tree>commit>ref']]),
} satisfies Record<ValidatorId, LessonValidator>;

export const validatorRegistry: Readonly<Record<ValidatorId, LessonValidator>> = Object.freeze(validators);

export function validateLesson(validatorId: ValidatorId, context: ValidationContext): ChallengeValidationResult {
  const validator = validatorRegistry[validatorId];
  if (!validator) throw new Error(`Unknown validator: ${validatorId}`);
  return validator(context);
}

