---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11218/api/@warp-drive/core/types/request/types/ImmutableHeaders.md
description: >-
  Read-only `Headers` that handlers see on a request, adding `toJSON` to
  serialize them as `[key, value]` pairs and an optional mutable `clone`.
---

# &#x20;ImmutableHeaders

```ts
interface ImmutableHeaders extends Headers {
  [iterator](): HeadersIterator<[string, string]>;
  append(name: string, value: string): void;
  clone?(): Headers;
  delete(name: string): void;
  entries(): HeadersIterator<[string, string]>;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
  get(name: string): string | null;
  getSetCookie(): string[];
  has(name: string): boolean;
  keys(): HeadersIterator<string>;
  set(name: string, value: string): void;
  toJSON(): [string, string][];
  values(): HeadersIterator<string>;
}
```

Defined in: [warp-drive-packages/core/src/types/request.ts:650](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L650)

A read-only [Headers](https://developer.mozilla.org/docs/Web/API/Headers) instance, as passed to [Handlers](../../../request/types/Handler.md)
via [ImmutableRequestInfo.headers](FindRecordRequestOptions.md#headers).

## Extends

* [`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)

## Methods

### \[iterator]\()

```ts
iterator: HeadersIterator<[string, string]>;
```

#### Returns

`HeadersIterator`<\[`string`, `string`]>

#### Inherited from

```ts
Headers.[iterator]
```

***

### append()

```ts
append(name: string, value: string): void;
```

The **`append()`** method of the Headers interface appends a new value onto an existing header inside a Headers object, or adds the header if it does not already exist.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append)

#### Parameters

##### name

`string`

##### value

`string`

#### Returns

`void`

#### Inherited from

```ts
Headers.append
```

***

### clone()?

```ts
optional clone(): Headers;
```

Defined in: [warp-drive-packages/core/src/types/request.ts:654](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L654)

Returns a mutable clone of these headers, if supported by the implementation.

#### Returns

[`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)

***

### delete()

```ts
delete(name: string): void;
```

The **`delete()`** method of the Headers interface deletes a header from the current Headers object.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete)

#### Parameters

##### name

`string`

#### Returns

`void`

#### Inherited from

```ts
Headers.delete
```

***

### entries()

```ts
entries(): HeadersIterator<[string, string]>;
```

Returns an iterator allowing to go through all key/value pairs contained in this object.

#### Returns

`HeadersIterator`<\[`string`, `string`]>

#### Inherited from

```ts
Headers.entries
```

***

### forEach()

```ts
forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void;
```

#### Parameters

##### callbackfn

(`value`: `string`, `key`: `string`, `parent`: [`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)) => `void`

##### thisArg?

`any`

#### Returns

`void`

#### Inherited from

```ts
Headers.forEach
```

***

### get()

```ts
get(name: string): string | null;
```

The **`get()`** method of the Headers interface returns a byte string of all the values of a header within a Headers object with a given name. If the requested header doesn't exist in the Headers object, it returns null.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get)

#### Parameters

##### name

`string`

#### Returns

`string` | `null`

#### Inherited from

```ts
Headers.get
```

***

### getSetCookie()

```ts
getSetCookie(): string[];
```

The **`getSetCookie()`** method of the Headers interface returns an array containing the values of all Set-Cookie headers associated with a response. This allows Headers objects to handle having multiple Set-Cookie headers, which wasn't possible prior to its implementation.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie)

#### Returns

`string`\[]

#### Inherited from

```ts
Headers.getSetCookie
```

***

### has()

```ts
has(name: string): boolean;
```

The **`has()`** method of the Headers interface returns a boolean stating whether a Headers object contains a certain header.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has)

#### Parameters

##### name

`string`

#### Returns

`boolean`

#### Inherited from

```ts
Headers.has
```

***

### keys()

```ts
keys(): HeadersIterator<string>;
```

Returns an iterator allowing to go through all keys of the key/value pairs contained in this object.

#### Returns

`HeadersIterator`<`string`>

#### Inherited from

```ts
Headers.keys
```

***

### set()

```ts
set(name: string, value: string): void;
```

The **`set()`** method of the Headers interface sets a new value for an existing header inside a Headers object, or adds the header if it does not already exist.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set)

#### Parameters

##### name

`string`

##### value

`string`

#### Returns

`void`

#### Inherited from

```ts
Headers.set
```

***

### toJSON()

```ts
toJSON(): [string, string][];
```

Defined in: [warp-drive-packages/core/src/types/request.ts:658](https://github.com/warp-drive-data/warp-drive/blob/7c54022c37f0d6f67ced3f69ea911b218d6eccea/warp-drive-packages/core/src/types/request.ts#L658)

Returns the headers as an array of `[key, value]` pairs.

#### Returns

\[`string`, `string`]\[]

***

### values()

```ts
values(): HeadersIterator<string>;
```

Returns an iterator allowing to go through all values of the key/value pairs contained in this object.

#### Returns

`HeadersIterator`<`string`>

#### Inherited from

```ts
Headers.values
```
