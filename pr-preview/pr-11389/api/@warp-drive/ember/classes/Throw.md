---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11389/api/@warp-drive/ember/classes/Throw.md
description: >-
  Component that throws its `@error` argument when rendered, for templates that
  should fail if they reach that point.
---

# &#x20;Throw\<T>

Defined in: [warp-drive-packages/ember/src/-private/await.gts:30](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/ember/src/-private/await.gts#L30)

The `<Throw />` component is used to throw an error in a template.

That's all it does. So don't use it unless the application should
throw an error if it reaches this point in the template.

```gts
<Throw @error={{anError}} />
```

## Extends

* `default`<`ThrowSignature`<`T`>>

## Type Parameters

### T

`T`

## Constructors

### Constructor

```ts
new Throw<T>(owner: Owner, args: {
  error: T;
}): Throw<T>;
```

Defined in: [warp-drive-packages/ember/src/-private/await.gts:31](https://github.com/warp-drive-data/warp-drive/blob/80c0358b68e59bf240519e2eda8ddab711f3c5fd/warp-drive-packages/ember/src/-private/await.gts#L31)

#### Parameters

##### owner

`Owner`

##### args

###### error

`T`

#### Returns

`Throw`<`T`>

#### Overrides

```ts
Component<ThrowSignature<T>>.constructor
```
