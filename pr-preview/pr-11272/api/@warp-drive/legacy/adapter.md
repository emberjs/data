---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/adapter.md
---

&#x20;

## Overview

:::danger
⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
If starting a new app or thinking of implementing a new adapter, consider writing a
Handler instead to be used with the [RequestManager](../../core/classes/RequestManager.md)
::::

In order to properly fetch and update data, @warp-drive/legacy
needs to understand how to connect to your API.

`Adapters` accept various kinds of requests from the store
and manage fulfillment of the request from your API.

### Request Flow

When the store decides it needs to issue a request it uses the following flow to manage the request and process the data.

* find the appropriate adapter
* issue the request to the adapter
* await the adapter's response
  * if an error occurs reject with the error
  * if no error
    * if there is response data
    * pass the response data to the appropriate serializer
    * update the cache using the JSON:API formatted data from the serializer's response
  * return the primary record(s) associated with the request

### Request Errors

When a request errors and your adapter does not have the ability to recover from the error,
you may either reject the promise returned by your adapter method with the error or simply
throw the error.

If the request was for a `createRecord` `updateRecord` or `deleteRecord` special rules
apply to how this error will affect the state of the store and additional properties on
the `Error` class may be used. See the documentation for these methods in
[MinimumAdapterInterface](../compat/types/MinimumAdapterInterface.md) for more information.

### Implementing an Adapter

There are seven required adapter methods, one for each of
the primary request types that @warp-drive/legacy issues.

They are:

* findRecord
* findAll
* queryRecord
* query
* createRecord
* updateRecord
* deleteRecord

Each of these request types has a matching store method that triggers it
and matching `requestType` that is passed to the serializer's
`normalizeResponse` method.

If your app only reads data but never writes data, it is not necessary
to implement the methods for create, update, and delete. This extends to
all of the store's find methods with the exception of `findRecord` (`findAll`,
`query`, `queryRecord`): if you do not use the store method in your app then
your Adapter does not need the method.

```ts
async function fetchData(url, options = {}) {
  let response = await fetch(url, options);
  return response.toJSON();
}

export default class ApplicationAdapter {
  findRecord(_, { modelName }, id) {
    return fetchData(`./${modelName}s/${id}`);
  }

  static create() {
    return new this();
  }
}
```

### Adapter Resolution

`store.adapterFor(name)` will lookup adapters defined in `app/adapters/` and
return an instance.

`adapterFor` first attempts to find an adapter with an exact match on `name`,
then falls back to checking for the presence of an adapter named `application`.

If no adapter is found, an error will be thrown.

```ts
store.adapterFor('author');

// lookup paths (in order) =>
//   app/adapters/author.js
//   app/adapters/application.js
```

Most requests in @warp-drive/legacy are made with respect to a particular `type` (or `modelName`)
(e.g., "get me the full collection of **books**" or "get me the **employee** whose id is 37"). We
refer to this as the **primary** resource `type`.

`adapterFor` is used by the store to find an adapter with a name matching that of the primary
resource `type` for the request, which then falls back to the `application` adapter.

It is recommended that applications define only a single `application` adapter and serializer
where possible, only implementing an adapter specific to the `type` when absolutely necessary.

If you need to support multiple API versions for the same type, the per-type strategy for
defining adapters might not be adequate.

If you have multiple APIs or multiple API versions and the single application adapter and per-type
strategy does not suite your needs, one strategy is to write an `application` adapter and serializer
that make use of `options` to specify the desired format when making a request, then forwards to the
request to the desired adapter or serializer as needed.

```js [app/adapters/application.js]
export default class Adapter extends EmberObject {
  findRecord(store, schema, id, snapshot) {
    let { apiVersion } = snapshot.adapterOptions;
    return this.adapterFor(`-api-${apiVersion}`).findRecord(store, schema, id, snapshot);
  }
}
```

### Overriding `Store.adapterFor`

```js
import Store from '@ember-data/store';
import Adapter from '@ember-data/adapter/json-api';

class extends Store {
  #adapter = new Adapter();

  adapterFor() {
    return this.#adapter;
  }
}
```

Note: If you are using Ember and would like to make use of `service` injections in your adapter, you will want to additionally `setOwner` for the Adapter.

```js
import Store from '@ember-data/store';
import Adapter from '@ember-data/adapter/json-api';
import { getOwner, setOwner } from '@ember/owner';

class extends Store {
  #adapter = null;

  adapterFor() {
    let adapter = this.#adapter;
    if (!adapter) {
      const owner = getOwner(this);
      adapter = new Adapter();
      setOwner(adapter, owner);
      this.#adapter = adapter;
    }

    return adapter;
  }
}
```

By default when using with Ember you only need to implement this hook if you want your adapter usage to be statically analyzeable. *Ember***Data** will attempt to resolve adapters using Ember's resolver. To provide a single Adapter for your application like the above you would provide it as the default export of the file `app/adapters/application.{js/ts}`

### Using an Adapter

Any adapter in `app/adapters/` can be looked up by `name` using `store.adapterFor(name)`.

### Default Adapters

Applications whose API's structure endpoint URLs *very close to* or *exactly* the **REST**
or **JSON:API** convention, the `@ember-data/adapter` package contains implementations
these applications can extend.

Many applications will find writing their own adapter to be allow greater flexibility,
customization, and maintenance than attempting to override methods in these adapters.

## Classes

* [Adapter](classes/Adapter.md)

## Variables

* [BuildURLMixin](variables/BuildURLMixin.md)

## Types

* [BuildURLMixin](types/BuildURLMixin.md)
