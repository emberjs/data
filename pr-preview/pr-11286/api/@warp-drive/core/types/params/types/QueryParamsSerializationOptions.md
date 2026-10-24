---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/core/types/params/types/QueryParamsSerializationOptions.md
---

# &#x20;QueryParamsSerializationOptions

```ts
type QueryParamsSerializationOptions = {
  arrayFormat?: "bracket" | "indices" | "repeat" | "comma";
};
```

Defined in: [warp-drive-packages/core/src/types/params.ts:20](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/params.ts#L20)

Options for controlling how [QueryParamsSource](QueryParamsSource.md) values are
serialized into a URL query string.

## Properties

### arrayFormat?

```ts
optional arrayFormat?: "bracket" | "indices" | "repeat" | "comma";
```

Defined in: [warp-drive-packages/core/src/types/params.ts:29](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/core/src/types/params.ts#L29)

How array values should be serialized:

* `'bracket'` - `key[]=1&key[]=2`
* `'indices'` - `key[0]=1&key[1]=2`
* `'repeat'` - `key=1&key=2`
* `'comma'` - `key=1,2`
