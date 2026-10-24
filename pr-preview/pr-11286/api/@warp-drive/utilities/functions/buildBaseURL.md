---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/utilities/functions/buildBaseURL.md
---

# &#x20;buildBaseURL()

```ts
function buildBaseURL(urlOptions: UrlOptions): string;
```

Defined in: [index.ts:504](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/utilities/src/index.ts#L504)

Builds a URL for a request based on the provided options.
Does not include support for building query params (see `buildQueryParams`)
so that it may be composed cleanly with other query-params strategies.

Usage:

```ts
import { buildBaseURL } from '@warp-drive/utilities';

const url = buildBaseURL({
  host: 'https://api.example.com',
  namespace: 'api/v1',
  resourcePath: 'emberDevelopers',
  op: 'query',
  identifier: { type: 'ember-developer' }
});

// => 'https://api.example.com/api/v1/emberDevelopers'
```

On the surface this may seem like a lot of work to do something simple, but
it is designed to be composable with other utilities and interfaces that the
average product engineer will never need to see or use.

A few notes:

* `resourcePath` is optional, but if it is not provided, `identifier.type` will be used.
* `host` and `namespace` are optional, but if they are not provided, the values globally
  configured via `setBuildURLConfig` will be used.
* `op` is required and must be one of the following:
  * 'findRecord' 'query' 'findMany' 'findRelatedCollection' 'findRelatedRecord'\` 'createRecord' 'updateRecord' 'deleteRecord'
* Depending on the value of `op`, `identifier` or `identifiers` will be required.

## Parameters

### urlOptions

[`UrlOptions`](../types/UrlOptions.md)

## Returns

`string`
