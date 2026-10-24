---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11248/api/@warp-drive/utilities/string/functions/capitalize.md
description: >-
  Uppercases the first letter of a string, and of each `/`-separated path
  segment, leaving the rest unchanged.
---

# &#x20;capitalize()&#x20;

```ts
function capitalize(str: string): string;
```

Defined in: [-private/string/transform.ts:104](https://github.com/warp-drive-data/warp-drive/blob/2a7775b63d675b44ad18ef1e1cf8bef854369524/warp-drive-packages/utilities/src/-private/string/transform.ts#L104)

Returns the Capitalized form of a string

```js
import { capitalize } from '@warp-drive/utilities/string';

capitalize('innerHTML')                 // 'InnerHTML'
capitalize('action_name')               // 'Action_name'
capitalize('css-class-name')            // 'Css-class-name'
capitalize('my favorite items')         // 'My favorite items'
capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
```

## Parameters

### str

`string`

## Returns

`string`
