---
url: /pr-preview/pr-11087/api/@warp-drive/experiments/storage/functions/param.md
---

&#x20;

# &#x20;param()

```ts
function param(config: ParamConfig): PropertyDecorator;
```

Defined in: [storage/query-params.ts:112](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/experiments/src/storage/query-params.ts#L112)

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
