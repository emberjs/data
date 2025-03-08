 <p align="center">
  <img
    class="project-logo"
    src="./logos/ember-data-logo-dark.svg#gh-dark-mode-only"
    alt="EmberData RequestUtils"
    width="240px"
    title="EmberData RequestUtils"
    />
  <img
    class="project-logo"
    src="./logos/ember-data-logo-light.svg#gh-light-mode-only"
    alt="EmberData RequestUtils"
    width="240px"
    title="EmberData RequestUtils"
    />
</p>

<p align="center">Utilities for Requests</p>

This package provides Simple utility function to assist in url building, query params, and other common request operations.

It's built for [*Ember***Data**](https://github.com/emberjs/data/) but useful more broadly if you're looking for lightweight functions to assist in working with urls and query params.

## Installation

Install using your javascript package manager of choice. For instance with [pnpm](https://pnpm.io/)

```no-highlight
pnpm add @ember-data/request-utils
```

**Tagged Releases**

- ![NPM Canary Version](https://img.shields.io/npm/v/%40ember-data/request-utils/canary?label=%40canary&color=FFBF00)
- ![NPM Beta Version](https://img.shields.io/npm/v/%40ember-data/request-utils/beta?label=%40beta&color=ff00ff)
- ![NPM Stable Version](https://img.shields.io/npm/v/%40ember-data/request-utils/latest?label=%40latest&color=90EE90)
- ![NPM LTS Version](https://img.shields.io/npm/v/%40ember-data/request-utils/lts?label=%40lts&color=0096FF)
- ![NPM LTS 4.12 Version](https://img.shields.io/npm/v/%40ember-data/request-utils/lts-4-12?label=%40lts-4-12&color=bbbbbb)


## Utils

- [buildBaseUrl]()
- [sortQueryParams]()
- [buildQueryParams]()
- [filterEmpty]()

### As a Library Primitive

These primitives may be used directly or composed by request builders to provide a consistent interface for building requests.

For instance:

```ts
import { buildBaseURL, buildQueryParams } from '@ember-data/request-utils';

const baseURL = buildBaseURL({
  host: 'https://api.example.com',
  namespace: 'api/v1',
  resourcePath: 'emberDevelopers',
  op: 'query',
  identifier: { type: 'ember-developer' }
});
const url = `${baseURL}?${buildQueryParams({ name: 'Chris', include:['pets'] })}`;
// => 'https://api.example.com/api/v1/emberDevelopers?include=pets&name=Chris'
```

This is useful, but not as useful as the REST request builder for query which is sugar over this (and more!):

```ts
import { query } from '@ember-data/rest/request';

const options = query('ember-developer', { name: 'Chris', include:['pets'] });
// => { url: 'https://api.example.com/api/v1/emberDevelopers?include=pets&name=Chris' }
// Note: options will also include other request options like headers, method, etc.
```
