# Release

Although not very tricky, the Ember Data release process does have a
few manual steps. The following steps navigate us through
some of the release gotchas and will hopefully result in a successful
release.

There are four release channels, `lts`, `release`, `beta` and `canary`.
Each has it's own guide below.

In this guide, we are assuming that the remote `origin` is `git@github.com:emberjs/data.git`

## Getting Setup To Do A Release

In order to release `ember-data` you must first ensure the following things:

- You have `commit` rights to `ember-data` on GitHub
- You have an account on `npm` and belongs to the `ember-data` organization on NPM
- You have `publish` rights within the `ember-data` organization on NPM
- You have configured your NPM account to use `2fa` (two factor authentication)
- You have installed `lerna` `yarn` and `node` globally

## Release Order

When releasing more than one channel, we release from "most stable" to "least stable"

- `lts` (_Most Stable_)
- `release`
- `beta`
- `canary` (_Least Stable_)

## Announce release!

Once you have finished this release process, we recommend posting an announcement to
Twitter the Crosslinking the announcement to the following Discord channels.

- [#news-and-announcements](https://discordapp.com/channels/480462759797063690/480499624663056390)
- [#dev-ember-data](https://discordapp.com/channels/480462759797063690/480501977931972608)
- [#ember-data](https://discordapp.com/channels/480462759797063690/486549196837486592)

### LTS

1. Checkout the correct branch

   a. For the first release of a new `LTS`, create a new branch from `origin/release`

   DO THIS PRIOR TO PUBLISHING THE NEXT RELEASE

   ```
   git fetch origin;
   git checkout -b lts-<majorVersion>-<minorVersion> origin/release;
   ```

   b. For subsequent releases of this `LTS`, ensure your local branch is in-sync with the remote.

   ```
   git fetch origin;
   git checkout -b lts-<majorVersion>-<minorVersion>;
   git reset --hard origin/lts-<majorVersion>-<minorVersion>;
   ```

2. Generate the Changelog

The Changelog is generated with [lerna-changelog](https://github.com/lerna/lerna-changelog).

The primary task prior to generating the changelog is confirming that all pull requests that have been merged since the
last release have been labeled with the appropriate lerna-changelog labels and the titles have been updated to ensure
they represent something that would make sense to our users. Some great information on why this is important can be
found at keepachangelog.com, but the overall guiding principle here is that changelogs are for humans, not machines.

For the first release of an LTS, `previous-version` will be the last released version of the `release` channel.

For subsequent versions it will be whatever version number we previously published for this LTS.

To actually generate the changelog, run:

```
pnpm lerna-changelog --from=PREVIOUS_VERSION_TAG
```

Note: if it is the first time that you use lerna-changelog, you might have to add a token to fetch from Github API:
https://github.com/lerna/lerna-changelog#github-token

Then:

- insert lerna-changelog output to `CHANGELOG.md` underneath the document title
- commit the changelog and push the change upstream:

```
git add CHANGELOG.md;
git commit -m "Update Changelog for v<new-lts-version>"
git push origin lts-<majorVersion>-<minorVersion> // Note: alternatively, you can make a PR to lts-<majorVersion>-<minorVersion> to make sure there are no errors
```

3. Publish the LTS

   ```
   node ./scripts/publish.js lts
   ```

4. Update the Release Notes on Github

- Visit [Ember Data Releases](https://github.com/emberjs/data/releases)
  - Click on the "Tags"
  - Click on the tag just published
  - Edit the tag, adding a meaningful title and attaching the changelog (see other releases for examples)
  - Publish the release!

### Release

1. Checkout the `release` branch and ensure it is in-sync with `origin/release`.

   DO NOT WORK FROM A LOCAL `release` branch THAT DIFFERS

   a. If this is the first `release` release of the cycle, we "cut" from `beta`.

   DO THIS PRIOR TO PUBLISHING THE NEXT BETA

   ```
   git checkout release;
   git fetch origin;
   git reset --hard origin/beta;
   git push origin release -f;
   ```

   b. For subsequent `release` releases during the cycle, we release from the `release` branch.

   ```
   git checkout release;
   git fetch origin;
   git reset --hard origin/release;
   ```

2. Update associated lockstep dependencies

   **For our first release of the cycle only, we must also update our test harness:**

   a. ensure that the `ember-source` version in `package.json` and relevant `packages/` matches only the minor range for the `ember-data` version we are releasing

   E.G. `"ember-data": "3.4.1"` should have `"ember-source": "~3.4.0"`. For betas/canary, pointing at the last minor release is OK.

   See https://github.com/emberjs/data/issues/5607 for the importance of this step.

   b. ensure that the last two LTS releases of Ember (and only the last two) are included in `ember-try.js`.

   See https://github.com/emberjs/data/issues/5607 for the importance of this step.

   c. ensure the same for `azure-pipelines.yml`
   d. ensure the same for `.github/workflows/main.yml`

3. Delete the Beta Changelog

   If this is the first stable release for this major/minor, in `CHANGELOG.md` delete
   the `beta` version entries associated with this release.

4. Generate the Changelog

   IT IS IMPORTANT THAT ALL CHANGES ARE ON THE REMOTE BRANCH SPECIFIED BY HEAD

   `previous-version` will be whatever version we previously published as a `release`

   ```
   PRIOR_VERSION=<previous-version> HEAD=release ./bin/changelog
   ```

- prepend a new section title for this version with Today's date to `CHANGELOG.md`
- insert changelog script output to `CHANGELOG.md` underneath this new section title
- edit changelog output to be as user-friendly as possible (drop [INTERNAL] changes, non-code changes, etc.)
- commit the changelog and push the change upstream

  ```
  git add CHANGELOG.md;
  git commit -m "Update Changelog for v<new-version>";
  git push origin release;
  ```

Note it is prudent to make a PR to release to make sure there are no errors.

    ```
    git add CHANGELOG.md;
    git commit -m "Update Changelog for v<new-version>";
    git push origin name/release-new-version;

5. Publish the release

   ```
   node ./scripts/publish.js release
   ```

6. Update the Release Notes on Github

- Visit [Ember Data Releases](https://github.com/emberjs/data/releases)
  - Click on the "more recent tags"
  - Click on the tag just published
  - Edit the tag, adding a meaningful title and attaching the changelog (see other releases for examples)
  - Publish the release!

### Beta

1. Checkout the `#beta` branch and ensure it is in-sync with `origin/beta`.

   DO NOT WORK FROM A LOCAL `beta` branch THAT DIFFERS

   a. If this is the first `beta` release of the cycle, we "cut" from `#master`.

   DO THIS PRIOR TO PUBLISHING THE NEXT CANARY

   ```
   git checkout beta;
   git fetch origin;
   git reset --hard origin/master;
   git push origin beta -f;
   ```

   b. For subsequent `beta` releases during the cycle, we release from the beta branch.

   ```
   git checkout beta;
   git fetch origin;
   git reset --hard origin/beta;
   ```

2. Generate the Changelog

   IT IS IMPORTANT THAT ALL CHANGES ARE ON THE REMOTE BRANCH SPECIFIED BY HEAD

   ```
   PRIOR_VERSION=<previous-beta-version> HEAD=beta ./bin/changelog
   ```

- prepend a new section title for this version with Today's date to `CHANGELOG.md`
- insert changelog script output to `CHANGELOG.md` underneath this new section title
- edit changelog output to be as user-friendly as possible (drop [INTERNAL] changes, non-code changes, etc.)
- commit the changelog and push the change upstream

  ```
  git add CHANGELOG.md;
  git commit -m "Update Changelog for v<new-beta-version>";
  git push origin beta;
  ```

Note it is prudent to make a PR to beta to make sure there are no errors.

    ```
    git add CHANGELOG.md;
    git commit -m "Update Changelog for v<new-beta-version>";
    git push origin name/beta-new-beta-version;

3. Publish the weekly beta

   ```
   node ./scripts/publish.js beta
   ```

4. Update the Release Notes on Github

- Visit [Ember Data Releases](https://github.com/emberjs/data/releases)
  - Click on the "more recent tags"
  - Click on the tag just published
  - Edit the tag, adding a meaningful title and attaching the changelog (see other releases for examples)
  - Click pre-release for beta releases
  - Publish the release!

### Canary

1. Checkout the `#master` branch and ensure it is in-sync with `origin/master`.

   DO NOT WORK FROM A LOCAL `master` branch THAT DIFFERS

   ```js
   git checkout master;
   git fetch origin;
   git reset --hard origin/master
   ```

2. Publish the nightly.

   a. If this is the very first `canary` release for a new minor

   ```
   node ./scripts/publish.js canary --bumpMinor
   ```

   b. If this is the very first `canary` release for a new major

   ```
   node ./scripts/publish.js canary --bumpMajor
   ```

   c. For all other "nightly" canary releases

   ```
   node ./scripts/publish.js canary
   ```

Congrats, you are finished!

#### Canary Auto Publish

New canary versions are published to npm every Wednesday at 12pm PST by the `Alpha Release` GitHub action.
It will always increment the pre-release version of what's currently in `lerna.json`. For example from `3.25.0-alpha.1`
to `3.25.0-alpha.2`. **It requires a human to manually bump minor and major versions and publish**.

To try out the script that will be executed in the GitHub action, use:
`node scripts/publish.js canary --dryRun --force --skipSmokeTest`. The `--dryRun` param will skip auto committing the
version change and publishing.
