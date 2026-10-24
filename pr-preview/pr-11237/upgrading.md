---
url: https://canary.warp-drive.io/pr-preview/pr-11237/upgrading.md
description: >-
  Find the permanent, versioned upgrade guides for each WarpDrive major,
  starting with the 4.x to 5.x guide, plus where deprecation guides currently
  live.
---

# Upgrading ***Warp*Drive**

This section is the permanent home for point-in-time content: major-version upgrade guides,
deprecation guidance, and one-off feature migrations. Unlike the rest of the guides —
which describe the *current* API and change version to version — pages here describe how
to get from one specific point to another, and are expected to keep working the same way for
whoever finds them years from now.

## Guarantees

* **URLs are permanent.** A page's URL is never renamed and never unpublished. If a page's
  content is fully superseded, the page is kept in place, marked as superseded, and links
  forward to its replacement rather than being deleted.
* **Pages are dated and versioned.** Every page under `Upgrading` records the ***Warp*Drive**\*
  version (and, where useful, the date) it was authored against, usually with a `<SinceBadge />`
  near the top of the page.
* **Content is organized by major version.** Each major version gets its own sub-section (e.g.
  [4.x → 5.x](/upgrading/v5/)) containing that version's upgrade guide plus any deprecation or
  feature-specific migration guides written for it.

See [Upgrading and Blog Pages](/guides/contributing/writing-documentation/writing-guides.md#upgrading-and-blog-pages)
for the authoring rules that keep these guarantees true.

## Major Versions

* [4.x → 5.x](/upgrading/v5/)

## Deprecations

Individual deprecation IDs and their descriptions ship as part of the
[Deprecations API docs](/api/@warp-drive/core/build-config/deprecations/). Longer-form
deprecation guides for EmberData/WarpDrive currently live at
[deprecations.emberjs.com](https://deprecations.emberjs.com/) and are planned to move under this
section — see [issue #11028](https://github.com/warp-drive-data/warp-drive/issues/11028)
for status.
