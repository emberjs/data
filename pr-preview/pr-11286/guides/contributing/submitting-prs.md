---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/contributing/submitting-prs.md
description: >-
  Open a PR against WarpDrive main with the right tests, a title like `feat:
  ...` that auto-applies its `:label:` changelog label, and `target:` labels for
  any backports.
---

# Submitting Work

Before implementing a feature or a fix, it is usually best to discuss the proposed changes with
[team members](https://emberjs.com/team/). Some fixes might require new public API or changes to
existing public APIs. If this is the case, it is even more important to discuss the issue's problem
space and the proposed changes before diving too deep into the implementation.

## Making a PR

Submissions should be made as PRs against the `main` branch. Open the PR as a draft until CI is
green and you consider it complete, and fill in the pull request template for the description;
GitHub inserts it in the web form, but a PR opened from the command line with a body of its own
skips it, so copy from `.github/PULL_REQUEST_TEMPLATE.md` in that case.

If a bugfix for an existing release is needed, that work should be cherry-picked to
secondary PRs targeting the appropriate release branches after being accepted to the
main branch.

### Writing Tests

All PRs should have accompanying tests. For bug-fixes, this should include tests that demonstrate
the issue being fixed and test that the solution works.

* We do write tests for our deprecations and assertion messages, using the `assert.expectAssertion()` and `assert.expectDeprecation()` helpers.
* Because we run tests in both development and `production` environments, assertions, deprecations and warnings may be stripped out. To avoid tests of debug behaviors failing for your PR in production environments, use the `testInDebug` function instead of `qunit` `test` to skip them in production when appropriate.
  * alternatively wrap specific assertions in `if (DEBUG)` or `if (PRODUCTION)`
* Update the documentation, examples, and guides when affected by your contribution. The
  [Cross-Documentation Checklist](./writing-documentation/index.md#cross-documentation-checklist)
  lists what each kind of change touches.

### Running Tests

* PRs will automatically run an extensive set of test scenarios for your work. In some cases a contributor
  may need to approve the workflow run if this is your first contribution.
* `WarpDrive` is a collection of packages and comes with multiple test apps scoped to specific situations
  or parts of the codebase we want to test. These test applications can be found in `<project>/tests`.
  These should look like familiar ember app/addon tests, and to run them from within a specific test app use `pnpm test` or `pnpm test --serve`. For additional test commands see the list
  of commands in the respective `package.json` files.

### Pull Request Titles

PRs should be meaningfully titled to give context into the change for the changelog.

### Pull Request Labeling

All PRs should be labeled. The label names below are literal, `:label:` included. PR labeling
for changelog and backporting is enforced in CI, but labels may only be applied by project
maintainers -- with one exception: if your PR title
follows one of the conventions below, a bot applies the matching changelog label for you when
the PR is opened, so most contributors never need to wait on a maintainer for that part.

* `<type>: title`, e.g. `feat: add support for widgets`
* `<type> | title`, e.g. `feat | add support for widgets`
* `[type] title`, e.g. `[feat] add support for widgets`

`<type>` must match one of the changelog labels below (or a close variant, such as `fix` for
`:label: bug` or `docs` for `:label: doc`) and the bot only acts if the PR has no changelog
label yet, so it never overrides a label a maintainer already applied. For anything else --
backporting labels, or a changelog label your title doesn't spell out -- a maintainer will
label the PR for you prior to it being accepted and merged.

#### Changelog Labels

Labels used for the changelog include any labels listed in the changelog config in the [root package.json](https://github.com/warp-drive-data/warp-drive/blob/main/package.json).

These labels are prefixed with `changelog:` and currently the options are:

* `:label: breaking` which should be used to signify a breaking change
* `:label: feat` which should be used to signify an addition of a new public feature or behavior. Like `:label: doc` and `:label: rfc`, this label triggers a docs-site PR preview.
* `:label: bug` which should be used to signify a fix for a reported issue
* `:label: perf` which should be used to signify that the commit will improve performance characteristics in a meaningful way
* `:label: cleanup` which should be used to signify removal of deprecated features or that a deprecation has become an assertion.
* `:label: deprecation` which should be used to signify addition of a new deprecation
* `:label: doc` which should be used to signify a fix or improvement to documentation: guides, API docs, upgrade and blog pages, or agent skills. This label also triggers a docs-site PR preview — see [Writing Documentation](./writing-documentation/index.md#previewing-your-changes).
* `:label: test` which should be used to signify addition of new tests or refactoring of existing tests
* `:label: chore` which should be used to signify refactoring of internal code that should not have an affect on public APIs or behaviors but which we may want to call out for potentially unintended consequences. This also covers a fix scoped only to build tooling, lint/CI config, or other dev-experience-only code: if the PR doesn't touch anything a consumer of the published packages could hit, it's a chore, not a bug, even though it "fixes" something. Title such PRs `chore: ...` rather than `fix: ...`, since a `fix:`-typed title auto-labels as `:label: bug` (see the type-to-label mapping above).
* `:label: dependencies` which should be used when bumping dependencies on `main`. Bumps on other branches should use other labels as this implies a more substantive change.
* `:label: rfc` which should be used for PRs that draft, update, or advance a WarpDrive RFC in [`rfcs/`](/rfcs/index.md). This label also triggers a docs-site PR preview — see [The RFC Process](./rfc-process.md).

#### Backporting Labels

We use one set of labels to indicate that a PR needs to be backported and where it needs to be backported to, and a second set of labels to indicate that a PR **is** the backport PR.

A PR targeting `main` with none of the labels below is presumed to need no backporting -- there
is no label to apply for that case. Add a target label, all prefixed with `target:`, only when
the PR *does* need to be backported:

* `:dart: beta` indicates the PR requires being backported to the current beta release.
* `:dart: release` indicates the PR requires being backported to the current active release.
* `:dart: lts` indicates that a PR requires being backported to the most current LTS release.
* `:dart: lts-prev` indicates that a PR requires being backported to the second-most recent LTS release.

Note: a PR should add the individual label for *every* backport target required. We use this while releasing to search
for any commits still requiring backport to include, and will eventually automate opening backport PRs via a bot when
these labels are present. We remove the `target:` label from merged PRs only once the backport PR has been opened.

To indicate that a PR **is** the backport PR, the following labels, all prefixed with `backport-` are available:

* `backport-beta` for PRs to the beta branch
* `backport-release` for PRs to the current active release branch
* `backport-old-release` for PRs to previous release branches that are not LTS branches
* `backport-lts` for PRs targeting the current active LTS branch
* `backport-lts-prev` for PRs targeting the second most current LTS branch

Note, we automatically add this label to any PR opened to a beta/release/lts branch, but for non-current non-lts backports
it will need to be added manually.

#### Project Labels

Labels used for tracking work in [various projects](https://github.com/warp-drive-data/warp-drive/projects) are not enforced, but PRs and issues should be labeled for any applicable projects and added to those projects when reviewed.
