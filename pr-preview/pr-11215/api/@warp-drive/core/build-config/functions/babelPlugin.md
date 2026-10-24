---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/core/build-config/functions/babelPlugin.md
description: >-
  Creates the Babel plugins that apply a WarpDrive build config, for projects
  not already using `@embroider/macros`.
---

# &#x20;babelPlugin()

```ts
function babelPlugin(options: WarpDriveConfig): {
  gts: Function[];
  js: PluginItem[];
};
```

Defined in: [warp-drive-packages/build-config/src/index.ts:34](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/build-config/src/index.ts#L34)

Create the Babel plugin for WarpDrive

The [Setup](/guides/configuration/#configure-the-build-plugin) guide shows how to
configure it.

Note: If your project already uses [@embroider/macros](https://www.npmjs.com/package/@embroider/macros)
then you should use [setConfig](setConfig.md) instead of this function.

## Parameters

### options

[`WarpDriveConfig`](../types/WarpDriveConfig.md)

WarpDrive configuration options

## Returns

```ts
{
  gts: Function[];
  js: PluginItem[];
}
```

An array of Babel plugins

### gts

```ts
gts: Function[];
```

### js

```ts
js: PluginItem[];
```
