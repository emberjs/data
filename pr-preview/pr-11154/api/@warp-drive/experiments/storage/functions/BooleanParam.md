---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/experiments/storage/functions/BooleanParam.md
---

&#x20;

# &#x20;BooleanParam()

```ts
function BooleanParam(): ParamConfig;
```

Defined in: [storage/query-params.ts:44](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/experiments/src/storage/query-params.ts#L44)

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
