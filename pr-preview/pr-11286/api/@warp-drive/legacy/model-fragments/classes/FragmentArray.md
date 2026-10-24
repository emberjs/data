---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/api/@warp-drive/legacy/model-fragments/classes/FragmentArray.md
---

&#x20;

# &#x20;FragmentArray\<T *extends* [`Fragment`](Fragment.md)>

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:14](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L14)

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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:46](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L46)

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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:57](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L57)

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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:68](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L68)

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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:83](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L83)

Reverts each member fragment's attribute back to its last known remote value.

#### Returns

`void`

## Properties

### isDestroyed

```ts
isDestroyed: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:23](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L23)

Whether this fragment array has been destroyed.

***

### isDestroying

```ts
isDestroying: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:19](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L19)

Whether this fragment array is in the process of being destroyed.

### hasDirtyAttributes

#### Get Signature

```ts
get hasDirtyAttributes(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts:29](https://github.com/warp-drive-data/warp-drive/blob/56f116bd9ccb98c1d2ab5dc91e63218f59fb7d65/warp-drive-packages/legacy/src/model-fragments/extensions/fragment-array.ts#L29)

Whether this fragment array (or any of its members) has uncommitted changes.

##### Returns

`boolean`
