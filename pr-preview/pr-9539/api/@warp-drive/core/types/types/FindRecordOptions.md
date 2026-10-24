---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/types/FindRecordOptions.md
description: >-
  Legacy options for `store.findRecord`, adding a discouraged `preload` of field
  values to the shared reload and adapter settings.
---

# &#x20;FindRecordOptions

```ts
interface FindRecordOptions extends BaseFinderOptions {
  adapterOptions?: Record<string, unknown>;
  backgroundReload?: boolean;
  include?: string | string[];
  preload?: Record<string, Value>;
  reload?: boolean;
}
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:48](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L48)

Options for `store.findRecord()`.

## Extends

* [`BaseFinderOptions`](BaseFinderOptions.md)

## Properties

### adapterOptions?

```ts
optional adapterOptions?: Record<string, unknown>;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:40](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L40)

Arbitrary options made available to the adapter via the request's
snapshot (`snapshot.adapterOptions`). The store does not interpret
this value itself.

#### Inherited from

[`BaseFinderOptions`](BaseFinderOptions.md).[`adapterOptions`](BaseFinderOptions.md#adapteroptions)

***

### backgroundReload?

```ts
optional backgroundReload?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:26](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L26)

If `true` or `false`, forces or prevents a background reload of the
cached resource(s) after resolving with the cached data. If omitted,
the adapter's `shouldBackgroundReloadRecord`/`shouldBackgroundReloadAll`
hook decides whether to reload in the background.

#### Inherited from

[`BaseFinderOptions`](BaseFinderOptions.md).[`backgroundReload`](BaseFinderOptions.md#backgroundreload)

***

### include?

```ts
optional include?: string | string[];
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:33](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L33)

The names of relationships to load along with this request, used to
build the `include` query parameter for adapters (such as the
JSON:API adapter) that support it.

#### Inherited from

[`BaseFinderOptions`](BaseFinderOptions.md).[`include`](BaseFinderOptions.md#include)

***

### preload?

```ts
optional preload?: Record<string, Value>;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:64](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L64)

Data to preload into the store before the request is made.
This feature is *highly* discouraged and has no corresponding
feature when using builders and handlers.

Excepting relationships: the data should be in the form of a
JSON object where the keys are fields on the record and the value
is the raw value to be added to the cache.

Relationships can either be provided as string IDs from which
an identifier will be built base upon the relationship's expected
resource type, or be record instances from which the identifier
will be extracted.

***

### reload?

```ts
optional reload?: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:18](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L18)

If `true`, forces the request to go to the adapter even if a cached
copy of the requested resource(s) already exists in the store. If
omitted, the adapter's `shouldReloadRecord`/`shouldReloadAll` hook
decides whether to reload.

#### Inherited from

[`BaseFinderOptions`](BaseFinderOptions.md).[`reload`](BaseFinderOptions.md#reload)
