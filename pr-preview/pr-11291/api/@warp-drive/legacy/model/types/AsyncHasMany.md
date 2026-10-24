---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/api/@warp-drive/legacy/model/types/AsyncHasMany.md
description: >-
  Legacy promise-like, iterable proxy returned by an async `hasMany` on a
  `Model`, which templates can consume while the related records load.
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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:16](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L16)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:162](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L162)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:183](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L183)

Tears down this proxy, releasing its [content](#content) and
[promise](#promise) and marking it as [destroyed](#isdestroyed).

#### Returns

`void`

***

### finally()

```ts
finally(cb: (() => void) | null | undefined): Promise<unknown>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:171](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L171)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:113](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L113)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:151](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L151)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:21](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L21)

A property signifying that this object implements the classic Ember
`PromiseProxyMixin`-like API. See LegacyPromiseProxy.

***

### content

```ts
content: LegacyManyArray<T> | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:55](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L55)

The resolved `ManyArray` for the relationship, if the promise has
resolved, else `null`.

***

### isDestroyed

```ts
isDestroyed: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:50](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L50)

Whether [destroy](#destroy) has been called.

***

### isFulfilled

```ts
isFulfilled: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:138](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L138)

Whether the loading promise succeeded

***

### isPending

```ts
isPending: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:126](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L126)

Whether the loading promise is still pending

***

### isRejected

```ts
isRejected: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:132](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L132)

Whether the loading promise rejected

***

### isSettled

```ts
isSettled: boolean;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:144](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L144)

Whether the loading promise completed (resolved or rejected)

***

### promise

```ts
promise: 
  | Promise<LegacyManyArray<T>>
  | null;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:46](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L46)

The promise for the relationship's content, or `null` once
[destroy](#destroy) has been called.

### length

#### Get Signature

```ts
get length(): number;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:68](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L68)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:196](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L196)

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

Defined in: [warp-drive-packages/legacy/src/model/-private/promise-many-array.ts:205](https://github.com/warp-drive-data/warp-drive/blob/2608593c22d42ae32c48edf0ca862b93a8dbc9e1/warp-drive-packages/legacy/src/model/-private/promise-many-array.ts#L205)

Retrieve the meta for this relationship

##### Returns

| [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>
| `null`
| `undefined`
