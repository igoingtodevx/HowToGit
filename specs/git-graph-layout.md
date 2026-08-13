# Git Graph Layout Contract

## Goal

Deterministic, readable SVG DAG optimized for educational histories.

## Structure

Recommended orientation: newest near top, history downward; x = lane, y = topological/history row.

Node: circle + short hash + focus/hover + optional nearby message + ref/tag/HEAD badges.

Each parent relation is a real SVG edge. Merge commits have two ancestry edges.

## Lane assignment

Keep lane assignment stable across small updates:

- default/main prefers lane 0;
- preserve active branch lane when possible;
- allocate nearest free lane on divergence;
- release lanes only when no active ancestry path needs them;
- never randomize lanes/colors.

Stable layout is more important than perfectly imitating native `git log --graph`.

## Refs

- local branch labels anchored to target commit;
- remote refs visually distinct;
- symbolic HEAD visually connected to current branch;
- detached HEAD attaches directly to commit and says detached.

## Reachability

Reset/rebase must not imply unreachable commits ceased to exist. Normal graph may focus on reachable history while Time Machine/reflog exposes recoverable/orphaned commits.

## Interaction

- scroll/pan;
- zoom controls;
- reset viewport;
- keyboard-focusable commits;
- details popover;
- textual accessible graph summary.
