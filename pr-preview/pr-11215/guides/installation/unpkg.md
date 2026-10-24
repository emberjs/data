---
url: https://canary.warp-drive.io/pr-preview/pr-11215/guides/installation/unpkg.md
description: >-
  Load prebuilt ESM builds of WarpDrive packages from UNPKG and pick the unpkg,
  unpkg-dev, unpkg-deprecated, or unpkg-dev-deprecated export condition you
  need.
---

# UNPKG

***

Beginning in `5.8`, prebuilt versions of ***Warp*Drive** packages can be used via [UNPKG](https://unpkg.com/).

Four builds are provided for each package via the following
[export conditions](https://nodejs.org/api/packages.html#conditional-exports). These builds are unminified [JavaScript Modules (ESM)](https://unpkg.com/#nobuild-apps) and retain source code documentation comments.

| condition | description |
| --------- | ----------- |
| ***default*** `unpkg` | production build with all deprecated features removed |
| `unpkg-dev` | development build with all deprecated features removed |
| `unpkg-deprecated` | production build with all deprecated features available |
| `unpkg-dev-deprecated` | development build with all deprecated features available |

Example using `@warp-drive/core`

| Build | URL |
| ----- | --- |
| Production | <https://unpkg.com/@warp-drive/core@canary> |
| Production + Deprecations | <https://unpkg.com/@warp-drive/core@canary?conditions=unpkg-deprecated> |
| Development | <https://unpkg.com/@warp-drive/core@canary?conditions=unpkg-dev> |
| Development + Deprecations | <https://unpkg.com/@warp-drive/core@canary?conditions=unpkg-dev-deprecated> |
