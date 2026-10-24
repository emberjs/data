---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/core/reactive/types/LegacyQueryArray.md
---

# &#x20;LegacyQueryArray\<T = `unknown`>

```ts
interface LegacyQueryArray<T = unknown> extends LegacyLiveArray<T> {
  [key: number]: T;
  readonly [unscopables]: { [key: number]: boolean | undefined; [iterator]?: boolean; readonly [unscopables]?: boolean; at?: boolean; concat?: boolean; copyWithin?: boolean; entries?: boolean; every?: boolean; fill?: boolean; filter?: boolean; find?: boolean; findIndex?: boolean; findLast?: boolean; findLastIndex?: boolean; flat?: boolean; flatMap?: boolean; forEach?: boolean; includes?: boolean; indexOf?: boolean; join?: boolean; keys?: boolean; lastIndexOf?: boolean; length?: boolean; map?: boolean; pop?: boolean; push?: boolean; reduce?: boolean; reduceRight?: boolean; reverse?: boolean; shift?: boolean; slice?: boolean; some?: boolean; sort?: boolean; splice?: boolean; toLocaleString?: boolean; toReversed?: boolean; toSorted?: boolean; toSpliced?: boolean; toString?: boolean; unshift?: boolean; values?: boolean; with?: boolean };
  isLoaded: boolean;
  isUpdating: boolean;
  length: number;
  links: 
  | Links
  | PaginationLinks
  | null;
  meta: ObjectValue | null;
  modelName: TypeFromInstanceOrString<T>;
  query: 
  | Record<string, unknown>
  | ImmutableRequestInfo
  | null;
  [iterator](): ArrayIterator<T>;
  at(index: number): T | undefined;
  concat(...items: ConcatArray<T>[]): T[];
  concat(...items: (T | ConcatArray<T>)[]): T[];
  copyWithin(target: number, start: number, end?: number): this;
  entries(): ArrayIterator<[number, T]>;
  every<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
  every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  fill(value: T, start?: number, end?: number): this;
  filter<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
  find<S>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
  findLast<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S | undefined;
  findLast(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T | undefined;
  findLastIndex(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): number;
  flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[];
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[], thisArg?: This): U[];
  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
  includes(searchElement: T, fromIndex?: number): boolean;
  indexOf(searchElement: T, fromIndex?: number): number;
  join(separator?: string): string;
  keys(): ArrayIterator<number>;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
  pop(): T | undefined;
  push(...items: T[]): number;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reverse(): T[];
  save(this: LegacyArray<T>): Promise<LegacyArray<T>>;
  shift(): T | undefined;
  slice(start?: number, end?: number): T[];
  some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  sort(compareFn?: (a: T, b: T) => number): this;
  splice(start: number, deleteCount?: number): T[];
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  toLocaleString(): string;
  toLocaleString(locales: string | string[], options?: NumberFormatOptions & DateTimeFormatOptions): string;
  toReversed(): T[];
  toSorted(compareFn?: (a: T, b: T) => number): T[];
  toSpliced(start: number, deleteCount: number, ...items: T[]): T[];
  toSpliced(start: number, deleteCount?: number): T[];
  toString(): string;
  unshift(...items: T[]): number;
  update(this: LegacyArray<T>): Promise<LegacyArray<T>>;
  values(): ArrayIterator<T>;
  with(index: number, value: T): T[];
}
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts:84](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts#L84)

**`Legacy`**

QueryArrays contain the primary records returned when querying
for records by `ResourceType`.

### Basic Example

For instance, if an application were to have a `'user'` type:

```ts
const users = await store.query('user', { name: 'Chris' });
```

***

### QueryArrays are Arrays

QueryArrays have all array APIs, and will report `true`
for both `queryArray instanceof Array` and `Array.isArray(queryArray)`

However, any mutation of the array will throw an error.

***

### Reactive

If a record in a QueryArray is deleted and unloaded, it will be
automatically removed from the array.

***

### Immutable

Records cannot be directly added to or removed from a QueryArray.

***

### Polymorphism

QueryArrays are not intended to be polymorphic. If your application has
an abstract type "car" with concrete types "ferrari" and "bmw", a query
which returns primary data containing both ferraris and bmws will *likely*
work, but it is not guaranteed.

In contrast, the [ReactiveResourceArray](ReactiveResourceArray.md) returned when using [Store.request](../../classes/Store.md#request)
is guaranteed to work with polymorphic responses.

***

### Memory Leaks

QueryArrays are meant to be long lived. They can be refreshed using
`array.update()`, and destroyed via `array.destroy()`.

Unlike most Reactive state in WarpDrive, applications must choose to call
`destroy` when the `QueryArray` is no longer needed, else the array instance
will be retained until either the application or the store which created it
are destroyed. Destroying a QueryArray does not remove its records
from the cache, but it does remove the array as well as the overhead it requires
from the store for book-keeping.

we recommend againt using QueryArrays. Use [Store.request](../../classes/Store.md#request) instead

## Extends

* [`LegacyLiveArray`](LegacyLiveArray.md)<`T`>

## Type Parameters

### T

`T` = `unknown`

## Indexable

```ts
[key: number]: T
```

## Methods

### \[iterator]\()

```ts
iterator: ArrayIterator<T>;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:76](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.iterable.d.ts#L76)

Iterator

#### Returns

`ArrayIterator`<`T`>

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`[iterator]`](LegacyLiveArray.md#iterator)

***

### at()

```ts
at(index: number): T | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2022.array.d.ts:22](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2022.array.d.ts#L22)

Returns the item located at the specified index.

#### Parameters

##### index

`number`

The zero-based index of the desired code unit. A negative index will count back from the last item.

#### Returns

`T` | `undefined`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`at`](LegacyLiveArray.md#at)

***

### concat()

```ts
concat(...items: ConcatArray<T>[]): T[];
concat(...items: (T | ConcatArray<T>)[]): T[];
```

#### Call Signature

```ts
concat(...items: ConcatArray<T>[]): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1351](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1351)

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

##### Parameters

###### items

...`ConcatArray`<`T`>\[]

Additional arrays and/or items to add to the end of the array.

##### Returns

`T`\[]

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`concat`](LegacyLiveArray.md#concat)

#### Call Signature

```ts
concat(...items: (T | ConcatArray<T>)[]): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1357](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1357)

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

##### Parameters

###### items

...(`T` | `ConcatArray`<`T`>)\[]

Additional arrays and/or items to add to the end of the array.

##### Returns

`T`\[]

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`concat`](LegacyLiveArray.md#concat)

***

### copyWithin()

```ts
copyWithin(
   target: number, 
   start: number, 
   end?: number
): this;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:60](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts#L60)

Returns the this object after copying a section of the array identified by start and end
to the same array starting at position target

#### Parameters

##### target

`number`

If target is negative, it is treated as length+target where length is the
length of the array.

##### start

`number`

If start is negative, it is treated as length+start. If end is negative, it
is treated as length+end.

##### end?

`number`

If not specified, length of the this object is used as its default value.

#### Returns

`this`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`copyWithin`](LegacyLiveArray.md#copywithin)

***

### entries()

```ts
entries(): ArrayIterator<[number, T]>;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:81](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.iterable.d.ts#L81)

Returns an iterable of key, value pairs for every entry in the array

#### Returns

`ArrayIterator`<\[`number`, `T`]>

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`entries`](LegacyLiveArray.md#entries)

***

### every()

```ts
every<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
```

#### Call Signature

```ts
every<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1438](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1438)

Determines whether all the members of an array satisfy the specified test.

##### Type Parameters

###### S

`S`

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `value is S`

A function that accepts up to three arguments. The every method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value false, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

##### Returns

`this is S[]`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`every`](LegacyLiveArray.md#every)

#### Call Signature

```ts
every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1447](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1447)

Determines whether all the members of an array satisfy the specified test.

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `unknown`

A function that accepts up to three arguments. The every method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value false, or until the end of the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

##### Returns

`boolean`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`every`](LegacyLiveArray.md#every)

***

### fill()

```ts
fill(
   value: T, 
   start?: number, 
   end?: number
): this;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:49](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts#L49)

Changes all array elements from `start` to `end` index to a static `value` and returns the modified array

#### Parameters

##### value

`T`

value to fill array section with

##### start?

`number`

index to start filling the array at. If start is negative, it is treated as
length+start where length is the length of the array.

##### end?

`number`

index to stop filling the array at. If end is negative, it is treated as
length+end.

#### Returns

`this`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`fill`](LegacyLiveArray.md#fill)

***

### filter()

```ts
filter<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
```

#### Call Signature

```ts
filter<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1474](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1474)

Returns the elements of an array that meet the condition specified in a callback function.

##### Type Parameters

###### S

`S`

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `value is S`

A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.

##### Returns

`S`\[]

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`filter`](LegacyLiveArray.md#filter)

#### Call Signature

```ts
filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1480](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1480)

Returns the elements of an array that meet the condition specified in a callback function.

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `unknown`

A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array.

###### thisArg?

`any`

An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value.

##### Returns

`T`\[]

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`filter`](LegacyLiveArray.md#filter)

***

### find()

```ts
find<S>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
```

#### Call Signature

```ts
find<S>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:27](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts#L27)

Returns the value of the first element in the array where predicate is true, and undefined
otherwise.

##### Type Parameters

###### S

`S`

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `obj`: `T`\[]) => `value is S`

find calls predicate once for each element of the array, in ascending
order, until it finds one where predicate returns true. If such an element is found, find
immediately returns that element value. Otherwise, find returns undefined.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

##### Returns

`S` | `undefined`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`find`](LegacyLiveArray.md#find)

#### Call Signature

```ts
find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:28](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts#L28)

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `obj`: `T`\[]) => `unknown`

###### thisArg?

`any`

##### Returns

`T` | `undefined`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`find`](LegacyLiveArray.md#find)

***

### findIndex()

```ts
findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:39](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts#L39)

Returns the index of the first element in the array where predicate is true, and -1
otherwise.

#### Parameters

##### predicate

(`value`: `T`, `index`: `number`, `obj`: `T`\[]) => `unknown`

find calls predicate once for each element of the array, in ascending
order, until it finds one where predicate returns true. If such an element is found,
findIndex immediately returns that element index. Otherwise, findIndex returns -1.

##### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

#### Returns

`number`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`findIndex`](LegacyLiveArray.md#findindex)

***

### findLast()

```ts
findLast<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S | undefined;
findLast(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T | undefined;
```

#### Call Signature

```ts
findLast<S>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:27](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L27)

Returns the value of the last element in the array where predicate is true, and undefined
otherwise.

##### Type Parameters

###### S

`S`

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `value is S`

findLast calls predicate once for each element of the array, in descending
order, until it finds one where predicate returns true. If such an element is found, findLast
immediately returns that element value. Otherwise, findLast returns undefined.

###### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

##### Returns

`S` | `undefined`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`findLast`](LegacyLiveArray.md#findlast)

#### Call Signature

```ts
findLast(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:28](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L28)

##### Parameters

###### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `unknown`

###### thisArg?

`any`

##### Returns

`T` | `undefined`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`findLast`](LegacyLiveArray.md#findlast)

***

### findLastIndex()

```ts
findLastIndex(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:39](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L39)

Returns the index of the last element in the array where predicate is true, and -1
otherwise.

#### Parameters

##### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `unknown`

findLastIndex calls predicate once for each element of the array, in descending
order, until it finds one where predicate returns true. If such an element is found,
findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.

##### thisArg?

`any`

If provided, it will be used as the this value for each invocation of
predicate. If it is not provided, undefined is used instead.

#### Returns

`number`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`findLastIndex`](LegacyLiveArray.md#findlastindex)

***

### flat()

```ts
flat<A, D extends number = 1>(this: A, depth?: D): FlatArray<A, D>[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2019.array.d.ts:73](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2019.array.d.ts#L73)

Returns a new array with all sub-array elements concatenated into it recursively up to the
specified depth.

#### Type Parameters

##### A

`A`

##### D

`D` *extends* `number` = `1`

#### Parameters

##### this

`A`

##### depth?

`D`

The maximum recursion depth

#### Returns

`FlatArray`<`A`, `D`>\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`flat`](LegacyLiveArray.md#flat)

***

### flatMap()

```ts
flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | readonly U[], thisArg?: This): U[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2019.array.d.ts:62](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2019.array.d.ts#L62)

Calls a defined callback function on each element of an array. Then, flattens the result into
a new array.
This is identical to a map followed by flat with depth 1.

#### Type Parameters

##### U

`U`

##### This

`This` = `undefined`

#### Parameters

##### callback

(`this`: `This`, `value`: `T`, `index`: `number`, `array`: `T`\[]) => `U` | readonly `U`\[]

A function that accepts up to three arguments. The flatMap method calls the
callback function one time for each element in the array.

##### thisArg?

`This`

An object to which the this keyword can refer in the callback function. If
thisArg is omitted, undefined is used as the this value.

#### Returns

`U`\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`flatMap`](LegacyLiveArray.md#flatmap)

***

### forEach()

```ts
forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1462](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1462)

Performs the specified action for each element in an array.

#### Parameters

##### callbackfn

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `void`

A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array.

##### thisArg?

`any`

An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.

#### Returns

`void`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`forEach`](LegacyLiveArray.md#foreach)

***

### includes()

```ts
includes(searchElement: T, fromIndex?: number): boolean;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2016.array.include.d.ts:23](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2016.array.include.d.ts#L23)

Determines whether an array includes a certain element, returning true or false as appropriate.

#### Parameters

##### searchElement

`T`

The element to search for.

##### fromIndex?

`number`

The position in this array at which to begin searching for searchElement.

#### Returns

`boolean`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`includes`](LegacyLiveArray.md#includes)

***

### indexOf()

```ts
indexOf(searchElement: T, fromIndex?: number): number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1423](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1423)

Returns the index of the first occurrence of a value in an array, or -1 if it is not present.

#### Parameters

##### searchElement

`T`

The value to locate in the array.

##### fromIndex?

`number`

The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.

#### Returns

`number`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`indexOf`](LegacyLiveArray.md#indexof)

***

### join()

```ts
join(separator?: string): string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1362](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1362)

Adds all the elements of an array into a string, separated by the specified separator string.

#### Parameters

##### separator?

`string`

A string used to separate one element of the array from the next in the resulting string. If omitted, the array elements are separated with a comma.

#### Returns

`string`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`join`](LegacyLiveArray.md#join)

***

### keys()

```ts
keys(): ArrayIterator<number>;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:86](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.iterable.d.ts#L86)

Returns an iterable of keys in the array

#### Returns

`ArrayIterator`<`number`>

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`keys`](LegacyLiveArray.md#keys)

***

### lastIndexOf()

```ts
lastIndexOf(searchElement: T, fromIndex?: number): number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1429](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1429)

Returns the index of the last occurrence of a specified value in an array, or -1 if it is not present.

#### Parameters

##### searchElement

`T`

The value to locate in the array.

##### fromIndex?

`number`

The array index at which to begin searching backward. If fromIndex is omitted, the search starts at the last index in the array.

#### Returns

`number`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`lastIndexOf`](LegacyLiveArray.md#lastindexof)

***

### map()

```ts
map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1468](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1468)

Calls a defined callback function on each element of an array, and returns an array that contains the results.

#### Type Parameters

##### U

`U`

#### Parameters

##### callbackfn

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `U`

A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.

##### thisArg?

`any`

An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.

#### Returns

`U`\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`map`](LegacyLiveArray.md#map)

***

### pop()

```ts
pop(): T | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1340](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1340)

Removes the last element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

#### Returns

`T` | `undefined`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`pop`](LegacyLiveArray.md#pop)

***

### push()

```ts
push(...items: T[]): number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1345](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1345)

Appends new elements to the end of an array, and returns the new length of the array.

#### Parameters

##### items

...`T`\[]

New elements to add to the array.

#### Returns

`number`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`push`](LegacyLiveArray.md#push)

***

### reduce()

```ts
reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
```

#### Call Signature

```ts
reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1486](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1486)

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

##### Parameters

###### callbackfn

(`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: `T`\[]) => `T`

A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.

##### Returns

`T`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reduce`](LegacyLiveArray.md#reduce)

#### Call Signature

```ts
reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1487](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1487)

##### Parameters

###### callbackfn

(`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: `T`\[]) => `T`

###### initialValue

`T`

##### Returns

`T`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reduce`](LegacyLiveArray.md#reduce)

#### Call Signature

```ts
reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1493](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1493)

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

##### Type Parameters

###### U

`U`

##### Parameters

###### callbackfn

(`previousValue`: `U`, `currentValue`: `T`, `currentIndex`: `number`, `array`: `T`\[]) => `U`

A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.

###### initialValue

`U`

If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.

##### Returns

`U`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reduce`](LegacyLiveArray.md#reduce)

***

### reduceRight()

```ts
reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
```

#### Call Signature

```ts
reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1499](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1499)

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

##### Parameters

###### callbackfn

(`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: `T`\[]) => `T`

A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.

##### Returns

`T`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reduceRight`](LegacyLiveArray.md#reduceright)

#### Call Signature

```ts
reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1500](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1500)

##### Parameters

###### callbackfn

(`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: `T`\[]) => `T`

###### initialValue

`T`

##### Returns

`T`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reduceRight`](LegacyLiveArray.md#reduceright)

#### Call Signature

```ts
reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1506](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1506)

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

##### Type Parameters

###### U

`U`

##### Parameters

###### callbackfn

(`previousValue`: `U`, `currentValue`: `T`, `currentIndex`: `number`, `array`: `T`\[]) => `U`

A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.

###### initialValue

`U`

If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.

##### Returns

`U`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reduceRight`](LegacyLiveArray.md#reduceright)

***

### reverse()

```ts
reverse(): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1367](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1367)

Reverses the elements in an array in place.
This method mutates the array and returns a reference to the same array.

#### Returns

`T`\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`reverse`](LegacyLiveArray.md#reverse)

***

### save()

```ts
save(this: LegacyArray<T>): Promise<LegacyArray<T>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/-utils.ts:66](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/-utils.ts#L66)

Saves all of the records in the `RecordArray`.

Example

```js
let messages = store.peekAll('message');
messages.forEach(function(message) {
  message.hasBeenSeen = true;
});
messages.save();
```

#### Parameters

##### this

`LegacyArray`<`T`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`LegacyArray`<`T`>>

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`save`](LegacyLiveArray.md#save)

***

### shift()

```ts
shift(): T | undefined;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1372](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1372)

Removes the first element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

#### Returns

`T` | `undefined`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`shift`](LegacyLiveArray.md#shift)

***

### slice()

```ts
slice(start?: number, end?: number): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1382](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1382)

Returns a copy of a section of an array.
For both start and end, a negative index can be used to indicate an offset from the end of the array.
For example, -2 refers to the second to last element of the array.

#### Parameters

##### start?

`number`

The beginning index of the specified portion of the array.
If start is undefined, then the slice begins at index 0.

##### end?

`number`

The end index of the specified portion of the array. This is exclusive of the element at the index 'end'.
If end is undefined, then the slice extends to the end of the array.

#### Returns

`T`\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`slice`](LegacyLiveArray.md#slice)

***

### some()

```ts
some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1456](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1456)

Determines whether the specified callback function returns true for any element of an array.

#### Parameters

##### predicate

(`value`: `T`, `index`: `number`, `array`: `T`\[]) => `unknown`

A function that accepts up to three arguments. The some method calls
the predicate function for each element in the array until the predicate returns a value
which is coercible to the Boolean value true, or until the end of the array.

##### thisArg?

`any`

An object to which the this keyword can refer in the predicate function.
If thisArg is omitted, undefined is used as the this value.

#### Returns

`boolean`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`some`](LegacyLiveArray.md#some)

***

### sort()

```ts
sort(compareFn?: (a: T, b: T) => number): this;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1393](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1393)

Sorts an array in place.
This method mutates the array and returns a reference to the same array.

#### Parameters

##### compareFn?

(`a`: `T`, `b`: `T`) => `number`

Function used to determine the order of the elements. It is expected to return
a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code unit order.

```ts
[11,2,22,1].sort((a, b) => a - b)
```

#### Returns

`this`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`sort`](LegacyLiveArray.md#sort)

***

### splice()

```ts
splice(start: number, deleteCount?: number): T[];
splice(
   start: number, 
   deleteCount: number, 
   ...items: T[]
): T[];
```

#### Call Signature

```ts
splice(start: number, deleteCount?: number): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1402](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1402)

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

##### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount?

`number`

The number of elements to remove. Omitting this argument will remove all elements from the start
paramater location to end of the array. If value of this argument is either a negative number, zero, undefined, or a type
that cannot be converted to an integer, the function will evaluate the argument as zero and not remove any elements.

##### Returns

`T`\[]

An array containing the elements that were deleted.

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`splice`](LegacyLiveArray.md#splice)

#### Call Signature

```ts
splice(
   start: number, 
   deleteCount: number, 
   ...items: T[]
): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1412](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1412)

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

##### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount

`number`

The number of elements to remove. If value of this argument is either a negative number, zero,
undefined, or a type that cannot be converted to an integer, the function will evaluate the argument as zero and
not remove any elements.

###### items

...`T`\[]

Elements to insert into the array in place of the deleted elements.

##### Returns

`T`\[]

An array containing the elements that were deleted.

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`splice`](LegacyLiveArray.md#splice)

***

### toLocaleString()

```ts
toLocaleString(): string;
toLocaleString(locales: string | string[], options?: NumberFormatOptions & DateTimeFormatOptions): string;
```

#### Call Signature

```ts
toLocaleString(): string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1335](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1335)

Returns a string representation of an array. The elements are converted to string using their toLocaleString methods.

##### Returns

`string`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toLocaleString`](LegacyLiveArray.md#tolocalestring)

#### Call Signature

```ts
toLocaleString(locales: string | string[], options?: NumberFormatOptions & DateTimeFormatOptions): string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.core.d.ts:62](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.core.d.ts#L62)

##### Parameters

###### locales

`string` | `string`\[]

###### options?

`NumberFormatOptions` & `DateTimeFormatOptions`

##### Returns

`string`

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toLocaleString`](LegacyLiveArray.md#tolocalestring)

***

### toReversed()

```ts
toReversed(): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:44](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L44)

Returns a copy of an array with its elements reversed.

#### Returns

`T`\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toReversed`](LegacyLiveArray.md#toreversed)

***

### toSorted()

```ts
toSorted(compareFn?: (a: T, b: T) => number): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:55](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L55)

Returns a copy of an array with its elements sorted.

#### Parameters

##### compareFn?

(`a`: `T`, `b`: `T`) => `number`

Function used to determine the order of the elements. It is expected to return
a negative value if the first argument is less than the second argument, zero if they're equal, and a positive
value otherwise. If omitted, the elements are sorted in ascending, UTF-16 code unit order.

```ts
[11, 2, 22, 1].toSorted((a, b) => a - b) // [1, 2, 11, 22]
```

#### Returns

`T`\[]

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toSorted`](LegacyLiveArray.md#tosorted)

***

### toSpliced()

```ts
toSpliced(
   start: number, 
   deleteCount: number, 
   ...items: T[]
): T[];
toSpliced(start: number, deleteCount?: number): T[];
```

#### Call Signature

```ts
toSpliced(
   start: number, 
   deleteCount: number, 
   ...items: T[]
): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:64](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L64)

Copies an array and removes elements and, if necessary, inserts new elements in their place. Returns the copied array.

##### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount

`number`

The number of elements to remove.

###### items

...`T`\[]

Elements to insert into the copied array in place of the deleted elements.

##### Returns

`T`\[]

The copied array.

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toSpliced`](LegacyLiveArray.md#tospliced)

#### Call Signature

```ts
toSpliced(start: number, deleteCount?: number): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:72](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L72)

Copies an array and removes elements while returning the remaining elements.

##### Parameters

###### start

`number`

The zero-based location in the array from which to start removing elements.

###### deleteCount?

`number`

The number of elements to remove.

##### Returns

`T`\[]

A copy of the original array with the remaining elements.

##### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toSpliced`](LegacyLiveArray.md#tospliced)

***

### toString()

```ts
toString(): string;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1331](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1331)

Returns a string representation of an array.

#### Returns

`string`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`toString`](LegacyLiveArray.md#tostring)

***

### unshift()

```ts
unshift(...items: T[]): number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1417](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1417)

Inserts new elements at the start of an array, and returns the new length of the array.

#### Parameters

##### items

...`T`\[]

Elements to insert at the start of the array.

#### Returns

`number`

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`unshift`](LegacyLiveArray.md#unshift)

***

### update()

```ts
update(this: LegacyArray<T>): Promise<LegacyArray<T>>;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/-utils.ts:49](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/-utils.ts#L49)

Used to get the latest version of all of the records in this array
from the adapter.

Example

```javascript
let people = store.peekAll('person');
people.isUpdating; // false

people.update().then(function() {
  people.isUpdating; // false
});

people.isUpdating; // true
```

#### Parameters

##### this

`LegacyArray`<`T`>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<`LegacyArray`<`T`>>

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`update`](LegacyLiveArray.md#update)

***

### values()

```ts
values(): ArrayIterator<T>;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.iterable.d.ts:91](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.iterable.d.ts#L91)

Returns an iterable of values in the array

#### Returns

`ArrayIterator`<`T`>

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`values`](LegacyLiveArray.md#values)

***

### with()

```ts
with(index: number, value: T): T[];
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2023.array.d.ts:83](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2023.array.d.ts#L83)

Copies an array, then overwrites the value at the provided index with the
given value. If the index is negative, then it replaces from the end
of the array.

#### Parameters

##### index

`number`

The index of the value to overwrite. If the index is
negative, then it replaces from the end of the array.

##### value

`T`

The value to write into the copied array.

#### Returns

`T`\[]

The copied array with the updated value.

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`with`](LegacyLiveArray.md#with)

## Properties

### \[unscopables]

```ts
readonly [unscopables]: {
  [key: number]: boolean | undefined;
  [iterator]?: boolean;
  [unscopables]?: boolean;
  at?: boolean;
  concat?: boolean;
  copyWithin?: boolean;
  entries?: boolean;
  every?: boolean;
  fill?: boolean;
  filter?: boolean;
  find?: boolean;
  findIndex?: boolean;
  findLast?: boolean;
  findLastIndex?: boolean;
  flat?: boolean;
  flatMap?: boolean;
  forEach?: boolean;
  includes?: boolean;
  indexOf?: boolean;
  join?: boolean;
  keys?: boolean;
  lastIndexOf?: boolean;
  length?: boolean;
  map?: boolean;
  pop?: boolean;
  push?: boolean;
  reduce?: boolean;
  reduceRight?: boolean;
  reverse?: boolean;
  shift?: boolean;
  slice?: boolean;
  some?: boolean;
  sort?: boolean;
  splice?: boolean;
  toLocaleString?: boolean;
  toReversed?: boolean;
  toSorted?: boolean;
  toSpliced?: boolean;
  toString?: boolean;
  unshift?: boolean;
  values?: boolean;
  with?: boolean;
};
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts:95](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts#L95)

Is an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

#### Index Signature

```ts
[key: number]: boolean | undefined
```

#### \[iterator]?

```ts
optional [iterator]?: boolean;
```

#### \[unscopables]?

```ts
readonly optional [unscopables]?: boolean;
```

Is an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

#### at?

```ts
optional at?: boolean;
```

#### concat?

```ts
optional concat?: boolean;
```

#### copyWithin?

```ts
optional copyWithin?: boolean;
```

#### entries?

```ts
optional entries?: boolean;
```

#### every?

```ts
optional every?: boolean;
```

#### fill?

```ts
optional fill?: boolean;
```

#### filter?

```ts
optional filter?: boolean;
```

#### find?

```ts
optional find?: boolean;
```

#### findIndex?

```ts
optional findIndex?: boolean;
```

#### findLast?

```ts
optional findLast?: boolean;
```

#### findLastIndex?

```ts
optional findLastIndex?: boolean;
```

#### flat?

```ts
optional flat?: boolean;
```

#### flatMap?

```ts
optional flatMap?: boolean;
```

#### forEach?

```ts
optional forEach?: boolean;
```

#### includes?

```ts
optional includes?: boolean;
```

#### indexOf?

```ts
optional indexOf?: boolean;
```

#### join?

```ts
optional join?: boolean;
```

#### keys?

```ts
optional keys?: boolean;
```

#### lastIndexOf?

```ts
optional lastIndexOf?: boolean;
```

#### length?

```ts
optional length?: boolean;
```

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

#### map?

```ts
optional map?: boolean;
```

#### pop?

```ts
optional pop?: boolean;
```

#### push?

```ts
optional push?: boolean;
```

#### reduce?

```ts
optional reduce?: boolean;
```

#### reduceRight?

```ts
optional reduceRight?: boolean;
```

#### reverse?

```ts
optional reverse?: boolean;
```

#### shift?

```ts
optional shift?: boolean;
```

#### slice?

```ts
optional slice?: boolean;
```

#### some?

```ts
optional some?: boolean;
```

#### sort?

```ts
optional sort?: boolean;
```

#### splice?

```ts
optional splice?: boolean;
```

#### toLocaleString?

```ts
optional toLocaleString?: boolean;
```

#### toReversed?

```ts
optional toReversed?: boolean;
```

#### toSorted?

```ts
optional toSorted?: boolean;
```

#### toSpliced?

```ts
optional toSpliced?: boolean;
```

#### toString?

```ts
optional toString?: boolean;
```

#### unshift?

```ts
optional unshift?: boolean;
```

#### values?

```ts
optional values?: boolean;
```

#### with?

```ts
optional with?: boolean;
```

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`[unscopables]`](LegacyLiveArray.md#unscopables)

***

### isLoaded

```ts
isLoaded: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/legacy-live-array.ts:79](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/legacy-live-array.ts#L79)

Whether this LiveArray has loaded. LiveArrays are always considered
loaded once created.

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`isLoaded`](LegacyLiveArray.md#isloaded)

***

### isUpdating

```ts
isUpdating: boolean;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/-utils.ts:26](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/-utils.ts#L26)

The flag to signal a `RecordArray` is currently loading data.
Example

```javascript
let people = store.peekAll('person');
people.isUpdating; // false
people.update();
people.isUpdating; // true
```

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`isUpdating`](LegacyLiveArray.md#isupdating)

***

### length

```ts
length: number;
```

Defined in: [node\_modules/.pnpm/typescript@6.0.3/node\_modules/typescript/lib/lib.es5.d.ts:1327](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/node_modules/.pnpm/typescript@6.0.3/node_modules/typescript/lib/lib.es5.d.ts#L1327)

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`length`](LegacyLiveArray.md#length)

***

### links

```ts
links: 
  | Links
  | PaginationLinks
  | null;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts:96](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts#L96)

The JSON:API `links` included in the response that produced this
QueryArray, if any.

***

### meta

```ts
meta: ObjectValue | null;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts:102](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts#L102)

The JSON:API `meta` included in the response that produced this
QueryArray, if any.

***

### modelName

```ts
modelName: TypeFromInstanceOrString<T>;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/legacy-live-array.ts:87](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/legacy-live-array.ts#L87)

The resource type (`ResourceType`) whose records this LiveArray contains.

#### Inherited from

[`LegacyLiveArray`](LegacyLiveArray.md).[`modelName`](LegacyLiveArray.md#modelname)

***

### query

```ts
query: 
  | Record<string, unknown>
  | ImmutableRequestInfo
  | null;
```

Defined in: [warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts:89](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/core/src/store/-private/record-arrays/legacy-query.ts#L89)

The query originally passed to `store.query()` that produced this
QueryArray. Used by `update()` to re-run the query.
