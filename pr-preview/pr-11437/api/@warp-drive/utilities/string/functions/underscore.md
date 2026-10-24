---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11437/api/@warp-drive/utilities/string/functions/underscore.md
description: >-
  Converts camelCase, dashed, or spaced strings to lowercase snake_case, such as
  `innerHTML` to `inner_html`.
---

# &#x20;underscore()&#x20;

```ts
function underscore(str: string): string;
```

Defined in: [-private/string/transform.ts:83](https://github.com/warp-drive-data/warp-drive/blob/9db781b4e0d58a5d2a1a7014a370b4e570ca7a2a/warp-drive-packages/utilities/src/-private/string/transform.ts#L83)

Returns the lower\_case\_and\_underscored form of a string.

```js
import { underscore } from '@warp-drive/utilities/string';

underscore('innerHTML');                 // 'inner_html'
underscore('action_name');               // 'action_name'
underscore('css-class-name');            // 'css_class_name'
underscore('my favorite items');         // 'my_favorite_items'
underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
```

## Parameters

### str

`string`

## Returns

`string`
