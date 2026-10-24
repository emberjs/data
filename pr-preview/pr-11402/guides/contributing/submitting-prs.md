---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/guides/contributing/submitting-prs.md
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

The options are:

* `:label: breaking` which should be used to signify a breaking change
* `:label: feat` which should be used to signify an addition of a new public feature or behavior. Like `:label: doc` and `:label: rfc`, this label triggers a docs-site PR preview.
* `:label: bug` which should be used to signify a fix for a reported issue
* `:label: perf` which should be used to signify that the commit will improve performance characteristics in a meaningful way
* `:label: cleanup` which should be used to signify removal of deprecated features or that a deprecation has become an assertion.
* `:label: deprecation` which should be used to signify addition of a new deprecation
* `:label: doc` which should be used to signify a fix or improvement to documentation: guides, API docs, upgrade and blog pages, or agent skills. This label also triggers a docs-site PR preview — see [Writing Documentation](./writing-documentation/index.md#previewing-your-changes).
* `:label: test` which should be used to signify addition of new tests or refactoring of existing tests
* `:label: chore` which should be used to signify refactoring of internal code that should not have an affect on public APIs or behaviors but which we may want to call out for potentially unintended consequences. This also covers a fix scoped only to build tooling, lint/CI config, or other dev-experience-only code: if the PR doesn't touch anything a consumer of the published packages could hit, it's a chore, not a bug, even though it "fixes" something. Title such PRs `chore: ...` rather than `fix: ...`, since a `fix:`-typed title auto-labels as `:label: bug` (see the type-to-label mapping above).
* `:label: dependencies` which should be used when bumping dependencies on `main`. Bumps on other branches should use other labels as this implies a more substantive change. This label satisfies the changelog label check, but it is deliberately absent from the changelog config, so these PRs are left out of release notes -- most of them are automated Renovate bumps.
* `:label: rfc` which should be used for PRs that draft, update, or advance a WarpDrive RFC in [`rfcs/`](/rfcs/index.md). This label also triggers a docs-site PR preview — see [The RFC Process](./rfc-process.md).

#### Backporting Labels

We use one set of labels to indicate that a PR needs to be backported and where it needs to be backported to, and a second set of labels to indicate that a PR **is** the backport PR.

A PR targeting `main` with none of the labels below is presumed to need no backporting -- there
is no label to apply for that case. Add a target label, all prefixed with `:dart:`, only when
the PR *does* need to be backported:

* `:dart: beta` indicates the PR requires being backported to the current beta release.
* `:dart: release` indicates the PR requires being backported to the current active release.
* `:dart: lts` indicates that a PR requires being backported to the most current LTS release.
* `:dart: lts-prev` indicates that a PR requires being backported to the second-most recent LTS release.

Note: a PR should add the individual label for *every* backport target required. We use this while releasing to search
for any commits still requiring backport to include, and will eventually automate opening backport PRs via a bot when
these labels are present. We remove the `:dart:` label from merged PRs only once the backport PR has been opened.

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

### Blog Summaries

The changelog lists every labeled PR by title. A release's blog post is different: it explains the
handful of changes in that release that a user would want to hear about, in prose. To build that
post from the PRs themselves instead of from memory, a PR making such a change adds a short
summary file to the
[`.next-release-post/`](https://github.com/warp-drive-data/warp-drive/tree/main/.next-release-post)
directory at the repo root. Any stable release's post, patch releases included, is drafted from
those files before the release ships, and the PR that adds the post clears out the ones it used,
so the directory only ever holds summaries waiting to be announced (see
[Draft the Release Blog Post](./RELEASE.md#draft-the-release-blog-post) and the
[Draft a Release Blog Post](/skills/contributors/draft-a-release-blog-post.md) skill). A fix
backported to a release branch brings its summary with it when its commit is cherry-picked.

The summary lives in the PR's diff rather than its description on purpose: it is reviewed like
any other change, and once merged it can only change through another reviewed PR. That review is
also what decides whether a PR gets a summary at all. The author proposes one when the change is
worth announcing, and the reviewer can ask for one, ask for it to come out, or ask for it to be
rewritten. Every summary that merges goes into the next post, so read it as carefully as code.

Changes usually worth a summary are new features, breaking changes, deprecations and removals,
meaningful performance improvements, fixes users would notice (a long-standing, widely reported,
or data-correctness bug), and new guides or tutorials. Internal refactors, tests, build and CI
tooling, and dependency bumps usually aren't.

Name the file `<PR number>-<topic>.md`, with the topic in kebab case, such as
`11394-alien-signals-composition.md`. The number doesn't exist until the PR does, so open the PR
first and add the file in a commit after it. One PR adds or updates at most one file, plus one
[RFC summary](#rfc-summaries) for each RFC it adds or advances.

The file starts with frontmatter holding a single `releases` list: the release lines the change
ships on, each the `major.minor` of a branch's version, quoted so YAML doesn't read `"5.10"` as
the number `5.1`. A PR to `main` always lists the minor `main` is heading for, plus one line for
each [backport target label](#backporting-labels) it carries: `:dart: release` adds the `release`
branch's line, `:dart: lts` and `:dart: lts-prev` the matching `lts-*` branches' lines, and
`:dart: beta` the `beta` branch's line, which only matters in a cycle that isn't mirroring
canary. Keep the list in step with those labels until the PR merges. Each release post uses the
summaries that list its line, then removes that line, deleting a file once its list is empty; so
a fix listed for `["5.10", "5.9"]` appears in both the next 5.9 patch's post and the 5.10 post.

If a summary for the same topic is already in the directory and its `releases` lists every line
this PR ships on, update it rather than adding a second one, so the post tells one story, keeping
its name and list. Otherwise it has already been announced on one of those lines, or the
original isn't on a branch this PR is backported to, and the PR adds its own file.

After the frontmatter, the file is plain markdown with no headings, written for someone who uses
***Warp*Drive** and has not read the PR:

```md
---
releases: ["5.10"]
---
Ember and React components on the same page can now share one store. Import
`@warp-drive/alien-signals/install` before each framework's own `install`, and every framework
re-renders when the data it read changes, including when a memo returns a cached value. See
[Using Ember and React on the Same Page](/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md).
```

* Two to five sentences, or a short bullet list, in the present tense: what changed, who it
  affects, and anything they need to do.
* At most one short code example, and only if it shows the change better than a sentence does.
* Link the guide or API page that covers the change in depth instead of re-explaining it, using
  the docs site path as above.
* Name the package if it isn't obvious, and the deprecation ID for a deprecation.
* Leave out the implementation, the review history, and internal names a user never sees.

#### RFC Summaries

Every PR that adds an RFC under [`rfcs/`](/rfcs/index.md) or changes an existing RFC's `stage`
frontmatter adds a summary too, so the post can list the RFCs that were opened or advanced during
the release. A PR that only edits an RFC's text, without changing its stage, doesn't. An RFC
summary is named like any other, and its frontmatter carries two more fields: `rfc`, the RFC's
`warp-drive-rfc` number, and `stages`, the path its stage took. The first entry is the stage the
RFC had before the PR, or `"new"` for a PR that adds the RFC, and the last is the stage it has
after; use the values exactly as the RFC's `stage` frontmatter writes them. The body is one
sentence on what the RFC proposes, usually its `description`.

```md
---
releases: ["5.10"]
rfc: 6
stages: ["new", "proposed"]
---
Proposes relationship fields that ***Warp*Drive** never fetches: pointers, which assert the
related resource is loaded, and references, which tolerate its absence.
```

RFCs live on `main` and their PRs aren't backported, so `releases` is `main`'s line alone. When a
later PR advances the same RFC while its summary still lists that line, it appends the new stage
to `stages` (`["new", "proposed", "accepted"]`) instead of adding a second file. Otherwise the
earlier stages have already been announced, and the PR adds its own file starting from the stage
the RFC had before it (`["accepted", "released"]`).
