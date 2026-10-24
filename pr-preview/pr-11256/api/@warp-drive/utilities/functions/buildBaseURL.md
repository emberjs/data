---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/utilities/functions/buildBaseURL.md
description: >-
  Joins host, namespace, resource path, id, and relationship field into a
  request URL without query params.
---

# &#x20;buildBaseURL()

```ts
function buildBaseURL(urlOptions: UrlOptions): string;
```

Defined in: [index.ts:528](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/utilities/src/index.ts#L528)

Builds a URL for a request based on the provided options.
Does not include support for building query params (see `buildQueryParams`)
so that it may be composed cleanly with other query-params strategies.

See the [Builders](/guides/the-manual/requests/builders) guide for writing your own request
builders.

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
