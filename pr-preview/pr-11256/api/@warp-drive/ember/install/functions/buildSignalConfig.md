---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/ember/install/functions/buildSignalConfig.md
description: >-
  Creates the signal hooks that wire WarpDrive reactivity into Ember
  autotracking using `@glimmer/validator` tags.
---

# &#x20;buildSignalConfig()

```ts
function buildSignalConfig(options: {
  wellknown: {
     Array: string | symbol;
  };
}): SignalHooks<Tag | [Tag, Tag, Tag]>;
```

Defined in: [warp-drive-packages/ember/src/install.ts:49](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/ember/src/install.ts#L49)

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
