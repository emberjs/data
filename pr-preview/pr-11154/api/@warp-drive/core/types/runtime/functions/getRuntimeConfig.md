---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/runtime/functions/getRuntimeConfig.md
---

# &#x20;getRuntimeConfig()

```ts
function getRuntimeConfig(): {
  debug: Partial<LOG_CONFIG>;
  mirage?: boolean;
};
```

Defined in: [warp-drive-packages/core/src/types/runtime.ts:52](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/runtime.ts#L52)

Returns the current WarpDrive runtime configuration.

## Returns

### debug

```ts
debug: Partial<LOG_CONFIG>;
```

the currently active logging configuration, see
[the debugging flags](../../../build-config/debugging/index.md)

### mirage?

```ts
optional mirage?: boolean;
```

whether requests should be treated as being served by Mirage,
see [setIsMaybeMirage](setIsMaybeMirage.md)

## Example

```ts
const { debug, mirage } = getRuntimeConfig();
```
