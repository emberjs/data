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

This package provides utilities for working with [ActiveRecord](https://guides.rubyonrails.org/active_record_basics.html#convention-over-configuration-in-active-record) APIs with [*Ember***Data**](https://github.com/emberjs/data/).

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/active-record
```

## Usage

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

```ts
import { findRecord } from '@ember-data/active-record/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });

/\*
  => {
    url: 'https://api.example.com/v1/ember_developers/1?include=friends,pets',
    method: 'GET',
    headers: <Headers>, // 'Content-Type': 'application/json;charset=utf-8'
    op: 'findRecord';
    records: [{ type: 'ember-developer', id: '1' }]
  }
*\/
```

Request builder output may be used with either `requestManager.request` or `store.request`.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common ActiveRecord format (underscored pluralized resource types).

### Available Builders

- [createRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Factive-record/createRecord)
- [deleteRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Factive-record/deleteRecord)
- [findRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Factive-record/findRecord)
- [query](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Factive-record/query)
- [updateRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Factive-record/updateRecord)

 *
 * @module @ember-data/active-record/request
 * @main @ember-data/active-record/request
 */
export { findRecord } from './-private/builders/find-record';
export { query } from './-private/builders/query';
export { deleteRecord, createRecord, updateRecord } from './-private/builders/save-record';
