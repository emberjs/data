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

This package provides utilities for working with **REST**ful APIs with [*Ember***Data**](https://github.com/emberjs/data/).

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
import { findRecord } from '@ember-data/rest/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });

/*
  => {
    url: 'https://api.example.com/v1/emberDevelopers/1?include=friends,pets',
    method: 'GET',
    headers: <Headers>, // 'Content-Type': 'application/json; charset=utf-8'
    op: 'findRecord';
    records: [{ type: 'ember-developer', id: '1' }]
  }
* /
```

Request builder output is ready to go for use with [store.request](https://api.emberjs.com/ember-data/release/classes/Store/methods/request?anchor=request),
[manager.request](https://api.emberjs.com/ember-data/release/classes/RequestManager/methods/request?anchor=request) and most conventional REST APIs.

Resource types are pluralized and camelized for the url.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common REST format (camelCase pluralized resource types).

### Available Builders

- [createRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Frest/createRecord)
- [deleteRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Frest/deleteRecord)
- [findRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Frest/findRecord)
- [query](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Frest/query)
- [updateRecord](https://api.emberjs.com/ember-data/release/functions/@ember-data%2Frest/updateRecord)

 * @module @ember-data/rest/request
 * @main @ember-data/rest/request
 * @public
 */
export { findRecord } from './-private/builders/find-record';
export { query } from './-private/builders/query';
export { deleteRecord, createRecord, updateRecord } from './-private/builders/save-record';
