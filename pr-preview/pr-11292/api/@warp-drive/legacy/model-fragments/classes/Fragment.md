---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/model-fragments/classes/Fragment.md
---

&#x20;

# &#x20;Fragment

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:14](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L14)

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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:59](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L59)

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

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:23](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L23)

Whether this fragment has been destroyed.

***

### isDestroying

```ts
isDestroying: boolean = false;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:19](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L19)

Whether this fragment is in the process of being destroyed.

### $type

#### Get Signature

```ts
get $type(): string | null | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:51](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L51)

The resource type of this fragment, if known.

##### Returns

`string` | `null` | `undefined`

***

### hasDirtyAttributes

#### Get Signature

```ts
get hasDirtyAttributes(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:29](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L29)

Whether this fragment (or the attribute it is rooted at) has uncommitted changes.

##### Returns

`boolean`

***

### isFragment

#### Get Signature

```ts
get isFragment(): boolean;
```

Defined in: [warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts:44](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model-fragments/extensions/fragment.ts#L44)

Always `true`. Used to distinguish fragments from other resources.

##### Returns

`boolean`
