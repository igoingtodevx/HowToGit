# Semantic Animation Effects

Animations consume `GitEffect[]`; never parse terminal strings to infer meaning.

## FILE_STAGED
Working-file version visually copies/moves into Staging Area. Do not imply the Working Tree file disappears.

## COMMIT_CREATED
Staged snapshot compresses/transforms into a commit node; branch pointer advances; HEAD follows symbolic branch.

## BRANCH_CREATED
New branch label appears at current commit. Do not animate a copied history.

## HEAD_MOVED
HEAD indicator moves to branch/commit target while branch refs remain distinct.

## MERGE_FAST_FORWARD
Current branch pointer travels along already-existing commits. **No fake merge node.**

## MERGE_COMMIT_CREATED
Two ancestry paths converge into a new two-parent node.

## CONFLICT_CREATED
Conflicting paths rise into a conflict surface showing base/ours/theirs. Graph remains at pre-merge state until resolution/commit.

## RESET_PERFORMED
- soft: pointer moves; staged zone visibly remains;
- mixed: pointer moves; former staged delta falls back to Working Tree;
- hard: pointer/index/worktree reconcile to target.

## STASH_CREATED / STASH_APPLIED
Local changes collapse into / expand from a visible stash stack.

## CHERRY_PICK_CREATED
Highlight source commit; its *change* travels to current branch; a new commit with new ID appears.

## COMMITS_REPLAYED
Unique commits lift/de-emphasize; changes replay in order on new base; new nodes/IDs settle.

## REMOTE_UPDATED
Remote-tracking ref moves independently from local branch.

## Reduced motion
Every semantic effect needs a no-travel alternative using highlight, labels and cross-fade.
