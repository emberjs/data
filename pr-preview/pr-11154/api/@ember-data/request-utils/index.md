---
url: /pr-preview/pr-11154/api/@ember-data/request-utils/index.md
---

Simple utility function to assist in url building,
query params, and other common request operations.

These primitives may be used directly or composed
by request builders to provide a consistent interface
for building requests.

For instance:

```ts
import { buildBaseURL, buildQueryParams } from '@ember-data/request-utils';

const baseURL = buildBaseURL({
  host: 'https://api.example.com',
  namespace: 'api/v1',
  resourcePath: 'emberDevelopers',
  op: 'query',
  identifier: { type: 'ember-developer' }
});
const url = `${baseURL}?${buildQueryParams({ name: 'Chris', include:['pets'] })}`;
// => 'https://api.example.com/api/v1/emberDevelopers?include=pets&name=Chris'
```

This is useful, but not as useful as the REST request builder for query which is sugar
over this (and more!):

```ts
import { query } from '@ember-data/rest/request';

const options = query('ember-developer', { name: 'Chris', include:['pets'] });
// => { url: 'https://api.example.com/api/v1/emberDevelopers?include=pets&name=Chris' }
// Note: options will also include other request options like headers, method, etc.
```

## Classes

* [LifetimesService](classes/LifetimesService.md)
