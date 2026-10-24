---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/skills/contributors/submit-a-pr.md
---
# Submit a PR

Use this skill when a change is ready to leave your worktree and become a pull request against
WarpDrive. It encodes [Submitting PRs](/guides/contributing/submitting-prs.md) plus the label
checks CI runs on every PR, so a PR opened this way carries everything those checks look for.

## Steps

1. Target `main`. Every PR opens against `main`, even a fix that must also reach a published
   release. For those, land the `main` PR first, then cherry-pick the merged commit into a
   second PR against the release branch (`beta`, `release`, `lts-4-12`, and so on). Do not open
   the release-branch PR first.

2. Ship tests with the change. A bug fix carries a test that fails without the fix and passes
   with it. Test deprecation and assertion messages with `assert.expectDeprecation()` and
   `assert.expectAssertion()`; each test app's `test-helper.ts` installs them on QUnit's
   `assert` via `configureAsserts` from
   `@ember-data/unpublished-test-infra/test-support/asserts/index`. CI runs every test app in
   both development and production builds, and production strips assertions, deprecations, and
   warnings. Wrap any expectation about those in `if (DEBUG)`, with `DEBUG` imported from
   `@warp-drive/core/build-config/env`. `testInDebug` is the older form of the same guard and
   survives only in `tests/dont-write-new-tests-here`; do not add tests there.

3. Push the branch and let CI verify the change, per
   [Use CI as the Source of Truth](./use-ci-as-the-source-of-truth.md). Keep the PR a draft
   until those checks are green. The one case with no CI loop to read is a first contribution:
   a maintainer has to approve the workflow run before any check executes, so the PR shows
   nothing until they do.

4. Update every guide, API doc, and example the change affects, in the same PR.
   [Write Documentation](./write-documentation.md) covers how to produce each kind of page.

5. Title the PR in Conventional Commits form, `type(scope): subject`, in the imperative and
   without a trailing period. The title becomes the squash commit and the changelog line, so it
   must say what changed for a reader who never opens the PR. The title and body are subject to
   [Keep Commits Human-Authored](./keep-commits-human-authored.md), so carry no agent byline.

6. Get a changelog label onto the PR. CI on `main` blocks a PR until it carries one; the exact
   list lives in the `enforce-changelog-label` job of
   `.github/workflows/enforce-pr-labels-canary.yml`, and the changelog mapping in the root
   `package.json` under `changelog.labels`. No target label is required — a PR that carries none
   of the `:dart:` labels below is presumed to need no backport; there is no longer a
   `:dart: canary` label for that case.

   **If your title matches one of `type: title`, `type(scope): title` (the form step 5 asks
   for), `type | title`, or `[type] title`** (aliases like `fix` → `:label: bug` or `docs` →
   `:label: doc` included) **and the PR has no changelog label yet**, a bot applies the matching
   label for you when the PR is opened (`.github/workflows/label-pr-type.yml`).

   **If you are a maintainer**, apply the changelog label yourself when you open the PR, plus any
   target label the change needs.

   **If you are not, and the bot above doesn't cover your title**, you cannot apply labels at
   all. Name the changelog label you expect in the PR body instead, so a maintainer can apply it
   without re-reading the diff. The label check stays red until one does, and that is the
   expected state of your PR rather than something to fix. Pushing another commit will not clear
   it. The workflow triggers only on `labeled`, `unlabeled`, `opened`, and `reopened`, so nothing
   re-evaluates the PR until a maintainer labels it, or the bot does at open time.

   Pick exactly one changelog label:

   | Label                  | Use for                                                                                                |
   | ---------------------- | ------------------------------------------------------------------------------------------------------ |
   | `:label: breaking`     | a breaking change                                                                                      |
   | `:label: feat`         | a new public feature or behavior                                                                       |
   | `:label: bug`          | a fix for a reported issue                                                                             |
   | `:label: perf`         | a meaningful performance improvement                                                                   |
   | `:label: cleanup`      | removal of a deprecated feature, or a deprecation that became an assertion                             |
   | `:label: deprecation`  | a new deprecation                                                                                      |
   | `:label: doc`          | a fix or improvement to guides or API docs                                                             |
   | `:label: test`         | new tests, or a refactor of existing tests                                                             |
   | `:label: chore`        | internal refactoring, or a fix scoped only to build tooling, lint/CI config, or other dev-experience-only code, with no public API or runtime-behavior change worth calling out |
   | `:label: rfc`          | a new RFC, or a change to one; see [Writing and Implementing RFCs](./writing-and-implementing-rfcs.md) |
   | `:label: dependencies` | a dependency bump on `main`                                                                            |

   `:label: bug` is for a fix a consumer of the published packages could actually hit — a runtime
   behavior change. A PR that only touches build/lint/infra/DX surfaces (a broken `turbo` task, a
   flaky CI workflow, an eslint rule, a codemod script) is `:label: chore` even though you're
   "fixing" something, because nothing in the published packages changes. Title that PR
   `chore(scope): subject`, not `fix(scope): subject` — the bot in step 5 maps a `fix:`-typed
   title straight to `:label: bug`, which would misfile it.

   Add a target label only when the change needs to be backported: one `:dart:` label per
   release channel — `:dart: beta`, `:dart: release`, `:dart: lts`, `:dart: lts-prev`.
   Maintainers search these while releasing and remove each one once its backport PR is open.

   Never add a `backport-*` label to a `main` PR; CI bans them there. `:label: doc`,
   `:label: feat`, and `:label: rfc` also trigger a live docs preview, linked in a PR comment.

7. For the backport PR itself, cherry-pick onto the release branch and open the PR against that
   branch. CI adds the matching `backport-beta`, `backport-release`, `backport-lts`, or
   `backport-lts-prev` label. For an older non-LTS release branch no job does, so a maintainer
   applies `backport-old-release` by hand under the same access rule as step 6. Those PRs need
   a changelog label too, and CI bans the `:dart:` labels on them.

8. Discuss first when the change adds or alters public API. Open the conversation with the
   [team](https://emberjs.com/team/) before the implementation goes deep. A change to public API
   or observable behavior needs an RFC before implementation starts, and
   [Writing and Implementing RFCs](./writing-and-implementing-rfcs.md) carries that workflow.

## Example

[#11146](https://github.com/warp-drive-data/warp-drive/pull/11146) titled itself
`docs: dedupe the v5 upgrade guide and codemod READMEs`. Opened today, that title — or the scoped
`docs(upgrading): dedupe the v5 upgrade guide and codemod READMEs` form step 5 asks for — would
let the step 6 bot apply `:label: doc` automatically, and no target label would be needed at all,
since a `main` PR carrying none is presumed to need no backport. At the time it actually opened,
before either capability existed, only `:label: doc` came in with the PR, the
`enforce-target-label` check failed for want of `:dart: canary`, and it took a maintainer adding
that label by hand before CI went green.
