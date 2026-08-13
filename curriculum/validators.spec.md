# Validator Specification

Map each `validatorId` in `lessons.json` to a pure deterministic function.

## Beginner

- `validator-repo-initialized`: initialized and current main/unborn equivalent exists.
- `validator-first-commit`: reachable commit exists, expected file in HEAD tree, no unresolved operation.
- `validator-inspected-history`: deterministic interaction signal that log was executed.
- `validator-on-feature-branch`: branch `feature` exists and HEAD symbolic branch is feature.
- `validator-feature-two-commits`: at least two commits unique to feature since scenario base.
- `validator-feature-merged`: main includes intended feature changes, HEAD=main, no unresolved operation.
- `validator-conflict-resolved`: no unresolved conflict, merge ancestry includes both sides, resolved file committed.
- `validator-safe-undo-complete`: multi-step exercise proves semantic difference, not arbitrary endpoint only.
- `validator-stash-roundtrip`: stash created during lesson and target work restored.
- `validator-remote-synced`: local/remote refs satisfy scenario goal.

## Advanced

- `validator-rebase-clean-history`: feature descends from target main, semantic changes preserved, replayed IDs changed, requested squash/drop/reword represented.
- `validator-cherry-picked`: equivalent change exists on current branch with different commit ID.
- `validator-stash-managed`: intended stack/order/application goal reached.
- `validator-reflog-recovered`: lost commits reachable again from intended branch/ref.
- `validator-detached-work-saved`: experimental work now reachable from named branch and HEAD symbolic.
- `validator-advanced-merge`: conflict resolved and correct merge structure created.
- `validator-divergence-resolved`: local/remote relation matches target.
- conceptual validators (`bisect`, `submodules`, `internals`) use deterministic UI interactions/questions and are clearly labeled conceptual.
