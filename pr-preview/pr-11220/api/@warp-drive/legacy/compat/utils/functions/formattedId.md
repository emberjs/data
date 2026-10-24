---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11220/api/@warp-drive/legacy/compat/utils/functions/formattedId.md
description: >-
  Legacy migration helper that normalizes a resource id to the `string` or
  `null` the cache expects, asserting on invalid ids such as `''` or `0`.
---

&#x20;

# &#x20;formattedId()

```ts
function formattedId(id: string | number): string;
function formattedId(id: null): null;
function formattedId(id: string | number | null): string | null;
```

## Call Signature

```ts
function formattedId(id: string | number): string;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:156](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/compat/utils.ts#L156)

Format an id to the format expected by the WarpDrive Cache.
Currently this means that id should be `string | null`.

Asserts invalid IDs (undefined, '', 0, '0') in dev.

**Usage**

````js
import formattedId from 'client/utils/formatted-id';

formattedId('1'); // => '1'
formattedId(1); // => '1'
formattedId(null); // => null
	```

### Parameters

#### id

`string` \| `number`

the potentially un-normalized id

### Returns

`string`

the normalized id

## Call Signature

```ts
function formattedId(id: null): null;
````

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:157](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/compat/utils.ts#L157)

Format an id to the format expected by the WarpDrive Cache.
Currently this means that id should be `string | null`.

Asserts invalid IDs (undefined, '', 0, '0') in dev.

**Usage**

````js
import formattedId from 'client/utils/formatted-id';

formattedId('1'); // => '1'
formattedId(1); // => '1'
formattedId(null); // => null
	```

### Parameters

#### id

`null`

the potentially un-normalized id

### Returns

`null`

the normalized id

## Call Signature

```ts
function formattedId(id: string | number | null): string | null;
````

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:158](https://github.com/warp-drive-data/warp-drive/blob/74ce7e4962cbf21cd55d0c55dd6c7616c7281441/warp-drive-packages/legacy/src/compat/utils.ts#L158)

Format an id to the format expected by the WarpDrive Cache.
Currently this means that id should be `string | null`.

Asserts invalid IDs (undefined, '', 0, '0') in dev.

**Usage**

````js
import formattedId from 'client/utils/formatted-id';

formattedId('1'); // => '1'
formattedId(1); // => '1'
formattedId(null); // => null
	```

### Parameters

#### id

`string` \| `number` \| `null`

the potentially un-normalized id

### Returns

`string` \| `null`

the normalized id
````
