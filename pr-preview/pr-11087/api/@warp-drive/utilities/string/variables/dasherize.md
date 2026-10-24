---
url: /pr-preview/pr-11087/api/@warp-drive/utilities/string/variables/dasherize.md
---

# &#x20;dasherize&#x20;

```ts
const dasherize: (str: string) => string = internalDasherize;
```

Defined in: [-private/string/transform.ts:40](https://github.com/warp-drive-data/warp-drive/blob/940ef51ee8062100fceca2c93a9d061434917969/warp-drive-packages/utilities/src/-private/string/transform.ts#L40)

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
