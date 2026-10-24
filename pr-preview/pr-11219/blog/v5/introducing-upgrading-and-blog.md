---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/blog/v5/introducing-upgrading-and-blog.md
description: >-
  Learn why WarpDrive 5.10 added the permanent Upgrading and Blog sections to
  warp-drive.io and where the former /guides/migrating/ pages now live.
---

# Introducing Upgrading & Blog

&#x20;  2026-09-05

Guides and API docs change version to version, but some content is point-in-time: release
announcements, deprecation guides, and one-off migration guides. That content needs a stable
home whose URLs don't move under it.

Starting today, [warp-drive.io](https://warp-drive.io) has two new top-level sections for exactly
this:

* **[Upgrading](/upgrading/)** — major-version upgrade guides, and eventually deprecation
  guidance and feature-specific migration guides, organized by major version.
* **Blog** (this section) — release posts and other announcements, dual-published here so
  that non-Ember consumers of ***Warp*Drive**\* don't have to go looking for them on
  [blog.emberjs.com](https://blog.emberjs.com/).

Both sections share the same guarantee: **a published URL here is never renamed and never
unpublished.** If a page is fully superseded, it stays in place, is marked superseded, and links
forward to whatever replaced it.

As a first step, the guides that used to live at `/guides/migrating/` have moved to
[`/upgrading/v5/`](/upgrading/v5/) — their old URLs still resolve and now point readers to
the new location.

This is the first piece of the plan described in
[issue #11028](https://github.com/warp-drive-data/warp-drive/issues/11028). Next up: bringing
deprecation guides in from [deprecations.emberjs.com](https://deprecations.emberjs.com/) and
setting up dual-publishing for release posts from
[blog.emberjs.com](https://blog.emberjs.com/).
