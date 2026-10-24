---
url: >-
  /pr-preview/pr-11154/api/@warp-drive/legacy/serializer/transform/classes/StringTransform.md
---

&#x20;

# &#x20;StringTransform

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts:6](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts#L6)

The `StringTransform` class is used to serialize and deserialize
string attributes on Ember Data record objects. This transform is
used when `string` is passed as the type parameter to the
[attr](../../../model/functions/attr.md) function.

Usage

```js [app/models/user.js]
import Model, { attr, belongsTo } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('boolean') isAdmin;
  @attr('string') name;
  @attr('string') email;
}
```

## Constructors

### Constructor

```ts
new StringTransform(): StringTransform;
```

#### Returns

`StringTransform`

## Methods

### deserialize()

```ts
deserialize(serialized: unknown, _options?: Record<string, unknown>): string | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts:37](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts#L37)

Converts a serialized (raw payload) value into a `string`, or `null`
if the value is falsy (and not an empty string).

#### Parameters

##### serialized

`unknown`

##### \_options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

`string` | `null`

***

### serialize()

```ts
serialize(deserialized: unknown, _options?: Record<string, unknown>): string | null;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts:43](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts#L43)

Converts a `string` attribute value into its serialized (raw payload) form.

#### Parameters

##### deserialized

`unknown`

##### \_options?

[`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)<`string`, `unknown`>

#### Returns

`string` | `null`

***

### create()

```ts
static create(): StringTransform;
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts:50](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts#L50)

Creates a new instance of this transform.

#### Returns

`StringTransform`

## Properties

### \_\_\_(unique) Symbol($type)

```ts
___(unique) Symbol($type): "string";
```

Defined in: [warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts:10](https://github.com/warp-drive-data/warp-drive/blob/337a6f7f863513aec1529f2cd8ff19351189ba77/warp-drive-packages/legacy/src/serializer/-private/transforms/string.ts#L10)

see [TransformName](../../../../core/types/symbols/variables/TransformName.md)
