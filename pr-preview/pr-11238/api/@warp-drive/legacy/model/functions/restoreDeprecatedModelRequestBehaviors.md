---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/legacy/model/functions/restoreDeprecatedModelRequestBehaviors.md
description: >-
  Legacy opt-in that restores the pre-`RequestManager` `save`, `destroyRecord`,
  `reload`, and `isReloading` onto a `Model` class without deprecation warnings.
---

&#x20;

# &#x20;restoreDeprecatedModelRequestBehaviors()

```ts
function restoreDeprecatedModelRequestBehaviors(ModelKlass: typeof Model): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1957](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model/-private/model.ts#L1957)

Restores the pre-`RequestManager` implementations of `save`,
`destroyRecord`, and `reload` onto the given `Model` subclass, for
apps that have not yet migrated off of the deprecated
`ENABLE_LEGACY_REQUEST_METHODS` behaviors.

## Parameters

### ModelKlass

*typeof* [`Model`](../classes/Model.md)

## Returns

`void`
