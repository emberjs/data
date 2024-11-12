<p align="center">
  <img
    class="project-logo"
    src="./ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData Serializer"
    width="240px"
    title="EmberData Serializer"
    />
  <img
    class="project-logo"
    src="./ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData Serializer"
    width="240px"
    title="EmberData Serializer"
    />
</p>

<p align="center">Provides JSON, REST and JSON:API Implementations of the legacy <a href="https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Serializer">Serializer Interface</a></p>

> **Caution** ⚠️ **This is LEGACY documentation** for a feature that is no longer encouraged to be used.
> If starting a new app or thinking of implementing a new serializer, consider writing a [Handler](https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Handler)
> instead to be used with the [RequestManager](https://github.com/emberjs/data/tree/main/packages/request#readme)

## Installation

This package is currently installed when installing `ember-data`.

If installing `@ember-data/` packages individually install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/serializer
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/serializer/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40ember-data/serializer/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40ember-data/serializer/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40ember-data/serializer/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40ember-data/serializer/lts-4-12?label=%40lts-4-12&color=bbbbbb)


## 🚀 Setup

If using `ember-data` no additional setup is necesssary.

> **Note**
> When using [ember-data](https://github.com/emberjs/data/blob/main/packages/-ember-data) the below
> configuration is handled for you automatically.

To use legacy serializers you will need to have installed and configured the LegacyNetworkHandler from [@ember-data/legacy-compat](https://github.com/emberjs/data/blob/main/packages/-ember-data)

```no-highlight
pnpm add @ember-data/legacy-compat
```

```ts
import Store, { CacheHandler } from '@ember-data/store';
import RequestManager from '@ember-data/request';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';

export default class extends Store {
  requestManager = new RequestManager();

  constructor(args) {
    super(args);
    this.requestManager.use([LegacyNetworkHandler]);
    this.requestManager.useCache(CacheHandler);
  }
}
```


## Usage

To use as either a per-type or application serializer, export one of the
implementations within the `serializers/` directory of your app as appropriate.

For instance, to configure an application serializer to use `JSON:API`


*app/serializers/application.ts*
```ts
export { default } from '@ember-data/serializer/json-api';
```

By default serializers are resolved by looking for a serializer with the same name in the `serializers/` folder as the `type` given to `store.serializerFor(<type>)`, falling back to looking for a serializer named `application`.

**Overriding Resolution**

If you would like to avoid using resolver semantics and your application has only one or a few serializers, you may ovveride the `serializerFor` hook on the store.

```ts
import Store from '@ember-data/store';
import Serializer from '@ember-data/serializer/json-api';

class extends Store {
  #serializer = new Serializer();

  serializerFor() {
    return this.#serializer;
  }
}
```


For the full list of APIs available read the code documentation for [@ember-data/serializer](https://api.emberjs.com/ember-data/release/modules/@ember-data%2Fserializer). You may also be interested in learning more about *Ember***Data**'s [Serializer Interface](https://api.emberjs.com/ember-data/release/classes/%3CInterface%3E%20Serializer).
