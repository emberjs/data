/**
 *

This package provides an in-memory [JSON:API](https://jsonapi.org/) document and resource {@link Cache} implementation.

## 🚀 Setup

```ts
import { Store } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

export default class AppStore extends Store {
  createCache(wrapper) {
    return new JSONAPICache(wrapper);
  }
}
```


## Advanced Usage

Usually you will directly interact with the cache only if implementing a ReactiveResource. Below we
give an example of a read-only record (mutations never written back to the cache). More typically cache
interactions are something that the `Store` coordinates as part of the `request/response` lifecycle.

```ts
import { Store, recordIdentifierFor } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { TrackedObject } from 'tracked-built-ins';

export class AppStore extends Store {
  createCache(wrapper) {
    return new JSONAPICache(wrapper);
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

  For the full list of APIs see the docs for {@link Cache}

  @module
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Cache } from '@warp-drive/core/types/cache';

export { JSONAPICache } from './-private/cache';
