---
url: /pr-preview/pr-11087/api/@ember-data/active-record.md
---

:::warning ⚠️ This package only exists for backwards compatibility
Newer apps should use [@warp-drive/utilities](../../@warp-drive/utilities/index.md)
:::

This package used to provide the RequestManager and its related
facilities. The source-code has since been moved to [@warp-drive/utilities](../../@warp-drive/utilities/index.md)
and this package now exists solely to provide backwards compatibility.

***

This package provides utilities for working with [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html#convention-over-configuration-in-active-record) APIs.

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

::: code-group

```sh [pnpm]
pnpm add -E @ember-data/active-record
```

```sh [npm]
npm add -E @ember-data/active-record
```

```sh [yarn]
yarn add -E @ember-data/active-record
```

```sh [bun]
bun add --exact @ember-data/active-record
```

:::

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to construct a request that would fetch a resource from your API:

```ts
import { findRecord } from '@ember-data/active-record/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });
```

This would produce the following request object:

```js
{
  url: 'https://api.example.com/v1/ember_developers/1?include=friends,pets',
  method: 'GET',
  headers: <Headers>, // 'Accept': 'application/json;charset=utf-8'
  op: 'findRecord';
  records: [{ type: 'ember-developer', id: '1' }]
}
```

Request builder output may be used with either `requestManager.request` or `store.request`.

```ts
const data = await store.request(options);
```

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common ActiveRecord format (underscored pluralized resource types).
