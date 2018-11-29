Release
=======

Although not very tricky, the Ember Data release process does have a
lot of manual steps. The following steps navigate us through
some of the release gotchas and will hopefully result in a successful
release.

We cut new `patch` releases from their released branch.
We cut new `major/minor` releases from the `beta` branch.
We cut new `beta` releases from the `master` branch.

STEPS:
------

Assuming that the remote `origin` is `git@github.com:emberjs/data.git`

* For patches to `release`
  * checkout `release` and ensure it is up to date with `origin/release` (`git fetch origin`). DO NOT WORK FROM A LOCAL `release` branch THAT DIFFERS
* For new major/minor releases
  * Ensure `git fetch origin` is up todate for `origin/beta`. DO NOT WORK FROM A LOCAL `beta` branch THAT DIFFERS
  * reset `release` to match `beta`
* For new beta releases
  * Ensure `git getch origin` is up todate for `origin/master`. DO NOT WORK FROM A LOCAL `master` branch THAT DIFFERS
  * checkout `beta`
  * reset `beta` to match `origin/master`
* ensure that the `ember-source` version in `package.json` matches only the minor range for the `ember-data` version we are releasing
  * E.G. `"ember-data": "3.4.1"` should have `"ember-source": "~3.4.0"`. For betas/canary, pointing at the last minor release is OK.
  * See https://github.com/emberjs/data/issues/5607 for the importance of this step.
* ensure that the last two LTS releases of Ember (and only the last two) are included in `travis.yml`.
  * See https://github.com/emberjs/data/issues/5607 for the importance of this step.
* `rm -rf node_modules dist`
* `yarn`
* generate changelog (`PRIOR_VERSION=v2.0.0 HEAD=release ./bin/changelog`) IT IS IMPORTANT THAT ALL CHANGES ARE ON THE REMOTE BRANCH SPECIFIED BY HEAD
* prepend changelog output to `CHANGELOG.md`
* edit changelog output to be as user-friendly as possible (drop [INTERNAL] changes, non-code changes, etc.)
* Bump version in package.json
  * `git add package.json`
  * `git commit -m "Release Ember Data X.Y.Z-beta.n"`
* Git tag version
  * `git tag vX.Y.Z-beta.n`
* Push the changes and the tag to upsteam
  * `git push origin release` `git push origin --tags`
* Do a production build (this is because _____)
  * `yarn build:production`
* If this is a patch to the latest release: `npm publish`
* Else if this is a patch to beta, `npm publish --tag beta`
* Else publish the specific version `npm publish --tag release-3-5` where this is the "minor" but without the patch.
* Visit [Ember Data Releases](https://github.com/emberjs/data/releases)
  * Click on the "more recent tags"
  * Click on the tag just published
  * Edit the tag, adding a meaningful title and attaching the changelog (see other releases for examples)
  * Click pre-release for beta releases
  * Publish the release!
* Submit a PR to `ember-learn/builds` to update the builds for this channel
  * File to edit for [beta](https://github.com/ember-learn/builds/blob/master/app/fixtures/ember-data/beta.js
  * File to edit for [release](https://github.com/ember-learn/builds/blob/master/app/fixtures/ember-data/release.js)

For releases of new Major/Minor versions
  
  * Write a Release Blog Post (Does not happen for beta releases)
  * Commits since last release: `git log --oneline release..beta | wc -l`.
  * Contributors since last release: `git shortlog -s -n release...beta | wc -l`

* Submit a Pull request to the https://github.com/ember-cli/ember-cli to update the version of Ember Data
  * (per request by @rwjblue and is also a great idea to make upgrading/new apps easier)

Announce release!

1. on Twitter
* then crosslink Twitter post on Discord [#dev-ember-data](https://discordapp.com/channels/480462759797063690/480501977931972608) and [#ember-data](https://discordapp.com/channels/480462759797063690/486549196837486592)

