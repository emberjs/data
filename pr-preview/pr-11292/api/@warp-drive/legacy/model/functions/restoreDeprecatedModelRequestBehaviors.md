---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/model/functions/restoreDeprecatedModelRequestBehaviors.md
---

&#x20;

# &#x20;restoreDeprecatedModelRequestBehaviors()

```ts
function restoreDeprecatedModelRequestBehaviors(ModelKlass: typeof Model): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/model.ts:1952](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/model.ts#L1952)

Restores the pre-`RequestManager` implementations of `save`,
`destroyRecord`, and `reload` onto the given `Model` subclass, for
apps that have not yet migrated off of the deprecated
`ENABLE_LEGACY_REQUEST_METHODS` behaviors.

## Parameters

### ModelKlass

*typeof* [`Model`](../classes/Model.md)

## Returns

`void`
