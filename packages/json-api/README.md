<p align="center">
  <img
    class="project-logo"
    src="./logos/ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData JSON:API Cache"
    width="240px"
    title="EmberData JSON:API Cache"
    />
  <img
    class="project-logo"
    src="./logos/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData JSON:API Cache"
    width="240px"
    title="EmberData JSON:API Cache"
    />
</p>

<p align="center">Elegantly composable. Made for <strong>JSON:</strong>API</p>

This package provides an in-memory document and resource [Cache](https://github.com/emberjs/data/blob/main/ember-data-types/cache/cache.ts) and associated utilities for use with [*Ember***Data**](https://github.com/emberjs/data/) and [JSON:API](https://jsonapi.org/).

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/json-api
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/json-api/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40ember-data/json-api/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40ember-data/json-api/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40ember-data/json-api/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40ember-data/json-api/lts-4-12?label=%40lts-4-12&color=bbbbbb)


## Getting Started

If this package is how you are first learning about EmberData, we recommend starting with learning about the [Store](https://github.com/emberjs/data/blob/main/packages/store/README.md) and [Requests](https://github.com/emberjs/data/blob/main/packages/request/README.md)

## 🚀 Setup

> **Note**
> When using [ember-data](https://github.com/emberjs/data/blob/main/packages/-ember-data) the below
> configuration is handled for you automatically.

```ts
import Store from '@ember-data/store';
import Cache from '@ember-data/json-api';

export default class extends Store {
  createCache(wrapper) {
    return new Cache(wrapper);
  }
}
```

## Usage

Usually you will directly interact with the cache only if implementing a presentation class. Below we
give an example of a read-only record (mutations never written back to the cache). More typically cache
interactions are something that the `Store` coordinates as part of the `request/response` lifecycle.

```ts
import Store, { recordIdentifierFor } from '@ember-data/store';
import Cache from '@ember-data/json-api';
import { TrackedObject } from 'tracked-built-ins';

class extends Store {
  createCache(wrapper) {
    return new Cache(wrapper);
  }

  instantiateRecord(identifier) {
    const { cache, notifications } = this;
    const { type, id } = identifier;

    // create a TrackedObject with our attributes, id and type
    const attrs = cache.peek(identifier).attributes;
    const data = Object.assign({}, attrs, { type, id });
    const record = new TrackedObject(data);

    // update the TrackedObject whenever attributes change
    const token = notifications.subscribe(identifier, (_, change) => {
      if (change === 'attributes') {
        Object.assign(record, cache.peek(identifier).attributes);
      }
    });

    // setup the ability to teardown the subscription when the
    // record is no longer needed
    record.destroy = () => {
      this.notifications.unsubscribe(token);
    };

    return record;
  }

  teardownRecord(record: FakeRecord) {
    record.destroy();
  }
}
```

For the full list of APIs available read the code documentation for [*Ember***Data** Cache](https://github.com/emberjs/data/blob/main/ember-data-types/cache/cache.ts)

## Request Builders

Request builders are functions that produce [Fetch Options](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). They take a few contextual inputs about the request you want to make, abstracting away the gnarlier details.

For instance, to fetch a resource from your API

```ts
import { findRecord } from '@ember-data/json-api/request';

const options = findRecord('ember-developer', '1', { include: ['pets', 'friends'] });

/*
  => {
    url: 'https://api.example.com/v1/ember-developers/1?include=friends,pets',
    method: 'GET',
    headers: <Headers>,
      // => 'Accept': 'application/vnd.api+json'
      // => 'Content-Type': 'application/vnd.api+json'
    op: 'findRecord';
    records: [{ type: 'ember-developer', id: '1' }]
  }
*/
```

Request builder output may be used with either `requestManager.request` or `store.request`.

URLs are stable. The same query will produce the same URL every time, even if the order of keys in
the query or values in an array changes.

URLs follow the most common JSON:API format (dasherized pluralized resource types).

### Available Builders

- [createRecord]()
- [deleteRecord]()
- [findRecord]()
- [query]()
- [updateRecord]()
