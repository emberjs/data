# Questions

This is the issue tracker for Ember Data. The Ember.js community uses this site
to collect and track bugs and discussions of new features. If you are having
difficulties using Ember Data or have a question about usage please ask a
question on StackOverflow:
[http://stackoverflow.com/questions/ask](http://stackoverflow.com/questions/ask?tags=ember.js&tags=ember-data)
and tag your question with `ember.js` and `ember-data`.

The Ember.js community is very active on StackOverflow and most questions
receive attention the same day they're posted:
http://stackoverflow.com/questions/tagged/ember.js
http://stackoverflow.com/questions/tagged/ember-data

# Issues

Think you've found a bug or have a new feature to suggest? Let us know!

## Reporting a Bug
1. Update to the most recent master release if possible. We may have already
fixed your bug.

2. Search for similar issues. It's possible somebody has encountered
this bug already.

3. Provide JSFiddle or JSBin demo that specifically shows the problem. This
demo should be fully operational with the exception of the bug you want to
demonstrate. The more pared down, the better. A preconfigured [EmberTwiddle (RESTAdapter)][rest] | [EmberTwiddle (JSONAPIAdapter)][json-api] |
[EmberTwiddle][2] with mocked requests is available.


[rest]: https://ember-twiddle.com/aa257da01fe4fde3c1a502538e2e4902/copy
[json-api]: https://ember-twiddle.com/c0beed7d3c0bed65ac8ed018dcc57894/copy
[2]: https://ember-twiddle.com/0e1a24aabb8fa7c1fdd8/copy?fileTreeShown=false&numColumns=2&openFiles=routes.application.js%2Ctemplates.application.hbs

4. If possible, submit a Pull Request with a failing test. Better yet, take
a stab at fixing the bug yourself if you can!

The more information you provide, the easier it is for us to validate that
there is a bug and the faster we'll be able to take action.

## Requesting a Feature
1. Ember and Ember Data have an RFC process for feature requests. To begin the discussion either
[gather feedback](https://github.com/emberjs/rfcs/blob/master/README.md#gathering-feedback-before-submitting)
on the emberjs/rfcs repository. Or, draft an [Ember Data RFC](https://github.com/emberjs/rfcs/pulls?q=is%3Apr+is%3Aopen+label%3Aember-data)
   - Use RFC pull request for well formed ideas.
   - Use the `ember-data` label on it.
   - Use RFC issues to propose a rough idea, basically a great place to test
     the waters.

2. Provide a clear and detailed explanation of the feature you want and why
it's important to add. Keep in mind that we want features that will be useful
to the majority of our users and not just a small subset. If you're just
targeting a minority of users, consider writing an add-on library for Ember.

3. If the feature is complex, consider writing an Ember RFC document. If we do
end up accepting the feature, the RFC provides the needed documentation for
contributors to develop the feature according the specification accepted by the core team.

4. After discussing the feature you may choose to attempt a Pull Request. If
you're at all able, start writing some code. We always have more work to do
than time to do it. If you can write some code then that will speed the process
along.

In short, if you have an idea that would be nice to have, create an issue on the
emberjs/rfcs repo and label it as `ember-data`. If you have a question about
requesting a feature, start a discussion at [discuss.emberjs.com](http://discuss.emberjs.com)

## Using Feature Flags

Feature flags allow new features to be tested easily and strips them out of
production builds automatically.

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
    })
  }
  ```

  This will allow the test suite to run as normal.

4. Running tests with all feature flags enabled is possible via
  `ember test --environment=test-optional-features` This is also possible while
  running tests in the browser via the `Enable Opt Feature` checkbox.

5. Add your feature to the [Features](https://github.com/emberjs/data/blob/master/FEATURES.md) file.
  Be sure to leave a description of the feature and possible example of how to
  use it (if necessary).

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

# Pull Requests

We love pull requests. Here's a quick guide:

1. Fork the repo.

2. Run the tests. We only take pull requests with passing tests, and it's great
to know that you have a clean slate, see notes on how to run unit tests [here](https://github.com/emberjs/data#how-to-run-unit-tests). (To see tests in the browser,
run `npm start` and open `http://localhost:4200/tests`.)

3. Add a test for your change. Only refactoring and documentation changes
require no new tests. If you are adding functionality or fixing a bug, we need
a test!

4. Make the test pass.

5. Commit your changes. Please use an appropriate commit prefix.
If your pull request fixes an issue specify it in the commit message. Some examples:

  ```
  [DOC beta] Update CONTRIBUTING.md for commit prefixes
  [FEATURE ds-pushpayload-return] Change `pushPayload` to return a value. #4110
  [BUGFIX beta] Allow optional spaces when parsing response headers
  ```

  For more information about commit prefixes see [Commit Tagging](#commit-tagging).

6. Push to your fork and submit a pull request. Please provide us with some
explanation of why you made the changes you made. For new features make sure to
explain a standard use case to us.

We try to be quick about responding to tickets but sometimes we get a bit
backlogged. If the response is slow, try to find someone on IRC (#emberjs) to
give the ticket a review.

Some things that will increase the chance that your pull request is accepted,
taken straight from the Ruby on Rails guide:

* Use Ember idioms and helpers
* Include tests that fail without your code, and pass with it
* Update the documentation, the surrounding one, examples elsewhere, guides,
  whatever is affected by your contribution

## Syntax:

* Two spaces, no tabs.
* No trailing whitespace. Blank lines should not have any space.
* a = b and not a=b.
* Follow the conventions you see used in the source already.

And in case we didn't emphasize it enough: we love tests!


## Writing Tests

* We do write tests for our warns and assertion messages, using the `assert.expectAssertion()` and `assert.expectWarning()` helpers.
* Because Travis runs tests in the `production` environment, assertions and warnings are stripped out. To avoid tests on warning/assertion messages failing for your PR, use the `testInDebug` helper to skip them in production. See [this](https://github.com/emberjs/data/blob/b3eb9c098ef8c2cf9ff3378ed079769782c02bb5/tests/integration/adapter/queries-test.js#L32) example.

## Commit Tagging

All commits should be tagged. Tags are denoted by square brackets (`[]`) and come at the start of the commit message.

### Bug Fixes

In general bug fixes are pulled into the beta branch. As such, the prefix is: `[BUGFIX beta]`. If a bug fix is a serious regression that requires a new patch release, `[BUGFIX release]` can be used instead.

For bugs related to canary features, follow the prefixing rules for features.

The vast majority of bug fixes apply to the current stable or beta releases, so submit your PR against the `master` branch with one of the above mentioned BUGFIX tags.
(In the unusual case of a bug fix specifically for a past release, tag for that release `[BUGFIX release-1-13]` and submit the PR against the stable branch for that release: `stable-1-13`.)

### Cleanup

Cleanup commits are for removing deprecated functionality and should be tagged
as `[CLEANUP beta]`.

### Features

All additions and fixes for features in canary should be tagged as `[FEATURE name]` where name is the same as the flag for that feature.

### Documentation

Documentation commits are tagged as `[DOC channel]` where channel is `canary`,
`beta`, or `release`. If no release is provided `canary` is assumed. The channel should be the most stable release that this documentation change applies to.

### Security

Security commits will be tagged as `[SECURITY cve]`. Please do not submit security related PRs without coordinating with the security team. See the [Security Policy](https://emberjs.com/security/) for more information.

### Other

In general almost all commits should fall into one of these categories. In the cases where they don't please submit your PR untagged. An ember-data contributor will let you know if tagging is required.


NOTE:
* Partially copied from https://raw.github.com/thoughtbot/factory_girl_rails/master/CONTRIBUTING.md
* Commit tagging section taken from [ember.js](https://github.com/emberjs/ember.js/blob/5641c3089180bdd1d4fa54e9dd2d3ac285f088e4/CONTRIBUTING.md#commit-tagging)
