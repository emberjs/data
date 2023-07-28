<p align="center">
  <img
    class="project-logo"
    src="./ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData ActiveRecord"
    width="240px"
    title="EmberData ActiveRecord"
    />
  <img
    class="project-logo"
    src="./ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData ActiveRecord"
    width="240px"
    title="EmberData ActiveRecord"
    />
</p>

<p align="center">Elegantly composable. Made for <strong>Active</strong>Record</p>

This package provides utilities for working with **Active**Record APIs with [*Ember***Data**](https://github.com/emberjs/data/).

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/active-record
```

## Getting Started

If this package is how you are first learning about EmberData, we recommend starting with learning about the [Store](https://github.com/emberjs/data/blob/main/packages/store/README.md) and [Requests](https://github.com/emberjs/data/blob/main/packages/request/README.md)

## Request Builders

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

```ts
import { findRecord } from '@ember-data/active-record/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });

/*
  => {
    url: 'https://api.example.com/v1/ember_developers/1?include=friends,pets',
    method: 'GET',
    headers: <Headers>, // 'Content-Type': 'application/json; charset=utf-8'
    op: 'findRecord';
    records: [{ type: 'ember-developer', id: '1' }]
  }
*/
```

Request builder output may be used with either `requestManager.request` or `store.request`.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common ActiveRecord format (underscored pluralized resource types).

### Available Builders

- [createRecord]()
- [deleteRecord]()
- [findRecord]()
- [query]()
- [updateRecord]()
