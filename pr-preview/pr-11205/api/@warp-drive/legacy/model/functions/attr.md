---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/api/@warp-drive/legacy/model/functions/attr.md
---

&#x20;

# &#x20;attr()

```ts
function attr(): DataDecorator;
function attr<T>(type: TypeFromInstance<T>): DataDecorator;
function attr(type: string): DataDecorator;
function attr(options: AttrOptions): DataDecorator;
function attr<T>(type: TypeFromInstance<T>, options?: OptionsFromInstance<T>): DataDecorator;
function attr(type: string, options?: AttrOptions<
  | object
  | unknown[]
  | PrimitiveValue> & object): DataDecorator;
function attr(
   target: object, 
   key: string | symbol, 
   desc?: PropertyDescriptor
): void;
```

## Call Signature

```ts
function attr(): DataDecorator;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:293](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L293)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Returns

`DataDecorator`

## Call Signature

```ts
function attr<T>(type: TypeFromInstance<T>): DataDecorator;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:294](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L294)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Type Parameters

#### T

`T`

### Parameters

#### type

`TypeFromInstance`<`T`>

the attribute type

### Returns

`DataDecorator`

## Call Signature

```ts
function attr(type: string): DataDecorator;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:295](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L295)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Parameters

#### type

`string`

the attribute type

### Returns

`DataDecorator`

## Call Signature

```ts
function attr(options: AttrOptions): DataDecorator;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:296](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L296)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Parameters

#### options

`AttrOptions`

a hash of options

### Returns

`DataDecorator`

## Call Signature

```ts
function attr<T>(type: TypeFromInstance<T>, options?: OptionsFromInstance<T>): DataDecorator;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:297](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L297)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Type Parameters

#### T

`T`

### Parameters

#### type

`TypeFromInstance`<`T`>

the attribute type

#### options?

`OptionsFromInstance`<`T`>

a hash of options

### Returns

`DataDecorator`

## Call Signature

```ts
function attr(type: string, options?: AttrOptions<
  | object
  | unknown[]
  | PrimitiveValue> & object): DataDecorator;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:298](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L298)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Parameters

#### type

`string`

the attribute type

#### options?

`AttrOptions`<
| `object`
| `unknown`\[]
| [`PrimitiveValue`](../../../core/types/json/raw/types/PrimitiveValue.md)> & `object`

a hash of options

### Returns

`DataDecorator`

## Call Signature

```ts
function attr(
   target: object, 
   key: string | symbol, 
   desc?: PropertyDescriptor
): void;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/attr.ts:299](https://github.com/warp-drive-data/warp-drive/blob/e08e8aace516e5eb10dc096db7683416f3d74fba/warp-drive-packages/legacy/src/model/-private/attr.ts#L299)

`attr` defines an attribute on a [Model](../classes/Model.md).
By default, attributes are passed through as-is, however you can specify an
optional type to have the value automatically transformed.
WarpDrive ships with four basic transform types: `string`, `number`,
`boolean` and `date`. You can define your own transforms by subclassing
[Transform](../../serializer/transform/classes/Transform.md).

Note that you cannot use `attr` to define an attribute of `id`.

`attr` takes an optional hash as a second parameter, currently
supported options are:

* `defaultValue`: Pass a string or a function to be called to set the attribute
  to a default value if and only if the key is absent from the payload response.

Example

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;
  @attr('boolean', { defaultValue: false }) verified;
}
```

Default value can also be a function. This is useful it you want to return
a new object for each attribute.

```js [app/models/user.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class UserModel extends Model {
  @attr('string') username;
  @attr('string') email;

  @attr({
    defaultValue() {
      return {};
    }
  })
  settings;
}
```

The `options` hash is passed as second argument to a transforms'
`serialize` and `deserialize` method. This allows to configure a
transformation and adapt the corresponding value, based on the config:

```js [app/models/post.js]
import { Model, attr } from '@warp-drive/legacy/model';

export default class PostModel extends Model {
  @attr('text', {
    uppercase: true
  })
  text;
}
```

```js [app/transforms/text.js]
export default class TextTransform {
  serialize(value, options) {
    if (options.uppercase) {
      return value.toUpperCase();
    }

    return value;
  }

  deserialize(value) {
    return value;
  }

  static create() {
    return new this();
  }
}
```

### Parameters

#### target

`object`

#### key

`string` | `symbol`

#### desc?

`PropertyDescriptor`

### Returns

`void`
