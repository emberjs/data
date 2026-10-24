---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/experiments/storage/functions/param.md
description: >-
  Experimental decorator that marks a storage resource field as a URL query
  parameter, recording how to serialize it for a router integration.
---

&#x20;

# &#x20;param()

```ts
function param(config: ParamConfig): PropertyDecorator;
```

Defined in: [warp-drive-packages/experiments/src/storage/query-params.ts:121](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/experiments/src/storage/query-params.ts#L121)

Decorator which marks a field as a query parameter.

This decorator only stores metadata - it does not change the property behavior.
The field will operate as a normal `@field` until a router integration consumes it.

The provided [ParamConfig](../types/ParamConfig.md) is used to:

* Serialize values for the URL
* Deserialize values from the URL
* Compare URL and local values
* Determine when to include/exclude params from the URL

## Parameters

### config

[`ParamConfig`](../types/ParamConfig.md)

Configuration for URL serialization/deserialization

## Returns

`PropertyDecorator`

## Example

```ts
@SessionResource('map-state')
class MapState {
  @param({
    serialize: (value: unknown) => (value ? '1' : null),
    deserialize: (urlValue: string) => urlValue === '1',
  })
  @field
  active: boolean = false;
}
```
