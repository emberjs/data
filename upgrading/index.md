---
title: Upgrading
description: Find the permanent, versioned upgrade guides, which one fits the ember-data or WarpDrive version your app is on, and where deprecation guides currently live.
---

# Upgrading ***Warp*Drive**

This section is the permanent home for point-in-time content: major-version upgrade guides,
deprecation guidance, and one-off feature migrations. Unlike the rest of the guides &mdash;
which describe the *current* API and change version to version &mdash; pages here describe how
to get from one specific point to another, and are expected to keep working the same way for
whoever finds them years from now.

## Guarantees

- **URLs are permanent.** A page's URL is never renamed and never unpublished. If a page's
  content is fully superseded, the page is kept in place, marked as superseded, and links
  forward to its replacement rather than being deleted.
- **Pages are dated and versioned.** Every page under `Upgrading` records the ***Warp*Drive***
  version (and, where useful, the date) it was authored against, usually with a `<SinceBadge />`
  near the top of the page.
- **Content is organized by major version.** Each major version gets its own sub-section (e.g.
  [4.x → 5.x](/upgrading/v5/)) containing that version's upgrade guide plus any deprecation or
  feature-specific migration guides written for it. The one exception is
  [ember-data → WarpDrive](/upgrading/ember-data/), for apps that start from `ember-data` packages
  alone.

See [Upgrading and Blog Pages](/guides/contributing/writing-documentation/writing-guides.md#upgrading-and-blog-pages)
for the authoring rules that keep these guarantees true.

## Which Guide Do I Need?

Check which `ember-data` version your app is on.

- **4.12 or earlier.** These releases publish only `ember-data` and `@ember-data/*` packages. Start at
  [ember-data → WarpDrive](/upgrading/ember-data/). It runs the latest WarpDrive beside your
  current `ember-data` and moves one route at a time. To stay on 4.12 and adopt the new request
  APIs in the store you already have, see
  [Adopting the Request APIs on 4.12](/upgrading/ember-data/incremental-adoption.md).
- **4.13 or any 5.x.** These releases already depend on `@warp-drive/*` packages. Start at
  [4.x → 5.x](/upgrading/v5/), which uses
  [mirror packages](/upgrading/v5/two-store-migration.md#mirror-versions) to run both versions side by side.

## Deprecations

Individual deprecation IDs and their descriptions ship as part of the
[Deprecations API docs](/api/@warp-drive/core/build-config/deprecations/). Longer-form
deprecation guides for EmberData/WarpDrive currently live at
[deprecations.emberjs.com](https://deprecations.emberjs.com/) and are planned to move under this
section &mdash; see [issue #11028](https://github.com/warp-drive-data/warp-drive/issues/11028)
for status.
