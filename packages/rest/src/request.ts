// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RequestManager, Store } from '@warp-drive/core';
/**
This package provides utilities for working with **REST**ful APIs with [*Ember***Data**](https://github.com/warp-drive-data/warp-drive/).

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

```ts
import { findRecord } from '@ember-data/rest/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });

/*
  => {
    url: 'https://api.example.com/v1/emberDevelopers/1?include=friends,pets',
    method: 'GET',
    headers: <Headers>, // 'Content-Type': 'application/json;charset=utf-8'
    op: 'findRecord';
    records: [{ type: 'ember-developer', id: '1' }]
  }
* /
```

Request builder output is ready to go for use with {@link Store.request | store.request},
{@link RequestManager.request | manager.request} and most conventional REST APIs.

Resource types are pluralized and camelized for the url.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common REST format (camelCase pluralized resource types).

 * @module
 */
export { findRecord, query, deleteRecord, createRecord, updateRecord } from '@warp-drive/utilities/rest';
