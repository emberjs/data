---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/legacy/compat/utils/functions/expectId.md
description: >-
  Legacy migration helper that normalizes a resource id to a string like
  `formattedId`, but asserts that it is not `null`.
---

&#x20;

# &#x20;expectId()

```ts
function expectId(id: string | number): string;
function expectId(id: null): never;
```

## Call Signature

```ts
function expectId(id: string | number): string;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:186](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/compat/utils.ts#L186)

Like [formattedId](formattedId.md), but asserts that `id` is not `null` rather
than allowing and passing through `null`.

### Parameters

#### id

`string` | `number`

### Returns

`string`

## Call Signature

```ts
function expectId(id: null): never;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:192](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/compat/utils.ts#L192)

Throws, since `id` is `null`.

### Parameters

#### id

`null`

### Returns

`never`
