# Release

The EmberData release process is mostly automated but requires manually configuring
and triggering the appropriate workflow.

There are four standard and two non-standard release channels

- standard releases: `lts`, `release`, `beta`, `canary`.
- non-standard releases: `lts-prev` `release-prev`

## Before We Start

Before we begin the release train, make sure that the [roadmap](./ROADMAP.md) is properly
updated on `main` and `beta` so that it will be accurate when the new release branch is
created. To do this you likely need to reach out to EmberData core team members to ensure
all recent planning discussions and work is properly accounted for.

## Getting Setup To Do A Release

In order to release EmberData you must have commit rights to `ember-data` on GITHUB.
Everything else is handled by automation.

In the event you do need to perform a manuall release, you must also have permission
to push to protected branches, and access tokens for npm and github with permissions
to the related package scopes. For more information about manual releases run 
`bun release about` in the repository.

For manually releases you will need to ensure at least the following:

- You have `commit` rights to `ember-data` on GitHub
- You have an account on `npm` and belongs to the `ember-data` and `warp-drive` organizations on NPM
- You have `publish` rights within the `ember-data` and `warp-drive` organizations on NPM
- You have configured your NPM account to use `2fa` (two factor authentication)
- You have logged into your NPM account on your machine (typically sessions preserve nearly forever once you have)
- You have configured `GITHUB_AUTH` token for `lerna-changelog` to be able to gather info for the release notes.
- You have installed `bun`, `pnpm` and `node` globally (or better, via `volta`)
- the remote `origin` is `git@github.com:emberjs/data.git`,
-`origin/main` `origin/beta` `origin/release` etc. need to be the upstreams of the local `main` `beta` `release` branches etc.

## Release Order

When releasing more than one channel, we release from "most stable" to "least stable".
This is what allows changes to flow down from canary to lts versioned seamlessly.

- `lts` (_Most Stable_)
- `release`
- `beta`
- `canary` (_Least Stable_)

Since non-standard releases are always bespoke, they do not participate in the above flow.

You will find the automated workflows to perform these releases under the actions tab on github.

## Polish the Release!

First, update the Release Notes on Github

- Visit [Ember Data Releases](https://github.com/emberjs/data/releases)
  - Click on the "more recent tags"
  - Click on the tag just published
  - Edit the tag, adding a meaningful title and attaching the changelog (see other releases for examples)
  - Publish the release!
  - Only set the release as latest if it should be the `latest` tag on npm as well (e.g. the `release` channel). LTS/Beta/Canary/LTS-prev/Release-prev should never be marked as `latest`.

Once you have finished this release process, we recommend posting an announcement to your
Threads/Mastadon/Twitter accounts and the crosslinking the announcement to the following
Discord channels.

- [#news-and-announcements](https://discordapp.com/channels/480462759797063690/480499624663056390)
- [#dev-ember-data](https://discordapp.com/channels/480462759797063690/480501977931972608)
- [#ember-data](https://discordapp.com/channels/480462759797063690/486549196837486592)


