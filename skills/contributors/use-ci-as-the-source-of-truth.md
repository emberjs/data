---
url: >-
  https://canary.warp-drive.io/skills/contributors/use-ci-as-the-source-of-truth.md
---
# Use CI as the Source of Truth

Use this skill whenever you're ready to test a change in this repo — the moment you'd otherwise
reach for a local test run, lint, or build to check your work. Check this every single time that
moment arrives, not just once per session: it's easy to read this table at the start of a task
that looked like docs-only or config-only, then reach for `mocha`/`oxlint`/`eslint`/`pnpm test`
later without circling back, because nothing prompts you to re-check once you're mid-task and
already running commands.

## Steps

1. Before running any checks locally, make sure your change is on an open PR. If there isn't one
   yet, commit and push your branch and open one first.
   [Submitting PRs](/guides/contributing/submitting-prs.md#making-a-pr) covers the target
   branch, draft state, the pull request template, and labels.
2. Commit and push to that PR before checking whether the change works. Push first, verify second
   — don't spend a round of local iteration and then push once everything already looks green
   locally.
3. Treat CI as the primary feedback loop. Read the check results on the PR rather than
   reproducing the same test scenarios locally — CI runs the full matrix of test apps and
   environments this repo covers (see
   [Submitting PRs](/guides/contributing/submitting-prs.md)), which is more than any single local
   run gives you.
4. If you know you're not done — more commits are coming, or you're still waiting on CI to tell
   you what's broken — mark the PR as a draft. A draft PR is still the right place to push
   intermediate commits and read CI feedback from; it just signals to reviewers that it isn't
   ready for their attention yet. Mark it ready for review only once CI is green and you consider
   the change complete — which includes any documentation the change affects; run through the
   [Cross-Documentation Checklist](/guides/contributing/writing-documentation/index.md#cross-documentation-checklist)
   and, if anything is due, follow [Write Documentation](./write-documentation.md) before you
   flip the PR out of draft.

## Why push first

Reproducing CI's checks locally before every push duplicates work CI already does for you, and a
local pass doesn't guarantee a CI pass — the two environments can differ. Pushing first and
reading CI's results treats CI as authoritative: it either confirms the change works or tells you
exactly what to fix next, without you needing to separately maintain a local approximation of the
same signal.
