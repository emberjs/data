---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11292/api/@warp-drive/legacy/model/types/AsyncHasMany.md
---

&#x20;

# &#x20;AsyncHasMany\<T>

```ts
interface AsyncHasMany<T> {
  [LegacyPromiseProxy]: true;
  content: LegacyManyArray<T> | null;
  isDestroyed: boolean;
  isFulfilled: boolean;
  isPending: boolean;
  isRejected: boolean;
  isSettled: boolean;
  promise: 
  | Promise<LegacyManyArray<T>>
  | null;
  get length(): number;
  get links(): 
  | Links
  | null
  | undefined;
  get meta(): 
  | Record<string, unknown>
  | null
  | undefined;
  catch(cb: ((reason: any) => unknown) | null | undefined): Promise<unknown>;
  destroy(): void;
  finally(cb: (() => void) | null | undefined): Promise<unknown>;
  reload(options: Omit<BaseFinderOptions, "">): this;
  then(success: ((value: LegacyManyArray) => unknown) | null | undefined, rejected?: ((reason: any) => unknown) | null): Promise<unknown>;
}
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:16](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L16)

This class is returned as the result of accessing an async hasMany relationship
on an instance of a Model extending from `@warp-drive/legacy/model`.

A PromiseManyArray is an iterable proxy that allows templates to consume related
ManyArrays and update once their contents are no longer pending.

In your JS code you should resolve the promise first.

```js
const comments = await post.comments;
```

## Type Parameters

### T

`T`

## Methods

### catch()

```ts
catch(cb: ((reason: any) => unknown) | null | undefined): Promise<unknown>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:160](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L160)

catch errors thrown by this promise

#### Parameters

##### cb

((`reason`: `any`) => `unknown`) | `null` | `undefined`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

***

### destroy()

```ts
destroy(): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:181](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L181)

Tears down this proxy, releasing its [content](#content) and
[promise](#promise) and marking it as [destroyed](#isdestroyed).

#### Returns

`void`

***

### finally()

```ts
finally(cb: (() => void) | null | undefined): Promise<unknown>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:169](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L169)

run cleanup after this promise completes

#### Parameters

##### cb

(() => `void`) | `null` | `undefined`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

***

### reload()

```ts
reload(options: Omit<BaseFinderOptions, "">): this;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:111](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L111)

Reload the relationship

#### Parameters

##### options

[`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)<`BaseFinderOptions`, `""`>

#### Returns

`this`

***

### then()

```ts
then(success: ((value: LegacyManyArray) => unknown) | null | undefined, rejected?: ((reason: any) => unknown) | null): Promise<unknown>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:149](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L149)

chain this promise

#### Parameters

##### success

((`value`: `LegacyManyArray`) => `unknown`) | `null` | `undefined`

##### rejected?

((`reason`: `any`) => `unknown`) | `null`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`unknown`>

## Properties

### \[LegacyPromiseProxy]

```ts
[LegacyPromiseProxy]: true;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:21](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L21)

A property signifying that this object implements the classic Ember
`PromiseProxyMixin`-like API. See LegacyPromiseProxy.

***

### content

```ts
content: LegacyManyArray<T> | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:53](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L53)

The resolved `ManyArray` for the relationship, if the promise has
resolved, else `null`.

***

### isDestroyed

```ts
isDestroyed: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:48](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L48)

Whether [destroy](#destroy) has been called.

***

### isFulfilled

```ts
isFulfilled: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:136](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L136)

Whether the loading promise succeeded

***

### isPending

```ts
isPending: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:124](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L124)

Whether the loading promise is still pending

***

### isRejected

```ts
isRejected: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:130](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L130)

Whether the loading promise rejected

***

### isSettled

```ts
isSettled: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:142](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L142)

Whether the loading promise completed (resolved or rejected)

***

### promise

```ts
promise: 
  | Promise<LegacyManyArray<T>>
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:44](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L44)

The promise for the relationship's content, or `null` once
[destroy](#destroy) has been called.

### length

#### Get Signature

```ts
get length(): number;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:66](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L66)

Retrieve the length of the content

##### Returns

`number`

***

### links

#### Get Signature

```ts
get links(): 
  | Links
  | null
  | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:194](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L194)

Retrieve the links for this relationship

##### Returns

| [`Links`](../../../core/types/spec/json-api-raw/types/Links.md)
| `null`
| `undefined`

***

### meta

#### Get Signature

```ts
get meta(): 
  | Record<string, unknown>
  | null
  | undefined;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:203](https://github.com/warp-drive-data/warp-drive/blob/5127bc5b162f2ebe5d9578e3204f3e955b63c5f8/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L203)

Retrieve the meta for this relationship

##### Returns

| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>
| `null`
| `undefined`
