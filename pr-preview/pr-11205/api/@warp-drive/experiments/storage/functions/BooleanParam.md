---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/experiments/storage/functions/BooleanParam.md
---

&#x20;

# &#x20;BooleanParam()

```ts
function BooleanParam(): ParamConfig;
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:44](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/experiments/src/storage/query-params.ts#L44)

Creates a [ParamConfig](../types/ParamConfig.md) for boolean fields that serialize to '1' or null.

## Returns

[`ParamConfig`](../types/ParamConfig.md)

ParamConfig for boolean fields

## Example

```ts
@param(BooleanParam())
@field
myFlag: boolean = false;
```
