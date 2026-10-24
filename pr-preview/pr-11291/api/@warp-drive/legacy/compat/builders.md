---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/legacy/compat/builders.md
description: >-
  Deprecated request builders that move `findRecord`, `query`, and `saveRecord`
  calls to `store.request` while still using adapters and serializers.
---

&#x20;&#x20;

Builders for migrating from `store` methods to `store.request`.

These builders enable you to migrate your codebase to using the correct syntax for `store.request` while temporarily preserving legacy behaviors.
This is useful for quickly upgrading an entire app to a unified syntax while a longer incremental migration is made to shift off of adapters and serializers.
To that end, these builders are deprecated and will be removed in a future version of Ember Data.

## Deprecated

## Functions

* [~~findAll~~](functions/findAll.md)
* [~~findRecord~~](functions/findRecord.md)
* [~~query~~](functions/query.md)
* [~~queryRecord~~](functions/queryRecord.md)
* [~~saveRecord~~](functions/saveRecord.md)
