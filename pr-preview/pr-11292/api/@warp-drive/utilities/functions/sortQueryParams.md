---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/utilities/functions/sortQueryParams.md
---

# &#x20;sortQueryParams()

```ts
function sortQueryParams(params: QueryParamsSource, options?: QueryParamsSerializationOptions): URLSearchParams;
```

Defined in: [index.ts:663](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/utilities/src/index.ts#L663)

Sorts query params by both key and value returning a new URLSearchParams
object with the keys inserted in sorted order.

Treats `included` specially, splicing it into an array if it is a string and sorting the array.

The `params` given are never mutated: neither the object itself nor any array
value it holds is reordered or replaced, so passing state that is also
rendered (a tracked array of filter values, for instance) is safe.

Options:

* arrayFormat: 'bracket' | 'indices' | 'repeat' | 'comma'

'bracket': appends \[] to the key for every value e.g. `&ids[]=1&ids[]=2`
'indices': appends \[i] to the key for every value e.g. `&ids[0]=1&ids[1]=2`
'repeat': appends the key for every value e.g. `&ids=1&ids=2`
'comma' (default): appends the key once with a comma separated list of values e.g. `&ids=1,2`

## Parameters

### params

[`QueryParamsSource`](../../core/types/params/types/QueryParamsSource.md)

### options?

[`QueryParamsSerializationOptions`](../../core/types/params/types/QueryParamsSerializationOptions.md)

## Returns

[`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams)

A [URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams) with keys inserted in sorted order
