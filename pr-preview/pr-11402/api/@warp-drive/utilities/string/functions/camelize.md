---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11402/api/@warp-drive/utilities/string/functions/camelize.md
description: >-
  Converts dashed, underscored, dotted, or spaced strings to lowerCamelCase,
  such as `action_name` to `actionName`.
---

# &#x20;camelize()&#x20;

```ts
function camelize(str: string): string;
```

Defined in: [-private/string/transform.ts:62](https://github.com/warp-drive-data/warp-drive/blob/2f9dd60e2e8475e54dc0b38deaf9c4a3da3adc17/warp-drive-packages/utilities/src/-private/string/transform.ts#L62)

Returns the lowerCamelCase form of a string.

```js
import { camelize } from '@warp-drive/utilities/string';

camelize('innerHTML');                   // 'innerHTML'
camelize('action_name');                 // 'actionName'
camelize('css-class-name');              // 'cssClassName'
camelize('my favorite items');           // 'myFavoriteItems'
camelize('My Favorite Items');           // 'myFavoriteItems'
camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
```

## Parameters

### str

`string`

## Returns

`string`
