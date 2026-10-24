---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/serializer/transform/classes/DateTransform.md
---

&#x20;

# &#x20;DateTransform

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts:6](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts#L6)

The `DateTransform` class is used to serialize and deserialize
date attributes on Ember Data record objects. This transform is used
when `'date'` is passed as the type parameter to the
[attr](../../../model/functions/attr.md) function. It uses the [`ISO 8601`](https://en.wikipedia.org/wiki/ISO_8601)
standard.

```js [app/models/score.js]
import Model, { attr, belongsTo } from '@warp-drive/legacy/model';

export default class ScoreModel extends Model {
   @attr('number') value;
   @belongsTo('player') player;
   @attr('date') date;
 }
```

## Constructors

### Constructor

```ts
new DateTransform(): DateTransform;
```

#### Returns

`DateTransform`

## Methods

### deserialize()

```ts
deserialize(serialized: string | number | null, _options?: Record<string, unknown>): 
  | Date
  | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts:37](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts#L37)

Converts a serialized (raw payload) `ISO 8601` string, epoch number,
or nullish value into a `Date` (or `null`/`undefined`).

#### Parameters

##### serialized

`string` | `number` | `null`

##### \_options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

| [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)
| `null`

***

### serialize()

```ts
serialize(date: Date, _options?: Record<string, unknown>): string | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts:61](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts#L61)

Converts a `Date` attribute value into an `ISO 8601` string, or `null`
if the value is not a valid `Date`.

#### Parameters

##### date

[`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)

##### \_options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

`string` | `null`

***

### create()

```ts
static create(): DateTransform;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts:73](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts#L73)

Creates a new instance of this transform.

#### Returns

`DateTransform`

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): "date";
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts:10](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/date.ts#L10)

see [TransformName](../../../../core/types/symbols/variables/TransformName.md)
