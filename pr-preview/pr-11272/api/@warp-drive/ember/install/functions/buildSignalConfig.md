---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/ember/install/functions/buildSignalConfig.md
---

# &#x20;buildSignalConfig()

```ts
function buildSignalConfig(options: {
  wellknown: {
     Array: string | symbol;
  };
}): SignalHooks<Tag | [Tag, Tag, Tag]>;
```

Defined in: [warp-drive-packages/ember/dist/install.d.ts:13](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/ember/dist/install.d.ts#L13)

Builds the [SignalHooks](../../../core/configure/types/SignalHooks.md) implementation backed by Ember's
`@glimmer/validator` tags, used to wire WarpDrive's reactivity
primitives into Ember's autotracking system.

## Parameters

### options

#### wellknown

{
`Array`: `string` | `symbol`;
}

#### wellknown.Array

`string` | `symbol`

## Returns

[`SignalHooks`](../../../core/configure/types/SignalHooks.md)<`Tag` | \[`Tag`, `Tag`, `Tag`]>
