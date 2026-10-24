---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11362/api/@warp-drive/legacy/model-fragments/classes/Fragment.md
description: >-
  Legacy `ModelFragments`-compatible object API, such as `hasDirtyAttributes`,
  `isFragment`, and `rollbackAttributes`, for reactive objects migrated off
  fragments.
---

&#x20;

# &#x20;Fragment

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:17](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L17)

The features added to an object resource by [FragmentExtension](../variables/FragmentExtension.md), providing
a subset of the legacy `ModelFragments` fragment API for migrated resources.

## Constructors

### Constructor

```ts
new Fragment(): Fragment;
```

#### Returns

`Fragment`

## Methods

### rollbackAttributes()

```ts
rollbackAttributes(this: PrivateReactiveResource): void;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:62](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L62)

Reverts this fragment's attribute back to its last known remote value.

#### Parameters

##### this

`PrivateReactiveResource`

#### Returns

`void`

## Properties

### isDestroyed

```ts
isDestroyed: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:26](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L26)

Whether this fragment has been destroyed.

***

### isDestroying

```ts
isDestroying: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:22](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L22)

Whether this fragment is in the process of being destroyed.

### $type

#### Get Signature

```ts
get $type(): string | null | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:54](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L54)

The resource type of this fragment, if known.

##### Returns

`string` | `null` | `undefined`

***

### hasDirtyAttributes

#### Get Signature

```ts
get hasDirtyAttributes(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:32](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L32)

Whether this fragment (or the attribute it is rooted at) has uncommitted changes.

##### Returns

`boolean`

***

### isFragment

#### Get Signature

```ts
get isFragment(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:47](https://github.com/warp-drive-data/warp-drive/blob/4794fa6528accdad94e122d46a62c0e7e26ac612/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L47)

Always `true`. Used to distinguish fragments from other resources.

##### Returns

`boolean`
