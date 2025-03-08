<p align="center">
  <img
    class="project-logo"
    src="./logos/ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData Adapter"
    width="240px"
    title="EmberData Adapter"
    />
  <img
    class="project-logo"
    src="./logos/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData Adapter"
    width="240px"
    title="EmberData Adapter"
    />
</p>

<p align="center">Provides REST and JSON:API Implementations of the legacy <a href="https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Adapter">Adapter Interface</a></p>

> **Caution** ⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
> If starting a new app or thinking of implementing a new adapter, consider writing a [Handler](https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Handler)
> instead to be used with the [RequestManager](https://github.com/emberjs/data/tree/main/packages/request#readme)

## Installation

This package is currently installed when installing `ember-data`.

If installing `@ember-data/` packages individually install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/adapter
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/adapter/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40ember-data/adapter/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40ember-data/adapter/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40ember-data/adapter/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40ember-data/adapter/lts-4-12?label=%40lts-4-12&color=bbbbbb)


## 🚀 Setup

If using `ember-data` no additional setup is necesssary.

> **Note**
> When using [ember-data](https://github.com/emberjs/data/blob/main/packages/-ember-data) the below
> configuration is handled for you automatically.

To use legacy adapters you will need to have installed and configured the LegacyNetworkHandler from [@ember-data/legacy-compat](https://github.com/emberjs/data/blob/main/packages/-ember-data)

```no-highlight
pnpm add @ember-data/legacy-compat
```

```ts
import Store, { CacheHandler } from '@ember-data/store';
import RequestManager from '@ember-data/request';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';

export default class extends Store {
  requestManager = new RequestManager()
    .use([LegacyNetworkHandler])
    .useCache(CacheHandler);
}
```


## Usage

To use as either a per-type or application adapter, export one of the
implementations within the `adapters/` directory of your app as appropriate.

For instance, to configure an application adapter to use `JSON:API`


*app/adapters/application.ts*
```ts
export { default } from '@ember-data/adapter/json-api';
```

By default adapters are resolved by looking for an adapter with the same name in the adapters folder as the `type` given to `store.adapterFor(<type>)`, falling back to looking for an adapter named `application`.

**Overriding Resolution**

If you would like to avoid using resolver semantics and your application has only one or a few adapters, you may ovveride the `adapterFor` hook on the store.

```ts
import Store from '@ember-data/store';
import Adapter from '@ember-data/adapter/json-api';

class extends Store {
  #adapter = new Adapter();

  adapterFor() {
    return this.#adapter;
  }
}
```


For the full list of APIs available read the code documentation for [@ember-data/adapter](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fadapter). You may also be interested in learning more about *Ember***Data**'s [Adapter Interface](https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Adapter).
