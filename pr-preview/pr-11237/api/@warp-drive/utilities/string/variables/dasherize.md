---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11237/api/@warp-drive/utilities/string/variables/dasherize.md
description: >-
  Converts camelCase, underscored, or spaced strings to dasherized form, such as
  `innerHTML` to `inner-html`.
---

# &#x20;dasherize&#x20;

```ts
const dasherize: (str: string) => string = internalDasherize;
```

Defined in: [-private/string/transform.ts:41](https://github.com/warp-drive-data/warp-drive/blob/803dd444fab4feb4634c7affd9dd1924399f927b/warp-drive-packages/utilities/src/-private/string/transform.ts#L41)

Replaces underscores, spaces, or camelCase with dashes.

```js
import { dasherize } from '@warp-drive/utilities/string';

dasherize('innerHTML');                // 'inner-html'
dasherize('action_name');              // 'action-name'
dasherize('css-class-name');           // 'css-class-name'
dasherize('my favorite items');        // 'my-favorite-items'
dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
```

## Parameters

### str

`string`

## Returns

`string`
