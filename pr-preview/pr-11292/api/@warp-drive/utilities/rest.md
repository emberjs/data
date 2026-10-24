---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/utilities/rest.md
---

This module provides utilities for working with **REST**ful APIs with ***Warp*Drive**

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

::: code-group

```ts [input.ts]
import { findRecord } from '@warp-drive/utilities/rest';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });
```

```ts [output.ts]
{
  url: 'https://api.example.com/v1/emberDevelopers/1?include=friends,pets',
  method: 'GET',
  headers: <Headers>, // 'Content-Type': 'application/json;charset=utf-8'
  op: 'findRecord';
  records: [{ type: 'ember-developer', id: '1' }]
}
```

:::

Request builder output may be used with either [RequestManager.request](../../core/classes/RequestManager.md#request) or Store.request.

```ts
const data = await store.request(options);
```

### Features

* URLs are stable. The same query will produce the same URL every time, even if the order of keys in
  the query or values in an array changes.
* URLs follow the most common REST format (camelCase pluralized resource types).

## Functions

* [createRecord](functions/createRecord.md)
* [deleteRecord](functions/deleteRecord.md)
* [findRecord](functions/findRecord.md)
* [query](functions/query.md)
* [updateRecord](functions/updateRecord.md)
