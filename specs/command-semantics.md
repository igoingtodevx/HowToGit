# Command Semantics

Support a deliberate subset and reject unsupported syntax clearly.

## Beginner-critical

- `git init`
- `git status` (`--short` optional if consistent)
- `git add <path...>` / `git add .` / optionally `-A`
- `git commit -m "..."`
- `git log` with `--oneline`, `--graph`, `--all`
- `git diff`, `git diff --staged|--cached`
- `git branch`, `git branch <name>`, `git branch -d <name>`
- `git switch <branch>`, `git switch -c <branch>`
- `git checkout <branch|commit>`, `git checkout -b <branch>`
- `git merge <branch>`
- `git reset [--soft|--mixed|--hard] <commit-ish>`
- `git revert <commit-ish>`
- `git stash`, `git stash -m "..."`, `git stash list`, `git stash pop`
- `git remote add <name> <url>`, `git remote -v`
- `git fetch [remote]`
- `git pull`
- `git push`, `git push -u <remote> <branch>`, `git push <remote> <branch>`

## Advanced

- `git tag`, `git tag <name> [commit-ish]`
- `git cherry-pick <commit-ish>`
- `git rebase <branch>`
- educational `git rebase -i <base>`
- `git reflog`

## Commit-ish resolution

At minimum:
- full deterministic hash;
- unique abbreviation;
- branch;
- tag;
- HEAD;
- `HEAD~N`;
- optionally `HEAD^`.

## Parser vs executor

Parser handles tokenization/quoting/flags/syntax and returns a discriminated union. Executor handles repository semantics and state transition.

## Important errors

Model clearly:
- not a repository;
- unknown branch/revision;
- nothing to commit;
- local changes would be overwritten;
- cannot delete current branch;
- unresolved conflicts;
- empty cherry-pick;
- non-fast-forward push;
- missing remote/upstream.

Noob Mode may add localized explanation, but terminal output remains Git-like English.
