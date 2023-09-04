/**
 * # Request builders and serialization utils for JSON:API requests
 *
 * ## Request Builders

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

```ts
import { findRecord } from '@ember-data/json-api/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });

/\*
  => {
    url: 'https://api.example.com/v1/ember-developers/1?include=friends,pets',
    method: 'GET',
    headers: <Headers>,
      // => 'Accept': 'application/vnd.api+json'
      // => 'Content-Type': 'application/vnd.api+json'
    op: 'findRecord';
    records: [{ type: 'ember-developer', id: '1' }]
  }
*\/
```

Request builder output may be used with either `requestManager.request` or `store.request`.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common JSON:API format (dasherized pluralized resource types).
 *
 * @module @ember-data/json-api/request
 * @main @ember-data/json-api/request
 */
export { findRecord } from './-private/builders/find-record';
export { query } from './-private/builders/query';
export { deleteRecord, createRecord, updateRecord } from './-private/builders/save-record';
export { serializeResources, serializePatch } from './-private/serialize';
