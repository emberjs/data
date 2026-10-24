---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11215/api/@warp-drive/legacy/model-fragments/classes/FragmentArray.md
description: >-
  Legacy `ModelFragments`-compatible array API, such as `addFragment`,
  `removeFragment`, and `rollbackAttributes`, for reactive arrays migrated off
  fragments.
---

&#x20;

# &#x20;FragmentArray\<T *extends* [`Fragment`](Fragment.md)>

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:17](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L17)

The features added to an array resource by [FragmentArrayExtension](../variables/FragmentArrayExtension.md), providing
a subset of the legacy `ModelFragments` fragment-array API for migrated resources.

## Type Parameters

### T

`T` *extends* [`Fragment`](Fragment.md)

## Constructors

### Constructor

```ts
new FragmentArray<T extends Fragment>(): FragmentArray<T>;
```

#### Returns

`FragmentArray`<`T`>

## Methods

### addFragment()

```ts
addFragment(fragment?: T): Fragment[] | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:49](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L49)

Adds an existing fragment to this array, if one was given.

#### Parameters

##### fragment?

`T`

#### Returns

[`Fragment`](Fragment.md)\[] | `undefined`

***

### createFragment()

```ts
createFragment(fragment?: T): Fragment | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:60](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L60)

Appends a new fragment to the end of this array, if one was given.

#### Parameters

##### fragment?

`T`

#### Returns

[`Fragment`](Fragment.md) | `undefined`

***

### removeFragment()

```ts
removeFragment(fragment?: T): void;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:71](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L71)

Removes the given fragment from this array, if present.

#### Parameters

##### fragment?

`T`

#### Returns

`void`

***

### rollbackAttributes()

```ts
rollbackAttributes(): void;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:86](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L86)

Reverts each member fragment's attribute back to its last known remote value.

#### Returns

`void`

## Properties

### isDestroyed

```ts
isDestroyed: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:26](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L26)

Whether this fragment array has been destroyed.

***

### isDestroying

```ts
isDestroying: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:22](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L22)

Whether this fragment array is in the process of being destroyed.

### hasDirtyAttributes

#### Get Signature

```ts
get hasDirtyAttributes(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:32](https://github.com/warp-drive-data/warp-drive/blob/b2f9730e03048c8b1233b4af3382b707898c8f15/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L32)

Whether this fragment array (or any of its members) has uncommitted changes.

##### Returns

`boolean`
