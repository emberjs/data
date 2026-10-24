---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/core/reactive/types/AutorefreshBehaviorCombos.md
description: >-
  The accepted values for a request subscription's `autorefresh` option: a
  boolean or a comma-separated mix of `online`, `interval`, and `invalid`.
---

# &#x20;AutorefreshBehaviorCombos

```ts
type AutorefreshBehaviorCombos = 
  | boolean
  | AutorefreshBehaviorType
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType}`
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType},${AutorefreshBehaviorType}`;
```

Defined in: [warp-drive-packages/core/src/signals/request-subscription.ts:41](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/core/src/signals/request-subscription.ts#L41)

The value accepted by [SubscriptionArgs.autorefresh](SubscriptionArgs.md#autorefresh): either a
boolean, a single [AutorefreshBehaviorType](AutorefreshBehaviorType.md), or a comma-separated
combination of up to three of them.
