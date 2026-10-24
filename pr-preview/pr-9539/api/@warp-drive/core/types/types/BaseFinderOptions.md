---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/api/@warp-drive/core/types/types/BaseFinderOptions.md
description: >-
  Legacy reload, background-reload, include, and adapterOptions settings shared
  by `store.findRecord` and `store.findAll`.
---

# &#x20;BaseFinderOptions

```ts
interface BaseFinderOptions {
  adapterOptions?: Record<string, unknown>;
  backgroundReload?: boolean;
  include?: string | string[];
  reload?: boolean;
}
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:11](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L11)

Options shared by [FindRecordOptions](FindRecordOptions.md) and [FindAllOptions](FindAllOptions.md)
for controlling reload behavior and adapter/serializer specific
configuration when using the legacy Adapter/Serializer network layer.

## Extended by

* [`FindRecordOptions`](FindRecordOptions.md)

## Properties

### adapterOptions?

```ts
optional adapterOptions?: Record<string, unknown>;
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:40](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L40)

Arbitrary options made available to the adapter via the request's
snapshot (`snapshot.adapterOptions`). The store does not interpret
this value itself.

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

***

### include?

```ts
optional include?: string | string[];
```

Defined in: [warp-drive-packages/core/src/store/-types/q/store.ts:33](https://github.com/warp-drive-data/warp-drive/blob/5170dc70aa623ae44619aaae720347349150ad1a/warp-drive-packages/core/src/store/-types/q/store.ts#L33)

The names of relationships to load along with this request, used to
build the `include` query parameter for adapters (such as the
JSON:API adapter) that support it.

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
