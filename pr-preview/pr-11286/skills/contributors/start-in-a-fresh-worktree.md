---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/skills/contributors/start-in-a-fresh-worktree.md
---
# Start In A Fresh Worktree

Use this skill at the start of every session contributing to WarpDrive itself, before reading
code or making any change. Each session gets its own `git worktree` branched from a freshly
fetched `origin/main` — never the shared primary checkout, and never whatever commit that
checkout's `HEAD` happens to be parked on.

## Steps

1. Don't work in the primary checkout, even for a "quick" one-file change. `pnpm install` in this
   repo also builds every package and rewrites hardlinks into the `node_modules` of every other
   package and test app that depends on it (see
   [Setting Up The Project](/guides/contributing/setting-up-the-project.md)), so two sessions
   installing or building in the same checkout clobber each other's build output — and the
   failures show up later as stale or half-written `dist` content, not as an obvious conflict.
2. Branch from a freshly fetched `origin/main`, not from the current `HEAD`. Any long-lived
   checkout is usually sitting on an unrelated feature branch; branching off it silently folds
   someone else's unmerged commits into your diff and your PR. `main` is also the branch PRs
   target, so branching anywhere else guarantees an unnecessary rebase.

   ```sh
   git fetch origin main
   git worktree add -b <branch-name> ../warp-drive-worktrees/<topic> origin/main
   ```
3. Always make the worktree a **sibling** of the repo, under `../warp-drive-worktrees/<topic>`,
   never a directory nested inside it. This is not a tidiness preference — Node's resolution
   algorithm searches *upward* for `node_modules`, so a worktree at `<repo>/anything/my-worktree`
   silently resolves any dependency or `bin` its own install hasn't provided from
   `<repo>/node_modules` — the primary checkout's tree. Three properties of this repo turn that
   into a wrong answer rather than an error: `pnpm-workspace.yaml` sets `hoist: false` and uses
   injected workspace packages specifically to keep each test app's dep tree isolated, `pnpm
   install` hardlinks built output into consumers' `node_modules`, and the packages lean on
   branded types. So a nested worktree gets the other checkout's `dist`, mismatched versions,
   duplicate modules in a bundle, and private-brand type errors that point nowhere near the
   cause. A sibling has no shared ancestor holding a `node_modules`, so resolution can't cross
   over. Keeping every worktree under the one `../warp-drive-worktrees/` directory, rather than
   scattered siblings named after each topic, is also what lets the pruning in the next step tell
   its own worktrees apart from a checkout you created some other way.

   Nesting is also the *default* for Claude Code's own worktree mechanisms — `--worktree`,
   `EnterWorktree`, and `Agent` with `isolation: "worktree"`. This repo replaces that default with
   a `WorktreeCreate` hook (`.claude/settings.json`, `scripts/worktree-create.sh`) that lands every
   worktree those mechanisms create at `../warp-drive-worktrees/<name>` instead, branched from a
   freshly fetched `origin/main` — the same place and the same base as the command above. So
   `--worktree <topic>`, asking Claude mid-session to work in a worktree, and subagent
   `isolation: "worktree"` are all safe to use directly here instead of running `git worktree add`
   by hand; use whichever is more convenient. `.gitignore` still ignores `.claude/worktrees/` as a
   backstop for a nested one that shows up anyway — a different repo, a session where the hook
   didn't run — but that entry is damage control, not the expected path.
4. Install from the new worktree's root. `node_modules` is not shared between worktrees, so a
   fresh worktree has no dependencies and no built packages at all until you install:

   ```sh
   cd ../warp-drive-worktrees/<topic>
   pnpm install
   ```

   Two setup steps are *not* per-worktree and don't need repeating: `mise install` fetches the
   pinned `node`/`pnpm`/`bun` toolchain globally, and `@warp-drive/holodeck`'s
   `ensure-cert` writes `holodeck-localhost.pem` into your home directory. Only run those if
   you've never set the project up on this machine.
5. Run every command from the worktree root for the rest of the session, and don't `cd` back into
   the primary checkout to run tests, lint, or builds — that reintroduces exactly the
   cross-session build clobbering the worktree exists to prevent.
6. Remember that some git state is shared across all worktrees of a repo, not isolated by one.
   The stash stack is global: a bare `git stash pop` can restore another session's work into your
   tree, so set work aside with a temporary WIP commit instead, or use
   `git stash push -u -m "<unique-tag>"` and `git stash apply <sha>` against the entry you can
   identify by tag. Branch checkouts are also global — a branch already checked out in another
   worktree cannot be checked out in yours.
7. Clean up once the PR merges, so the next session's `git worktree list` stays readable:

   ```sh
   git worktree remove ../warp-drive-worktrees/<topic>
   git worktree prune
   ```

   A worktree a session created for itself automatically, rather than one you named for a topic,
   doesn't need this: a `SessionStart` hook (`scripts/session-worktree.sh`) prunes those on a
   later session's startup once they're clean and their commits are merged into `main` or pushed
   to a branch elsewhere, so nothing is deleted while it's the only copy of unpushed work.

## Why "fresh" and "off main" are separate requirements

They fail in different ways. Reusing an existing worktree gets you a dirty tree, stale
`node_modules`, and leftover build output from unrelated work — a green local test run there tells
you nothing about your change. Branching off the wrong commit gets you a *clean* worktree whose
diff against `main` contains commits you never wrote; that one survives all local verification and
only surfaces in review, as a PR touching files the task never mentioned.
