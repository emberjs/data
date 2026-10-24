---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/core/types/params/types/QueryParamsSerializationOptions.md
---

# &#x20;QueryParamsSerializationOptions

```ts
type QueryParamsSerializationOptions = {
  arrayFormat?: "bracket" | "indices" | "repeat" | "comma";
};
```

Defined in: [warp-drive-packages/core/src/types/params.ts:20](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/params.ts#L20)

Options for controlling how [QueryParamsSource](QueryParamsSource.md) values are
serialized into a URL query string.

## Properties

### arrayFormat?

```ts
optional arrayFormat?: "bracket" | "indices" | "repeat" | "comma";
```

Defined in: [warp-drive-packages/core/src/types/params.ts:29](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/core/src/types/params.ts#L29)

How array values should be serialized:

* `'bracket'` - `key[]=1&key[]=2`
* `'indices'` - `key[0]=1&key[1]=2`
* `'repeat'` - `key=1&key=2`
* `'comma'` - `key=1,2`
