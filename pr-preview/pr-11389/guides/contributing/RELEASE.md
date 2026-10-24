---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/guides/contributing/RELEASE.md
description: >-
  Perform a WarpDrive release from the GitHub Actions workflow: order the lts,
  release, beta, and canary channels, then polish the GitHub release notes and
  announce it.
---

# Release

The WarpDrive release process is mostly automated but requires manually configuring
and triggering the appropriate workflow.

There are four standard and two non-standard release channels

* standard releases: `lts`, `release`, `beta`, `canary`.
* non-standard releases: `lts-prev` `release-prev`

## Before We Start

Before we begin the release train, make sure that the [roadmap](./ROADMAP.md) is properly
updated on `main` and `beta` so that it will be accurate when the new release branch is
created. To do this you likely need to reach out to WarpDrive core team members to ensure
all recent planning discussions and work is properly accounted for.

## Draft the Release Blog Post

Every stable release (`release`, `lts`, `lts-prev`, `release-prev`) can have a blog post under
[`blog/`](/blog/), drafted from the summaries PRs leave in `.next-release-post/` (see
[Blog Summaries](./submitting-prs.md#blog-summaries)). The
[Draft a Release Blog Post](/skills/contributors/draft-a-release-blog-post.md) skill walks through
writing it. Canary and beta releases don't get one.

Draft and merge the post **before** triggering the release, so that it is part of the commit the
release is built from and ships inside the release rather than after it:

1. Work out which branch the workflow will build from: for a new major or minor, the
   `stable_source-branch` the release branch is reset from (`beta` by default, or `main`); for a
   patch, `release`; for an LTS release, its LTS branch.
2. Open the post's PR against `main` with `:label: doc` and the `:dart:` label for that branch,
   per [Submitting PRs](./submitting-prs.md). The same PR deletes the summary files that ship in
   this release.
3. After it merges, open the backport PR to that branch. Skip this when the release is built from
   `main`.
4. Trigger the release only once both are merged. If more PRs with summaries land on that branch
   first, fold them into the post before releasing.

## Getting Setup To Do A Release

In order to release WarpDrive you must have commit rights to `warp-drive-data/warp-drive` on
GitHub, along with permission to trigger the `0. Release` workflow. Everything else is handled
by automation.

Publishing to npm requires npm's [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
(OIDC), which is only available from within that GitHub Actions workflow -- there is no manual
or local publish path, and no npm account, access token, or 2FA setup is needed to perform a
release. For more information run `pnpm release about` in the repository.

If you want to run a release step locally for review (e.g. a `--dry-run`, or generating a
release strategy) rather than actually publishing, you will additionally need:

* `pnpm` and `node` installed globally (or better, via `mise`)
* A `GITHUB_AUTH` token configured for `lerna-changelog`, to gather info for the release notes

## Release Order

When releasing more than one channel, we release from "most stable" to "least stable".
This is what allows changes to flow down from canary to lts versioned seamlessly.

* `lts` (*Most Stable*)
* `release`
* `beta`
* `canary` (*Least Stable*)

Since non-standard releases are always bespoke, they do not participate in the above flow.

You will find the automated workflows to perform these releases under the actions tab on github.

## Polish the Release!

First, update the Release Notes on Github

* Visit [WarpDrive Releases](https://github.com/warp-drive-data/warp-drive/releases)
  * Click on the "more recent tags"
  * Click on the tag just published
  * Edit the tag, adding a meaningful title and attaching the changelog (see other releases for examples)
  * Publish the release!
  * Only set the release as latest if it should be the `latest` tag on npm as well (e.g. the `release` channel). LTS/Beta/Canary/LTS-prev/Release-prev should never be marked as `latest`.

Once you have finished this release process, we recommend posting an announcement to your
Threads/Mastadon/Twitter accounts and them crosslinking the announcement to the following
Discord channels:

### WarpDrive

* [#subspace-transmissions](https://discord.com/channels/999914805215367219/1400670702348271708)

### EmberJS

* [#news-and-announcements](https://discordapp.com/channels/480462759797063690/480499624663056390)
* [#dev-ember-data](https://discordapp.com/channels/480462759797063690/480501977931972608)
* [#ember-data](https://discordapp.com/channels/480462759797063690/486549196837486592)
