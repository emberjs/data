---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/compat/utils/functions/formattedId.md
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

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:144](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/utils.ts#L144)

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

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:145](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/utils.ts#L145)

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

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:146](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/compat/utils.ts#L146)

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
