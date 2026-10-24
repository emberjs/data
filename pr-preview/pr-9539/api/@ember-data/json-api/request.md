---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@ember-data/json-api/request.md
description: >-
  Legacy alias re-exporting request builders from
  `@warp-drive/utilities/json-api` that produce fetch options with stable
  JSON:API URLs for `store.request`.
---

&#x20;

:::warning Legacy package
`@ember-data/json-api` is a legacy package. New code should use [`@warp-drive/json-api`](/api/@warp-drive/json-api/) for the cache and [`@warp-drive/utilities`](/api/@warp-drive/utilities/) for the request builders instead.
:::

This package provides utilities for working with [JSON:API](https://jsonapi.org) APIs with [*Ember***Data**](https://github.com/warp-drive-data/warp-drive/).

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```sh
pnpm add @ember-data/json-api
```

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

::: code-group

```ts [input.ts]
import { findRecord } from '@ember-data/json-api/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });
```

```ts [output.ts]
{
 url: 'https://api.example.com/v1/ember-developers/1?include=friends,pets',
 method: 'GET',
 headers: <Headers>,
   // => 'Accept': 'application/vnd.api+json'
   // => 'Content-Type': 'application/vnd.api+json'
 op: 'findRecord';
 records: [{ type: 'ember-developer', id: '1' }]
}
```

:::

Request builder output may be used with either `requestManager.request` or `store.request`.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common JSON:API format (dasherized pluralized resource types).
