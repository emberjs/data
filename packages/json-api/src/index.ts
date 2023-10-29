export { default } from './-private/cache';

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

This package provides an in-memory [JSON:API](https://jsonapi.org/) document and resource [*Ember***Data** Cache](https://github.com/emberjs/data/blob/main/ember-data-types/cache/cache.ts) implementation.

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/json-api
```

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


  @module @ember-data/json-api
  @main @ember-data/json-api
*/
