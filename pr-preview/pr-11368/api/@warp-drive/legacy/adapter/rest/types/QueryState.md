---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11368/api/@warp-drive/legacy/adapter/rest/types/QueryState.md
description: >-
  Query params the legacy `RESTAdapter.buildQuery` adds to `findRecord` and
  `findAll` URLs, such as the `include` paths to sideload.
---

&#x20;

# &#x20;QueryState

```ts
type QueryState = {
  include?: unknown;
  since?: unknown;
};
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:58](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/adapter/rest.ts#L58)

The query params built by [buildQuery](../classes/RESTAdapter.md#buildquery) for a
`findAll`/`findRecord` request.

## Properties

### include?

```ts
optional include?: unknown;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:62](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/adapter/rest.ts#L62)

the relationship paths to sideload

***

### since?

```ts
optional since?: unknown;
```

Defined in: [warp-drive-packages/legacy/src/adapter/rest.ts:66](https://github.com/warp-drive-data/warp-drive/blob/b163ed38b9eb9b586190fba22402b85d19241ec8/warp-drive-packages/legacy/src/adapter/rest.ts#L66)

a value used to request only records updated since the given value
