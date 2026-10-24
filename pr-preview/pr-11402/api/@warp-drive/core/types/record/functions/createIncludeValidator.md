---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/core/types/record/functions/createIncludeValidator.md
description: >-
  Returns a function that type-checks a comma-separated `include` string against
  the valid relationship paths of a record type and returns it unchanged.
---

# &#x20;createIncludeValidator()

```ts
function createIncludeValidator<T extends TypedRecordInstance>(): <U>(includes: _StringSatisfiesIncludes<U, Exclude<_ExtractUnion<3, T, true, NONE, NONE, 1>, NONE>>) => U;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:245](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/core/src/types/record.ts#L245)

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
