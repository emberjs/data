Release
=======

Although not very tricky, the Ember Data release process does have a
lot of manual steps. The following steps navigate us through
some of the release gotchas and will hopefully result in a successful
release.

STEPS:
------

* ensure that the `ember-source` version in `package.json` matches only the minor range for the `ember-data` version we are releasing
  * E.G. `"ember-data": "3.4.1"` should have `"ember-source": "~3.4.0"`. For betas/canary, pointing at the last minor release is OK.
  * See https://github.com/emberjs/data/issues/5607 for the importance of this step.
* ensure that the last two LTS releases of Ember (and only the last two) are included in `travis.yml`.
  * See https://github.com/emberjs/data/issues/5607 for the importance of this step.
* generate changelog (`PRIOR_VERSION=v2.0.0 HEAD=release ./bin/changelog`)
* prepend changelog output to `CHANGELOG.md`
* edit changelog output to be as user-friendly as possible (drop [INTERNAL] changes, non-code changes, etc.)
  * If this is the release branch  make sure to pr the changelog to the master branch and cherry pick it to the release branch.
  * If this is the beta branch the changelogs do not need to be pred to the master branch as master will be updated when the beta goes to release.
* Bump version in package.json
  * `git add package.json`
  * `git commit -m "Release Ember Data X.Y.Z-beta.n"`
* Git tag version
  * `git tag vX.Y.Z-beta.n`
* Do a production build. 
  * `rm -rf node_modules; yarn install; npm run build:production`
* Publish to NPM
  * `npm publish` or `npm publish --tag beta` or `npm publish --tag release-1-13`
* Update the `/builds/` page on the website
  * `cd ../website`
  * Edit `lastRelease`, `futureVersion` and `date` values for the release channel we are releasing ([beta](https://github.com/ember-learn/builds/blob/master/app/fixtures/ember-data/beta.js) or [release](https://github.com/ember-learn/builds/blob/master/app/fixtures/ember-data/release.js).
* Write a Release Blog Post (Does not happen for beta releases)
  * Commits since last release: `git log --oneline release..beta | wc -l`.
  * Contributors since last release: `git shortlog -s -n release...beta | wc -l`
* Submit a Pull request to the https://github.com/ember-cli/ember-cli to update the version of Ember Data
  * (per request by @rwjblue and is also a great idea to make upgrading/new apps easier)
* Bump version in package.json back to a canary version
* For beta.1 releases, branch beta from master and update https://github.com/emberjs/data/blob/master/config/features.json to have `false` values instead of `null` and update the version in package.json


Tag the release

1. Under `Releases` on GitHub choose `Draft New Release`
* enter the new version number as the tag prefixed with `v` e.g. (`v0.1.12`)
* for release title choose a great name, no pressure
* in the description paste the changelog items for this release only
* click pre-release for beta releases
* publish the release

Announce release!

1. on Twitter
* then crosslink Twitter post on slack #dev-ember-data and #ember-data
