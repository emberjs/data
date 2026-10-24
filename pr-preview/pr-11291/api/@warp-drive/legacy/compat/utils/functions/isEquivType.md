---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/legacy/compat/utils/functions/isEquivType.md
description: >-
  Legacy migration helper that reports whether two resource types match after
  normalization, so `'posts'` and `'post'` are equivalent.
---

&#x20;

# &#x20;isEquivType()

```ts
function isEquivType(expected: string, actual: string): boolean;
```

Defined in: [warp-drive-packages/legacy/src/compat/utils.ts:226](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/compat/utils.ts#L226)

Compares two types for strict equality, converting them to
the format expected by the WarpDrive Cache to ensure
differences in format are accounted for in the comparison.

Asserts when expected or actual are invalid types in dev.
Expected may never be null.

```js
isEquivType('posts', 'post'); // true
isEquivType('post', 'post'); // true
isEquivType('posts', 'posts'); // true
isEquivType('post-comment', 'postComment'); // true
isEquivType('post-comment', 'PostComment'); // true
isEquivType('post-comment', 'post_comment'); // true
isEquivType('post-comment', 'post-comment'); // true
isEquivType('post-comment', 'post'); // false
isEquivType('posts', null); // false
```

## Parameters

### expected

`string`

a potentially unnormalized type to match against

### actual

`string`

a potentially unnormalized type to match against

## Returns

`boolean`

true if the types are equivalent
