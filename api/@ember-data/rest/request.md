---
url: https://canary.warp-drive.io/api/@ember-data/rest/request.md
description: >-
  Legacy alias re-exporting request builders from `@warp-drive/utilities/rest`
  that produce fetch options with * stable, camelCase pluralized REST URLs. *
---

&#x20;

:::warning Legacy package
`@ember-data/rest` is a legacy package. New code should use [`@warp-drive/utilities/rest`](/api/@warp-drive/utilities/rest/) instead.
:::

This package provides utilities for working with **REST**ful APIs with [*Ember***Data**](https://github.com/warp-drive-data/warp-drive/).

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

::: code-group

```ts [input.ts]
import { findRecord } from '@ember-data/rest/request';

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

Request builder output is ready to go for use with [store.request](../../../@warp-drive/core/classes/Store.md#request),
[manager.request](../../../@warp-drive/core/classes/RequestManager.md#request) and most conventional REST APIs.

Resource types are pluralized and camelized for the url.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common REST format (camelCase pluralized resource types).

These builders are re-exported from [@warp-drive/utilities/rest](../../../@warp-drive/utilities/rest/index.md); new code should import from there.

*
