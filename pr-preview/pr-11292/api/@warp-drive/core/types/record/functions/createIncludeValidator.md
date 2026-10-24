---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/core/types/record/functions/createIncludeValidator.md
---

# &#x20;createIncludeValidator()

```ts
function createIncludeValidator<T extends TypedRecordInstance>(): <U>(includes: _StringSatisfiesIncludes<U, Exclude<_ExtractUnion<3, T, true, NONE, NONE, 1>, NONE>>) => U;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:225](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/core/src/types/record.ts#L225)

Creates a runtime validator function for comma-separated `include` strings,
ensuring at compile time that only valid paths for `T` (per [Includes](../types/Includes.md))
are supplied.

## Type Parameters

### T

`T` *extends* [`TypedRecordInstance`](../types/TypedRecordInstance.md)

## Returns

<`U`>(`includes`: `_StringSatisfiesIncludes`<`U`, [`Exclude`](https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers)<`_ExtractUnion`<`3`, `T`, `true`, `NONE`, `NONE`, `1`>, `NONE`>>) => `U`

## Example

```ts
import { createIncludeValidator } from '@warp-drive/core/types/record';

const userIncludesValidator = createIncludeValidator<User>;

userIncludesValidator('company,company.ceo,friends');
```
