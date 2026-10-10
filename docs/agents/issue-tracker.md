# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`.
- **Read an issue**: `gh issue view <number> --comments`, also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments` with appropriate label and state filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close**: `gh issue close <number> --comment "..."`.

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with child issues as tickets.

- **Map**: create one issue labelled `wayfinder:map`, holding Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- **Child ticket**: link an issue to the map as a GitHub sub-issue through the sub-issues API. If sub-issues are unavailable, add the child to a task list in the map and put `Part of #<map>` at the top of the child body. Apply one of `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- **Blocking**: use GitHub's native issue dependencies. Post to `repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by` using the blocker's numeric database id. If dependencies are unavailable, add `Blocked by: #<n>, #<n>` at the top of the child body.
- **Frontier query**: list the map's open children, then exclude tickets with an open blocker or an assignee. The first remaining ticket in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me` must be the session's first write.
- **Resolve**: comment with the answer, close the ticket, then append a short linked context pointer to the map's Decisions so far.
