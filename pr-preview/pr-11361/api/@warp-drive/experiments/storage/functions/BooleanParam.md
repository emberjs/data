---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11361/api/@warp-drive/experiments/storage/functions/BooleanParam.md
description: >-
  Experimental helper that creates a query-param config serializing a boolean
  field as '1' when true and omitting it when false.
---

&#x20;

# &#x20;BooleanParam()

```ts
function BooleanParam(): ParamConfig;
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:49](https://github.com/warp-drive-data/warp-drive/blob/5035467d85b70b796e68552734340cf9648176c5/warp-drive-packages/experiments/src/storage/query-params.ts#L49)

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
