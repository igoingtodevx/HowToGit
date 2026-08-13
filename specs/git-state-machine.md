# Git State Machine Specification

## Invariants

1. Every branch points to zero or one existing commit.
2. Symbolic HEAD points to a branch; detached HEAD points directly to a commit.
3. Every commit has an immutable tree snapshot and zero/one/multiple parent IDs.
4. Index and Working Tree are independent from commit objects.
5. Branch-pointer movement never mutates existing commits.
6. Commit objects may remain after no branch reaches them.
7. UI reachability is not object existence.
8. Reflog records meaningful HEAD/ref movement.

## HEAD states

- unborn symbolic HEAD: initialized repo, current branch has no commit;
- symbolic HEAD: attached to branch;
- detached HEAD: directly targets commit.

## Tree model

Use immutable mapping `path → {content, executable}`. Do not store derived `modified` status in commit trees.

Status derives by comparing:
- HEAD tree → index = staged changes;
- index → Working Tree = unstaged changes.

A file may have staged and unstaged changes simultaneously.

## Add

`git add <path>` copies the current Working Tree version into the index. Deletions are staged coherently.

## Commit

A commit snapshots the **index**, not arbitrary Working Tree state.

After a normal commit:
- new commit tree = index;
- parent = previous HEAD commit when present;
- current symbolic branch advances;
- Working Tree remains as-is;
- unstaged post-stage edits remain unstaged;
- reflog updates.

## Switch / checkout

Switching branch updates HEAD/index/worktree when safe. Refuse operations that would overwrite incompatible local changes under the simulator's supported safety model.

Checking out a raw commit enters detached HEAD.

## Merge

### Already up to date
If target is ancestor of current: no history mutation.

### Fast-forward
If current is ancestor of target: move current branch pointer to target; create no merge commit.

### True three-way merge
- compute merge base;
- merge base/current/target trees;
- no conflicts → create two-parent merge commit;
- conflicts → explicit operation/conflict state; no merge commit until resolved.

Conflict entry needs base/ours/theirs/resolved content/status.

## Reset

Target = T.

### soft
- branch/HEAD → T;
- index unchanged;
- Working Tree unchanged.

### mixed/default
- branch/HEAD → T;
- index = T.tree;
- Working Tree unchanged.

### hard
- branch/HEAD → T;
- index = T.tree;
- Working Tree = T.tree;
- incompatible merge/conflict state cleared.

Abandoned commits remain in object/reflog state.

## Revert

Compute inverse of target commit change relative to parent and create a **new** commit. Do not move history backward. Complex merge-commit revert may be explicitly unsupported.

## Cherry-pick

Replay target commit's change relative to its first parent onto current HEAD, producing a new commit ID. Handle/reject conflicts coherently.

## Rebase

1. compute merge base;
2. identify commits unique to current branch in replay order;
3. move conceptual base to target;
4. replay each change;
5. generate new IDs;
6. update branch;
7. write reflog;
8. emit ordered replay effects.

Educational interactive rebase may support pick/reword/squash/drop.

## Stash

Capture relevant index/Working Tree delta plus base identity. `stash pop` removes top entry only after successful application.

## Reflog

Record sequence, old target, new target, ref context, command/action, message and deterministic timestamp/order for commit/switch/reset/merge/rebase/cherry-pick and relevant ref movement.

## Remotes

Simulate separate remote refs/object namespace. At minimum model:
- remote add/list;
- remote branch tips;
- remote-tracking refs;
- fetch;
- push fast-forward checks;
- pull as fetch + integration according to supported semantics.

Local `main` and `origin/main` must remain separate visual/state concepts.
