# How To Contribute

## Welcome!

We are so glad you are considering contributing to `ember-data`. Below you'll find sections
detailing how to become involved to best ensure your contributions are successful!

### Reporting Bugs

Report issues you've discovered via the [issue tracker](https://github.com/emberjs/data/issues).
We have provided an [issue template](.github/bug.md) what will help guide you through the process.
If you are unsure if something is a bug, the `#ember-data` channel on [Discord](https://discord.gg/zT3asNS) is
a great place to ask for help!

#### Testing EmberData source directly in your Application

You can use package linking to test checkouts of ember-data against your application locally. This applies to consuming ember-data directly within an ember application. It will not work in your application if you are consuming ember-data through an addon (transitive dependency problem). This approach also presumes consuming all of ember-data.

1. clone this repository or another fork
2. install dependencies: `pnpm install`
3. change into the `ember-data` package directory `cd packages/-ember-data`

If using `pnpm`

1. run `link`. `pnpm link -g`
2. `cd` into your application
3. run `pnpm link ember-data`

If you don't use pnpm in your application, using the appropriate `yarn link` and `npm link` commands within the respective directories for the project and your app may work.

You can link to individual packages within this monorepo as well, doing so however is likely to be brittle. If you need to test individual packages against your application and linking does not work
you may run `node ./scripts/packages-for-commit.js` to generate tarballs that can be utilized locally
on your machine. Read pnpm/yarn/npm docs as appropriate for how to install from tarball.

Once you have linked EmberData to your application, you can run `ember serve` as usual
in your application. You should see something like the following printed to your terminal:

```
some-app $ ember serve

Missing symlinked pnpm packages:
Package: ember-data
  * Specified: ~3.15.0
  * Symlinked: 3.17.0-alpha.1


Build successful (41237ms) – Serving on http://localhost:4200/
...
```

### Discussion

Before embarking on a fix, a new feature, or a refactor it is usually best to discuss the
intended work with other contributors. In addition to holding discussions on individual [issues](https://github.com/emberjs/data/issues)
or [RFCs](https://github.com/emberjs/rfcs/labels/T-ember-data), you will find most contributors
and [core team members](https://emberjs.com/team/) hangout in the `#dev-ember-data` channel on [Discord](https://discord.gg/zT3asNS)

### Weekly Meeting (video conference)

Members of the `ember-data` core team meet weekly to discuss pull-requests, issues, and road-map items. These
meetings are open to all contributors and interested parties, but only team members may vote when a vote
is necessary.

Currently meetings are Wednesdays at 2pm Pacific Time. A video conference link is posted in the
`#dev-ember-data` channel on [Discord](https://discord.gg/zT3asNS) a few minutes prior to each meeting.

### Requesting Features or Deprecations

`ember-data` participates in the [RFC process (GitHub emberjs/rfcs)](https://github.com/emberjs/rfcs/).
Most changes to the public API including new features, changes in behavior, or deprecations require
community discussion and must go through this process.

While there is no guarantee that an RFC will be accepted, successful RFCs typically follow a pattern
of iteration while gathering requirements, addressing feedback, and consensus building. The best RFCs
are narrowly scoped with clear understanding of alternatives, drawbacks, and their effect on the community.

    Here are a few suggestions of **steps to take before drafting your RFC** to best make your RFC successful.
    Often this process will complete quickly, but when it does not, don't despair! Often the best ideas
    take the longest to bake.

1. Bring up your idea in the `#dev-ember-data` channel on [Discord](https://discord.gg/zT3asNS) or
   with individual [team members](https://emberjs.com/team/)
2. Reflect on any concerns, alternatives, or questions that arise from these discussions.
3. Continue to discuss the idea, giving time for everyone to digest and think about it.
4. Attend the weekly team meeting to discuss your idea
5. Open an [RFC issue](https://github.com/emberjs/rfcs/issues?q=is%3Aissue+is%3Aopen+label%3AT-ember-data)
   to broaden and record the discussion if the idea needs more time for discussion and iteration.
   - label your issue with `T-ember-data` (or ask someone in `#dev-ember-data` to add the label if you lack the permission)
   - announce your issue in `#dev-ember-data` and anywhere else desired such as `#news-and-announcements` and `twitter`.
6. [Draft an RFC](https://github.com/emberjs/rfcs#what-the-process-is) and share it with those you have
   been discussing the ideas with.
7. Publish your RFC by opening a PR to [emberjs/rfcs/](https://github.com/emberjs/rfcs/pulls?q=is%3Apr+is%3Aopen+label%3AT-ember-data)
   - label your PR with `T-ember-data` (or ask someone in `#dev-ember-data` to add the label if you lack the permission)
   - announce your PR in `#dev-ember-data` and anywhere else desired such as `#news-and-announcements` and `twitter`.
8. Attend weekly team meetings to discuss the RFC, continue iterating on the RFC, and help shepherd it to completion.
9. Build a proof-of-concept. Sometimes this is best if it occurs alongside drafting the RFC, as it often informs
   the RFC design, known drawbacks, and alternatives. Often it will become incorporated in the final implementation.
10. If you are able, help land the work in a release! It is not required that you implement your own RFC but often
    this is the best way to ensure that accepted RFCs are implemented in a timely manner.

### Submitting Work

Before implementing a feature or a fix, it is usually best to discuss the proposed changes with
[team members](https://emberjs.com/team/). Some fixes might require new public API or changes to
existing public APIs. If this is the case, it is even more important to discuss the issue's problem
space and the proposed changes before diving too deep into the implementation.

- Submissions should be made as PRs against the `master` branch.

#### Writing Tests

All PRs should have accompanying tests. For bug-fixes, this should include tests that demonstrate
the issue being fixed and test that the solution works.

- We do write tests for our warns and assertion messages, using the `assert.expectAssertion()` and `assert.expectWarning()` helpers.
- Because Travis runs tests in the `production` environment, assertions and warnings are stripped out. To avoid tests on
  warning/assertion messages failing for your PR, use the `testInDebug` function instead of `qunit` `test` to skip them in production.
- Include tests that fail without your code, and pass with it
- Update the documentation, examples, and guides when affected by your contribution

#### Running Tests

- PRs will automatically run an extensive set of test scenarios for your work
- `ember-data` is an `ember-addon` and uses `ember-cli`. To run tests locally
  use `pnpm test` or `pnpm test --serve`. For additional test commands see the list
  of commands in [./package.json](./package.json)

#### Commit Tagging

All commits should be tagged. Tags are denoted by square brackets (`[]`) and come at the start of the commit message.

- `[CLEANUP]`: commits that remove deprecated functionality
- `[CHORE]`: commits that refactor code or update dependencies
- `[TEST <feature-name>]`: commits that add tests for a feature
- `[FEAT <feature-name>]`: commits that add features
- `[DOC <feature-name>]` | `[DOC]`: commits that add or fix documentation for a feature
- `[SECURITY <cve>]`: commits that address security vulnerabilities. Please do not submit security related PRs without
  coordinating with the security team. See the [Security Policy](https://emberjs.com/security/) for more information.
- `[BUGFIX <feature-name>]`: commits that fix an issue. The PR should also specify the github issue # of the
  issue being resolved.

In general almost all commits should fall into one of the above categories. In the cases where they don't please submit
your PR untagged.

#### Commit Labeling

All commits should be labeled. Commit labeling for changelog and backporting is enforced in CI, but labels may only be
applied by project maintainers. PRs from non-maintainers will be labeled by maintainers prior to a PR being accepted and merged.

**Changelog Labels**

Labels used for the changelog include `skip-changelog` which should be used if the PR should not be considered for the changelog,
and any labels listed in the [root package.json's changelog config](https://github.com/emberjs/data/blob/master/package.json#L154).
These labels are prefixed with `changelog:` and currently the options are:

- `changelog:breaking` which should be used to signify a breaking change
- `changelog:feat` which should be used to signify an addition of a new public feature or behavior
- `changelog:bugfix` which should be used to signify a fix for a reported issue
- `changelog:perf` which should be used to signify that the commit will improve performance characteristics in a meaningful way
- `changelog:cleanup` which should be used to signify removal of deprecated features or that a deprecation has become an assertion.
- `changelog:deprecation` which should be used to signify addition of a new deprecation
- `changelog:doc` which should be used to signify a fix or improvement to documentation generated for api.emberjs.com
- `changelog:test` which should be used to signify addition of new tests or refactoring of existing tests
- `changelog:chore` which should be used to signify refactoring of internal code that should not have an affect on public APIs or behaviors but which we may want to call out for potentially unintended consequences.

**Backporting Labels**

We use one set of labels to indicate that a PR needs to be backported and where it needs to be backported to, and a second set of labels to indicate that a PR **is** the backport PR.

To indicate that a PR should be backported, the following labels, all prefixed with `target:` are available:

- `target:canary` indicates that a PR will not require backporting.
- `target:beta` indicates the PR requires being backported to the current beta release.
- `target:release` indicates the PR requires being backported to the current active release.
- `target:lts` indicates that a PR requires being backported to the most current LTS release.
- `target:lts-prev` indicates that a PR requires being backported to the second-most recent LTS release.

Note: a PR should add the individual label for _every_ backport target required. We use this while releasing to search
for any commits still requiring backport to include, and will eventually automate opening backport PRs via a bot when
these labels are present. We remove the `target:` label from merged PRs only once the backport PR has been opened.

To indicate that a PR **is** the backport PR, the following labels, all prefixed with `backport-` are available:

- `backport-beta` for PRs to the beta branch
- `backport-release` for PRs to the current active release branch
- `backport-old-release` for PRs to previous release branches that are not LTS branches
- `backport-lts` for PRs targetting the current active LTS branch
- `backport-lts-prev` for PRs targetting the second most current LTS branch

Note, we automatically add this label to any PR opened to a beta/release/lts branch, but for non-current non-lts backports
it will need to be added manually.

**Project Labels**

Labels used for tracking work in [various projects](https://github.com/emberjs/data/projects) are not enforced, but PRs and issues
should be labeled for any applicable projects and added to those projects when reviewed.

## Notes

- Commit tagging section taken from [ember.js](https://github.com/emberjs/ember.js/blob/5641c3089180bdd1d4fa54e9dd2d3ac285f088e4/CONTRIBUTING.md#commit-tagging)
