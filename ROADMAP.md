# EmberData Roadmap

This is a living document that should be regularly updated with each 
release and as plans evolve. The specific releases are "soft targets".
It represents the general direction, order of operations and an optimistic
timeline for when various work and efforts will be completed.

Main themes are covered in "Editions" while more tactical themes are 
covered within releases.

Editions and Releases are detailed in reverse chronological order, 
with more recent/upcoming work closer to the top of their respective 
section.

> **Note** <br>
> Most work within this roadmap requires going through the RFC process.
> Just because the work is mentioned here does not mean it has been 
> RFC'd and had a proposal accepted. As such, any API sketches shown 
> are also preliminary. This is because often we know the parts of
> what we need in a broader scope long before we dive into the 
> specifics.

- [Editions](#-editions)
  - [Polaris](#-polaris)
- [Releases](#-releases)
  - [5.x Series](#-5x-series)

--------------

## 💜 Editions

Each Edition encompasses a set of main themes that together we feel presents a distinct holistic
picture for how to think about and utilize EmberData.

### 🔸 Polaris

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

### 🌠 Beyond Polaris

A few of the ideas cooking up our sleeve, in no particular order. We may start working on these even before Polaris edition ships, but don't consider these part of the Polaris experience.

1) Use WeakRef to track actively used data

WeakRef's would give us a few potential avenues for nice DX and Performance tuning. Knowing which UI Objects aren't in use could potentially allow us to reduce memory usage, skip some calculations, or even offload data from the cache (either entirely or into persisted storage). It would also allow us to automatically background refresh active data when a user returns to a tab after time away.

2) An HTTP Mock server and Mocking Utilities

Comprehensive DX around data management should extend to testing. We're thinking of adding a lightweight HTTP mock that understands your data schemas. The benefits here could be enormous.

Currently, frontend mocking solutions typically rely on either mocking in the browser's ui-thread, or via ServiceWorker. Both of these present major downsides.

The ui-thread approach slows down test suite performance with high alloc, compute and gc costs. It's also much more difficult to debug due to circumventing the browser's built in tooling for inspecting requests, and less accurate because responses don't behave the same way or with the same timing as they would for a real request. The mix of generating similar looking API mocks and client side data in the same test or test module causes many devs to accidentally mix paradigms, and the difficulty in disocvering what you've mocked and what its state is regularly leads to over-mocking. Finally, it allows devs to often accidentally share object state in their test between the ui and the api which leads to difficult to reason about bugs.

The MSW approach solves many of the problems of the ui-thread approach, but introduces problems of its own. Developers must now carefully uninstall the service worker when changing between apps they are developing that usually run on the same domain, it intercepts even for dev when it ought to be used only for tests, it interferes with using the ServiceWorker for actual application needs, and it lacks privileged access to the file system to cache state for reuse to optimize performance of repeat test runs.

Given that applications already tell EmberData a great deal about their application's data schemas, we think we can leverage that to provide the best-available DX for mocking data for tests.

3) An EdgeRouter and SSD (Server Side Data) Tooling

The EdgeRouter would be a client side router implementation aware of EmberData paradigms. Similar in feel to Ember's router but heavily constrained in what APIs it is allowed to utilize and intended to execute route model hooks in parallel by default. This setup would allow us to hoist the fetch tree out of the application at build time, potentially compile it to WebAssembly (or better all the way to an executable), and run an optimized fetch-tree on the edge.

This would enable applications to pre-fetch the data for routes more optimally, including for the initial request. In this scenario the cache state for an initial page load would begin streaming into the page simultaneously with the initial response body, allowing the application to perform a single optimized render with little-to-no-work to be done at the routing level vs cascading through the request waterfall and associated data handling.

4) PersistedCache

A wrapper for any Cache implementation that automatically syncs its state to IndexedDB in the background. Useful for being able to replay requests when reloading a page or opening a new tab, deduping requests across tabs, and providing minimal but powerful offline support.

5) DataWorker

A SharedWorker that integrates with PersistedCache and utilizes RequestManager in the worker to offload work from the main thread and dedupe/replay requests across tabs and windows.

--------------

## 💜 Releases

### 🔸 5.x Series

Features:

- SchemaModel
- Schema DSL
- JSON:API, REST, ActiveRecord | Request Builders
- JSON:API, REST, ActiveRecord | Serialization Utils
- JSON:API | Cache Forking
- JSON:API | Operations Support
- REST, ActiveRecord | Cache
- Graph
- DataWorker
- PersistedCache

Deprecations:

- deprecate EmberObject APIs on Store
- deprecate Adapter/Serializer/Model
- deprecate store finder methods (findRecord/findAll/query/saveRecord etc.)

Stretch Goals:

- Experimental TypeScript Support
- DataWorker: Background WebWorker+IndexedDB solution for syncing Cache and Requests cross-tabs 

### 🔸 5.4 (Upcoming ~ Late October)

- Forking support for JSON:API Cache
- Schema DSL
- SchemaModel

### 🔸 5.3 - 08/18/2023

- Refactor @ember-data/model setup/teardown hooks logic to be importable

See the [5.3 Release Checklist](https://github.com/emberjs/data/issues/8743) for the full list of work included in this release.

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

### 🔸 5.2 - 08/17/2023

Due to documentation for request builders and patch utilities for serialization not
being completed we opted to push those efforts delivery to 5.3.
