<p align="center">
  <img
    class="project-logo"
    src="./ember-data-logo.png"
    alt="EmberData"
    width="240px"
    title="EmberData"
    />
</p>

Wrangle your application's data management with scalable patterns for developer productivity.

- ⚡️  Committed to Best-In-Class Performance
- 🌲 Focused on being as svelte as possible
- 🚀 SSR Ready
- 🐹 Built with ♥️ by Ember

```
npm install --save @ember-data/store
```

## About

This package provides *Ember***Data**'s `Store` class.

*Ember***Data** is a lightweight reactive data library for JavaScript applications that provides composable primitives for ordering query/mutation/peek flows, managing network and cache, and reducing data for presentation.
  
The `Store` in *Ember***Data** coordinates interaction between your application, the `Cache`, and sources of data (such as your `API` or a local persistence layer).

## 🪜 Architecture

*Ember***Data** is neither *resource* centric nor *document* centric in it's approach to caching, requesting and presenting data. Instead your application's configuration drives which is important and when.

When using a `Store` you configure what cache to use, how cache data should be presented to the UI, and where it should look for requested data when it is not available in the cache.

This coordination is handled opaquely to the nature
of the requests issued and the format of the data being handled. This approach gives applications broad flexibility to configure *Ember***Data** to best suite their needs. This makes *Ember***Data** a powerful solution for applications regardless of their size and complexity.

*Ember***Data** is designed to scale, with a religious focus on performance and asset-size to keep its footprint small but speedy while still being able to handle large complex APIs in huge data-driven applications with no additional code and no added application complexity. It's goal is to prevent applications from writing code to manage data that is difficult to maintain or reason about.

*Ember***Data**'s power comes not from specific features, data formats, or adherence to specific API specs such as `JSON:API` `trpc` or `GraphQL`, but from solid conventions around requesting and mutating data developed over decades of experience scaling developer productivity.

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```
pnpm add @ember-data/store
```

## 🛠 Creating A Store

To use a `Store` we will need to do few things: add a `Cache` to store data **in-memory**, add an `Adapter` to fetch data from a source, and implement `instantiateRecord` to tell the store how to display the data for individual resources. 

> **Note** If you are using the package `ember-data` then a `JSON:API` cache and `instantiateRecord` are configured for you by default.

### Configuring A Cache

To start, let's install a `JSON:API` cache. If your app uses `GraphQL` or `REST` other caches may better fit your data. You can author your own cache by creating one that conforms to the [spec]().

The package `@ember-data/record-data` provides a `JSON:API` cache we can use. After installing it, we can configure the store to use this cache.

```js
import Store from '@ember-data/store';
import Cache from '@ember-data/record-data';

class extends Store {
  #cache = null;

  createRecordDataFor(identifier, storeWrapper) {
    this.#cache = this.#cache || new Cache(storeWrapper);
    this.#cache.createCache(identifier);
    return this.#cache;
  }
}
```

Now that we have a `cache` let's setup something to handle fetching and saving data via our API.

### Adding An Adapter

To start, let's install a `JSON:API` adapter. If your app uses `GraphQL` or `REST` other adapters may better fit your data. You can author your own adapter by creating one that conforms to the [spec]().

The package `@ember-data/adapter` provides a `JSON:API` adapter we can use. After installing it, we can configure the store to use this adapter.

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

#### Using with Ember

Note: If you are using Ember and would like to make use of `service` injections in your adapter, you will want to additionally `setOwner` for the Adapter.

```js
import Store from '@ember-data/store';
import Adapter from '@ember-data/adapter/json-api';
import { getOwner, setOwner } from '@ember/application';

class extends Store {
  #adapter = null;

  adapterFor() {
    let adapter = thsi.#adapter;
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

By default when using with Ember you only need to implement this hook if you want your adapter usage to be statically analyzeable. *Ember***Data** will attempt to resolve adapters using Ember's resolver.
