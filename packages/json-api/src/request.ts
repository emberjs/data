/**
 * <p align="center">
  <img
    class="project-logo"
    src="https://raw.githubusercontent.com/emberjs/data/4612c9354e4c54d53327ec2cf21955075ce21294/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData"
    width="240px"
    title="EmberData"
  />
</p>

This package provides utilities for working with [JSON:API](https://json-api.org) APIs with [*Ember***Data**](https://github.com/emberjs/data/).

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/json-api
```

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

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

### Available Builders

- [createRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Fjson-api/createRecord)
- [deleteRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Fjson-api/deleteRecord)
- [findRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Fjson-api/findRecord)
- [query](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Fjson-api/query)
- [updateRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Fjson-api/updateRecord)

 *
 * @module @ember-data/json-api/request
 * @main @ember-data/json-api/request
 */
export { findRecord } from './-private/builders/find-record';
export { query } from './-private/builders/query';
export { deleteRecord, createRecord, updateRecord } from './-private/builders/save-record';
export { serializeResources, serializePatch } from './-private/serialize';
