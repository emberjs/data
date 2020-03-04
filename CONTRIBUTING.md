# How To Contribute

## Welcome!

We are so glad you are considering contributing to `ember-data`. Below you'll find sections
detailing how to become involved to best ensure your contributions are successful!

### Reporting Bugs

Report issues you've discovered via the [issue tracker](https://github.com/emberjs/data/issues).
We have provided an [issue template](.github/bug.md) what will help guide you through the process.
If you are unsure if something is a bug, the `#ember-data` channel on [Discord](https://discord.gg/zT3asNS) is
a great place to ask for help!

#### Testing ember data source directly

##### monolithic ember-data

You can use package linking to test checkouts of ember-data. This applies to consuming ember-data directly within an ember application. It will not work in your application if you are consuming ember-data through an addon (transitive dependency problem). This approach also presumes consuming all of ember-data. You can link to divisions within ember-data as well.

1. clone this repository or another fork
1. run `yarn install`
1. run `yarn workspace ember-data link`
1. `cd` into your application
1. run `yarn link "ember-data"`. If you don't use yarn in your application, `npm link "ember-data"` may work.

Then you can run `ember serve` as usual in your application. You should see something like the following printed to your terminal:
```
some-app $ ember serve

Missing symlinked yarn packages:
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
  use `yarn test` or `yarn test --serve`. For additional test commands see the list
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

## Notes

- Commit tagging section taken from [ember.js](https://github.com/emberjs/ember.js/blob/5641c3089180bdd1d4fa54e9dd2d3ac285f088e4/CONTRIBUTING.md#commit-tagging)
