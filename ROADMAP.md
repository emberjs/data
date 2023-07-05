# EmberData Roadmap

This is a living document that should be regularly updated with each 
release and as plans evolve.
It represents the general direction and an optimistic timeline for 
when various work and efforts will be completed.

Main themes are covered in "Editions" while more tactical themes are 
covered within releases.

Editions and Releases are detailed in reverse chronological order, 
with more recent/upcoming work closer to the top of their respective 
section.

> **Note** <br>
> Most work within this timeline requires going through the RFC process.
> Just because the work is mentioned here does not mean it has been 
> RFC'd and had a proposal accepted. As such, any API sketches shown 
> are also preliminary. This is because often we know the parts of
> what we need in a broader scope long before we dive into the 
> specifics.

- [Editions](#editions)
  - [Polaris](#polaris)
- [Releases](#releases)
  - [5.x Series](#5x-series)

## Editions

Each Edition encompasses a set of main themes that together we feel presents a distinct holistic
picture for how to think about and utilize EmberData.

### Polaris

Polaris is an upcomming edition of Ember and related projects (embroider, EmberData, EmberCLI).

Our primary goal for Polaris is to evolve EmberData to being flexible and powerful enough to be the best-in-class data management solution for every Ember application.

We loosely define this to mean three things.

1) That any request an application makes might be best implemented via EmberData.
2) That the shared interfaces for requesting, mutating and interacting with data that EmberData provides
    enable applications to easily maintain, iterate on, and migrate between data best practices within
    their organization.
3) That any API format specification could be utilized directly by a matching cache implementation,
    consumable by SchemaModel, and elegantly supported via a Handler and Request Builders.

Our stretch goal (and ultimate north star) is to achieve this for all frontend JavaScript applications, not just Ember applications.

To help achieve this we're targetting the following goals:

- **EmberData independent of ember-source**
  - Removal of remaining support for Ember Classic 
    > some bare minimum support may remain until Ember similarly deprecates support
  - Decoupling of EmberData from Ember the framework
  - Removal of all promise proxies
- **Tighter API/Cache format alignment**
  - `npx ember-data` setup workflow for configuring this
- **Model-optional default story for presenting data**
  - Replacement of @ember-data/model with a DSL for authoring Schemas
  - SchemaModel which consumes them
- **Context-preserving cacheable network requests**
  - Replacement of Adapter/Serializer with RequestManager
  - Replacement of buildURL mixin and example Adapters with request-utils
- **Improved change tracking and transactional saves**
- **An overhaul of guides and documentation**


Our stretch goals for Polaris are:

- Robust TypeScript Support
- EmberData independent of ember-cli/embroider
- Something to support REST/ActiveRecord out-of-the box a bit better (either a Cache implementation or normalization utils)

## Releases

### 5.x Series

Features:

- SchemaModel
- Schema DSL
- Request Builders
- JSON:API Serialization Utils
- Cache Forking
- JSON:API Operations Support

Deprecations:

- deprecate EmberObject APIs on Store
- deprecate Adapter/Serializer/Model
- deprecate store finder methods (findRecord/findAll/query/saveRecord etc.)

Stretch Goals:

- Experimental TypeScript Support
- DataWorker: Background WebWorker+IndexedDB solution for syncing Cache and Requests cross-tabs 

### 5.2 (Upcoming)

- **Request Builders**

Request builders abstract url-building to ensure friendly, familiar, refactorable, maintainable ergonomics
for issuing requests from anywhere in the codebase using modern request-manager/fetch paradigms.

```ts
import { findRecord } from '@ember-data/json-api/request';

// ...

await store.request(findRecord('user', '1'));
```

- **JSON:API Serialization Utils**

Utility functions that serialize various formats into the desired format from the Cache.

```ts
import { serializeResources, serializePatch } from '@ember-data/json-api/request';

const resourceDocument = serializeResources(cache, identifier);
const collectionDocument = serializeResources(cache, [identifier]);
const resourcePatchDocument = serializePatch(cache, identifier, { include: [] });
```
