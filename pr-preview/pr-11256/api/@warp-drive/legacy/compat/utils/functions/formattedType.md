---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/api/@warp-drive/legacy/compat/utils/functions/formattedType.md
description: >-
  Legacy migration helper that normalizes a resource type to the singular
  dasherized form the cache expects, such as `'PostComments'` to
  `'post-comment'`.
---

&#x20;

# &#x20;formattedType()

```ts
function formattedType<T extends string>(type: string | T): T;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:115](https://github.com/warp-drive-data/warp-drive/blob/41678da1c5bd74d59e0480c935451b5e027be0fb/warp-drive-packages/legacy/src/compat/utils.ts#L115)

Converts a potentially unnormalized type into the format expected
by our WarpDrive Cache. Currently this is singular-dasherized.

you should not rely on this function to give you an exact format
for display purposes. Formatting for display should be handled
differently if the exact format matters.

Asserts invalid types (undefined, null, '') in dev.

**Usage**

```js
import formattedType from 'soxhub-client/helpers/formatted-type';

formattedType('post'); // => 'post'
formattedType('posts'); // => 'post'
formattedType('Posts'); // => 'post'
formattedType('post-comment'); // => 'post-comment'
formattedType('post-comments'); // => 'post-comment'
formattedType('post_comment'); // => 'post-comment'
formattedType('postComment'); // => 'post-comment'
formattedType('PostComment'); // => 'post-comment'
```

## Type Parameters

### T

`T` *extends* `string`

## Parameters

### type

`string` | `T`

the potentially un-normalized type

## Returns

`T`

the normalized type
