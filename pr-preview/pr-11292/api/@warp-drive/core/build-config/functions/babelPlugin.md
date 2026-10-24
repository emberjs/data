---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/build-config/functions/babelPlugin.md
---

# &#x20;babelPlugin()

```ts
function babelPlugin(options: WarpDriveConfig): {
  gts: Function[];
  js: PluginItem[];
};
```

Defined in: [node\_modules/.pnpm/@warp-d\_25f56f2729dd79700790d78740333f27/node\_modules/@warp-drive/build-config/dist/index.d.ts:41](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/node_modules/.pnpm/@warp-d_25f56f2729dd79700790d78740333f27/node_modules/@warp-drive/build-config/dist/index.d.ts#L41)

Create the Babel plugin for WarpDrive

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
