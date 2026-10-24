---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/core/types/record/types/StringSatisfiesIncludes.md
---

# &#x20;StringSatisfiesIncludes\<T *extends* `string`, SET *extends* `string`>

```ts
type StringSatisfiesIncludes<T extends string, SET extends string> = _StringSatisfiesIncludes<T, SET, T>;
```

Defined in: [warp-drive-packages/core/src/types/record.ts:209](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/core/src/types/record.ts#L209)

Validates that the comma-separated-string `T` (e.g. `'company,company.ceo,friends'`)
only contains paths present in the union `SET` (typically [Includes](Includes.md)).

TypeScript cannot autocomplete against this type; prefer [createIncludeValidator](../functions/createIncludeValidator.md)
for a better development experience unless you are writing a similar wrapper utility.

## Type Parameters

### T

`T` *extends* `string`

### SET

`SET` *extends* `string`

## Example

```ts
import type { StringSatisfiesIncludes, Includes } from '@warp-drive/core/types/record';

const includes: StringSatisfiesIncludes<
  'company,company.ceo,friends',
  Includes<User>
> = 'company,company.ceo,friends';
```
