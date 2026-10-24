---
url: https://canary.warp-drive.io/api/@warp-drive/legacy/compat.md
description: >-
  Legacy store support for adapters and serializers: the `LegacyNetworkHandler`
  plus store methods such as `adapterFor`, `serializerFor`, `normalize` and
  `pushPayload`.
---

&#x20;

Helps an app migrate incrementally from legacy EmberData patterns to modern ***Warp*Drive**.

## Why it exists

While migrating, you may need to:

* keep Adapters and Serializers working on a Store whose requests go through the
  [RequestManager](../../core/classes/RequestManager.md)
* keep the deprecated request methods such as `store.findRecord` and `store.query`, which
  Adapters fulfill, working while you move calls to `store.request`
* adopt modern patterns one piece at a time rather than all at once

## What it provides

* [LegacyNetworkHandler](variables/LegacyNetworkHandler.md), a request handler that fulfills those legacy requests through
  the store's Adapters and Serializers and passes every other request along
* [adapterFor](functions/adapterFor.md), [serializerFor](functions/serializerFor.md), [normalize](functions/normalize.md), [pushPayload](functions/pushPayload.md) and
  [serializeRecord](functions/serializeRecord.md), the store methods for working with Adapters and Serializers, and
  [LegacyStoreCompat](types/LegacyStoreCompat.md), the Store type that includes them

The Store that [useLegacyStore](/api/@warp-drive/legacy/functions/useLegacyStore) produces
adds `LegacyNetworkHandler` to its RequestManager unless `linksMode` is `true`. The hooks
that present `Model` instances live in [@warp-drive/legacy/model](/api/@warp-drive/legacy/model/),
not here.

## When to use it

Only during a migration from legacy EmberData to modern ***Warp*Drive**. It lets you adopt
modern patterns incrementally while your existing Adapters and Serializers keep working. For
incremental migration strategies, see the [Migration Guide](/upgrading/v5/) and the
[Two Store Migration Strategy](/upgrading/v5/two-store-migration).

## Variables

* [LegacyNetworkHandler](variables/LegacyNetworkHandler.md)

## Functions

* [adapterFor](functions/adapterFor.md)
* [cleanup](functions/cleanup.md)
* [normalize](functions/normalize.md)
* [pushPayload](functions/pushPayload.md)
* [serializeRecord](functions/serializeRecord.md)
* [serializerFor](functions/serializerFor.md)

## Types

* [LegacyStoreCompat](types/LegacyStoreCompat.md)
* [MinimumAdapterInterface](types/MinimumAdapterInterface.md)
* [MinimumSerializerInterface](types/MinimumSerializerInterface.md)
* [AdapterPayload](types/AdapterPayload.md)
* [~~CompatStore~~](types/CompatStore.md)
* [SerializerOptions](types/SerializerOptions.md)
