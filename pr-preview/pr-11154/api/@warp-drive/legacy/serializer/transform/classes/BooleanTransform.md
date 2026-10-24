---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/serializer/transform/classes/BooleanTransform.md
---

&#x20;

# &#x20;BooleanTransform

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts:6](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts#L6)

The `BooleanTransform` class is used to serialize and deserialize
boolean attributes on Ember Data record objects. This transform is
used when `'boolean'` is passed as the type parameter to the
[attr](../../../model/functions/attr.md)function.

Usage

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('boolean') isAdmin;
  @attr('string') name;
  @attr('string') email;
}
```

By default, the boolean transform only allows for values of `true` or
`false`. You can opt into allowing `null` values for
boolean attributes via `attr('boolean', { allowNull: true })`

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') email;
  @attr('string') username;
  @attr('boolean', { allowNull: true }) wantsWeeklyEmail;
}
```

## Constructors

### Constructor

```ts
new BooleanTransform(): BooleanTransform;
```

#### Returns

`BooleanTransform`

## Methods

### deserialize()

```ts
deserialize(serialized: string | number | boolean | null, options?: {
  allowNull?: boolean;
}): boolean | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts:52](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts#L52)

Converts a serialized (raw payload) value into a `boolean` (or `null`
when `allowNull` is set and the value is nullish).

#### Parameters

##### serialized

`string` | `number` | `boolean` | `null`

##### options?

###### allowNull?

`boolean`

#### Returns

`boolean` | `null`

***

### serialize()

```ts
serialize(deserialized: boolean | null, options?: {
  allowNull?: boolean;
}): boolean | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts:71](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts#L71)

Converts a `boolean` attribute value into its serialized (raw payload) form.

#### Parameters

##### deserialized

`boolean` | `null`

##### options?

###### allowNull?

`boolean`

#### Returns

`boolean` | `null`

***

### create()

```ts
static create(): BooleanTransform;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts:82](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts#L82)

Creates a new instance of this transform.

#### Returns

`BooleanTransform`

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): "boolean";
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts:10](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/boolean.ts#L10)

see [TransformName](../../../../core/types/symbols/variables/TransformName.md)
