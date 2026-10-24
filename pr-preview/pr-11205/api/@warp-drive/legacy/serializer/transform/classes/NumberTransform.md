---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/serializer/transform/classes/NumberTransform.md
---

&#x20;

# &#x20;NumberTransform

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts:10](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts#L10)

The `NumberTransform` class is used to serialize and deserialize
numeric attributes on Ember Data record objects. This transform is
used when `number` is passed as the type parameter to the
[attr](../../../model/functions/attr.md) function.

Usage

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
new NumberTransform(): NumberTransform;
```

#### Returns

`NumberTransform`

## Methods

### deserialize()

```ts
deserialize(serialized: string | number | null | undefined, _options?: Record<string, unknown>): number | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts:42](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts#L42)

Converts a serialized (raw payload) value into a `number`, or `null`
if the value is empty, nullish, or not a valid number.

#### Parameters

##### serialized

`string` | `number` | `null` | `undefined`

##### \_options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

`number` | `null`

***

### serialize()

```ts
serialize(deserialized: string | number | null | undefined, _options?: Record<string, unknown>): number | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts:55](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts#L55)

Converts a `number` attribute value into its serialized (raw payload) form.

#### Parameters

##### deserialized

`string` | `number` | `null` | `undefined`

##### \_options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

`number` | `null`

***

### create()

```ts
static create(): NumberTransform;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts:68](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts#L68)

Creates a new instance of this transform.

#### Returns

`NumberTransform`

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): "number";
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts:14](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/serializer/-private/transforms/number.ts#L14)

see [TransformName](../../../../core/types/symbols/variables/TransformName.md)
