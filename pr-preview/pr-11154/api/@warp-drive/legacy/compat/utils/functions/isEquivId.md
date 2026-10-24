---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/compat/utils/functions/isEquivId.md
---

&#x20;

# &#x20;isEquivId()

```ts
function isEquivId(expected: string | number, actual: string | number | null): boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:245](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/compat/utils.ts#L245)

Compares two IDs for strict equality, converting them to
the format expected by the WarpDrive Cache to ensure
differences in format are accounted for in the comparison.

Asserts when expected or actual are invalid IDs in dev.
Expected may never be null.

```js
isEquivId('1', 1); // true
isEquivId('2', '2'); // true
isEquivId(3, '3'); // true
isEquivId(4, '3'); // false
isEquivId(1, null); // false
```

## Parameters

### expected

`string` | `number`

a potentially un-normalized id to match against

### actual

`string` | `number` | `null`

a potentially un-normalized id to match against

## Returns

`boolean`

true if the ids are equivalent
