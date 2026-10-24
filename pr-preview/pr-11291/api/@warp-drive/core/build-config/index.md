---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/core/build-config.md
description: >-
  Build-time configuration for WarpDrive: `setConfig` and its babel plugin for
  deprecations, features, debug logging, and polyfill settings.
---

This module provides a build-plugin that enables configuration of deprecations,
optional features, development/testing support and debug logging.

Available settings include:

* LOGGING | debugging
* DEPRECATIONS | deprecations
* FEATURES | features
* [polyfillUUID](types/WarpDriveConfig.md#polyfilluuid)
* [includeDataAdapterInProduction](types/WarpDriveConfig.md#includedataadapterinproduction)
* [compatWith](types/WarpDriveConfig.md#compatwith)

## Functions

* [babelPlugin](functions/babelPlugin.md)
* [setConfig](functions/setConfig.md)

## Types

* [WarpDriveConfig](types/WarpDriveConfig.md)
