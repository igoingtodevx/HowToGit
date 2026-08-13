# Engine Test Specification

Use deterministic fixtures and pure transitions.

## Basics
- init / repeated init / unborn main;
- add tracked/untracked/deleted paths and `.`;
- staged copy is snapshot at add time;
- commit fails with empty staged diff;
- root/parent commits;
- commit snapshots index, not Working Tree;
- status/diff: clean, untracked, staged, unstaged, staged+unstaged same file, deletion, conflict.

## Branch / checkout
- create at HEAD;
- switch symbolic HEAD;
- checkout raw commit → detached HEAD;
- unsafe overwrite rejected;
- switch -c / checkout -b;
- current branch cannot be deleted.

## Merge
- fast-forward creates no merge commit;
- already-up-to-date no mutation;
- true merge computes merge base and produces two-parent node;
- non-conflicting tree combination;
- conflict stores base/ours/theirs;
- no merge commit before resolution;
- resolve + stage + commit completes merge.

## Reset
- soft = pointer only;
- mixed = pointer + index;
- hard = pointer + index + worktree;
- reflog updates;
- abandoned commits stay recoverable.

## Revert
- new commit;
- inverse semantic change;
- original history remains.

## Stash
- create/list ordering;
- expected clean state;
- pop applies;
- failed pop does not destroy stash.

## Cherry-pick
- applies source patch;
- new ID;
- parent = current HEAD;
- conflict path coherent.

## Rebase
- merge base;
- unique commit selection/order;
- replayed new IDs;
- ref movement + reflog;
- interactive pick/reword/squash/drop if supported.

## Reflog
Cover commit, switch, reset, merge, rebase and recovery target resolution.

## Remotes
- add/list;
- fetch changes remote-tracking refs, not local branch;
- push fast-forward;
- non-fast-forward rejection;
- pull integration;
- local and origin refs remain distinct.

## Preview
For representative commands, preview must not mutate live state and predicted next state must equal subsequent real execution from the same input state.

## Reusable invariants
- every parent ID exists;
- all branch/tag refs resolve;
- symbolic HEAD branch exists;
- unique commit IDs;
- immutable commit trees;
- explicit conflicts correspond to operation state.
