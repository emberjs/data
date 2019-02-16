# Contributing

## Welcome!

We are so glad you are considering contributing to `ember-data`. Below you'll find sections
detailing how to become involved to best ensure your contributions are successful!

### Reporting Bugs

Report issues you've discovered via the [issue tracker](https://github.com/emberjs/data/issues).
We have provided an [issue template](.github/bug.md) what will help guide you through the process.
If you are unsure if something is a bug, the `#ember-data` channel on [Discord](https://discord.gg/zT3asNS) is
a great place to ask for help!

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
   * label your issue with `T-ember-data` (or ask someone in `#dev-ember-data` to add the label if you lack the permission)
   * announce your issue in `#dev-ember-data` and anywhere else desired such as `#news-and-announcements` and `twitter`.
6. [Draft an RFC](https://github.com/emberjs/rfcs#what-the-process-is) and share it with those you have
   been discussing the ideas with.
7. Publish your RFC by opening a PR to [emberjs/rfcs/](https://github.com/emberjs/rfcs/pulls?q=is%3Apr+is%3Aopen+label%3AT-ember-data)
   * label your PR with `T-ember-data` (or ask someone in `#dev-ember-data` to add the label if you lack the permission)
   * announce your PR in `#dev-ember-data` and anywhere else desired such as `#news-and-announcements` and `twitter`.
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

* Submissions should be made as PRs against the `master` branch.

#### Writing Tests

All PRs should have accompanying tests. For bug-fixes, this should include tests that demonstrate
 the issue being fixed and test that the solution works.

* We do write tests for our warns and assertion messages, using the `assert.expectAssertion()` and `assert.expectWarning()` helpers.
* Because Travis runs tests in the `production` environment, assertions and warnings are stripped out. To avoid tests on
  warning/assertion messages failing for your PR, use the `testInDebug` function instead of `qunit` `test` to skip them in production.
* Include tests that fail without your code, and pass with it
* Update the documentation, examples, and guides when affected by your contribution

#### Running Tests

* PRs will automatically run an extensive set of test scenarios for your work
* `ember-data` is an `ember-addon` and uses `ember-cli`. To run tests locally
  use `ember test` or `ember test --serve`. For additional test commands see the list
  of commands in [./package.json](./package.json)

#### Commit Tagging

All commits should be tagged. Tags are denoted by square brackets (`[]`) and come at the start of the commit message.

* `[CLEANUP]`: commits that remove deprecated functionality
* `[CHORE]`: commits that refactor code or update dependencies
* `[TEST <feature-name>]`: commits that add tests for a feature
* `[FEAT <feature-name>]`: commits that add features
* `[DOC <feature-name>]` | `[DOC]`: commits that add or fix documentation for a feature
* `[SECURITY <cve>]`: commits that address security vulnerabilities. Please do not submit security related PRs without
  coordinating with the security team. See the [Security Policy](https://emberjs.com/security/) for more information.
* `[BUGFIX <feature-name>]`: commits that fix an issue. The PR should also specify the github issue # of the
  issue being resolved.

In general almost all commits should fall into one of the above categories. In the cases where they don't please submit
your PR untagged.

#### Developing a New Feature with Feature Flags

Sometimes a new feature will require use of a feature flag.

Feature flags allow new features to be tested in dev builds, but
the features are stripped out of production builds automatically.

1. Add your new feature flag to the [config/features.json](https://github.com/emberjs/data/blob/master/config/features.json) file.

```js
{
  "ds-boolean-transform-allow-null": null,
  "ds-mynew-feature": null
}
```

Give it a default of `null` so it will not be used in production builds.

2. Import `isEnabled` from `ember-data/-private`, wrapping any new
   code with your feature:

```js
import { isEnabled } from 'ember-data/-private';

if (isEnabled('ds-mynew-feature')) {
  // ... any additional code
} else {
  // ... any previous code that may have been overwritten
}
```

3. Similarly, you will want to wrap any new or edited tests with the same
   feature flag.

```js
import { isEnabled } from 'ember-data/-private';

if (isEnabled('ds-mynew-feature')) {
  test('test for new feature', function(assert) {
    // ...
  });
}
```

This will ensure these feature tests are only run when then feature is included in the build for `ember-data`.

4. Running tests with all feature flags enabled is possible via
   `ember test --environment=test-optional-features` This is also possible while
   running tests in the browser via the `Enable Opt Feature` checkbox.

5. Add your feature to the [Features](https://github.com/emberjs/data/blob/master/FEATURES.md) file.
   Be sure to leave a description of the feature and possible example of how to
   use it (if necessary).

For more information about commit prefixes see [Commit Tagging](#commit-tagging).

6. Push to your fork and submit a pull request. Please provide us with some
   explanation of why you made the changes you made. For new features make sure to
   explain a standard use case to us.

## Benchmarking

Ember Data is instrumented with [heimdalljs](https://github.com/heimdalljs/heimdalljs-lib)
Top level scenarios for benchmarking are available via the `query` route in
the dummy app, and desired scenarios to be run can be configured via `benchmarks/config.js`.

The scenarios are configured to interop with [heimdall-query](https://github.com/heimdalljs/heimdall-query)
for analysis. To run scenarios:

1. Start the dummy app with instrumentation on: `ember s --instrument`

2. Configure `benchmarks/config.js` with desired scenarios

3. To run both the benchmarks and the analysis: `node ./benchmarks`

   a.) To just collect data (no analysis): `node ./benchmarks/bash-run.js`
   b.) To just run analysis (w/cached data): `node ./benchmarks/bash-analyze.js`
   c.) To cache a data set or use a cached data set, all commands accept `-c ./path/to/cache/dir`

4. Do not commit cached data results, these should be git ignored already.

## Notes

* Commit tagging section taken from [ember.js](https://github.com/emberjs/ember.js/blob/5641c3089180bdd1d4fa54e9dd2d3ac285f088e4/CONTRIBUTING.md#commit-tagging)
