# Typing Models & Transforms

## Type

Example: add the `Type` brand to the `user` model.

```ts
import Model, { attr } from '@ember-data/model';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @attr declare name: string;

  [Type] = 'user' as const;
}
```

The benefit of the above is that the value of Type is readable at runtime and thus easy to debug.
However, you can also choose to do this via types only:

```ts
import Model, { attr } from '@ember-data/model';
import type { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @attr declare name: string;

  declare [Type]: 'user';
}
```

EmberData will never access Type as an actual value, these brands are *purely* for type inference.

## Transforms

Transforms with a `Type` brand will have their type and options validated. Once we move to stage-3 decorators, the signature of the field would also be validated against the transform.

Example: Typing a Transform

```ts
import type { Type } from '@warp-drive/core-types/symbols';

export default class BigIntTransform {
  deserialize(serialized: string): BigInt | null {
    return !serialized || serialized === '' ? null : BigInt(serialized + 'n');
  }
  serialize(deserialized: BigInt | null): string | null {
    return !deserialized ? null : String(deserialized);
  }

  declare [Type]: 'big-int';

  static create() {
    return new this();
  }
}
```

Example: Using Transforms

```ts
import Model, { attr } from '@ember-data/model';
import type { StringTransform } from '@ember-data/serializer/transforms';
import type { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @attr<StringTransform>('string') declare name: string;

  declare [Type]: 'user';
}
```

## Sync BelongsTo

`belongsTo` relationships will have their resource type and options config validated against the passed in type.

Once we move to stage-3 decorators, explicitly setting the generic would not be required as it could be infered from the field's type.

```ts
import Model, { belongsTo } from '@ember-data/model';
import type Address from './address';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @belongsTo<Address>('address', { async: false, inverse: null })
  declare address: Address;

  [Type] = 'user' as const;
}
```

## Async BelongsTo

`belongsTo` relationships will have their resource type and options config validated against the passed in type.

Once we move to stage-3 decorators, explicitly setting the generic would not be required as it could be infered from the field's type.

```ts
import Model, { belongsTo, AsyncBelongsTo } from '@ember-data/model';
import type Address from './address';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @belongsTo<Address>('address', { async: true, inverse: null })
  declare address: AsyncBelongsTo<Address>;

  [Type] = 'user' as const;
}
```

## Sync HasMany (data only)

If you don't need access to meta or links on relationships, you can type the relationship as just an array.

`hasMany` relationships will have their resource type and options config validated against the passed in type.

Once we move to stage-3 decorators, explicitly setting the generic would not be required as it could be infered from the field's type.

```ts
import Model, { hasMany } from '@ember-data/model';
import type Post from './post';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @hasMany<Post>('post', { async: false, inverse: 'author' })
  declare posts: Post[];

  [Type] = 'user' as const;
}
```

## Sync HasMany (with meta, links, etc)

`hasMany` relationships will have their resource type and options config validated against the passed in type.

Once we move to stage-3 decorators, explicitly setting the generic would not be required as it could be infered from the field's type.

```ts
import Model, { hasMany, HasMany } from '@ember-data/model';
import type Post from './post';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @hasMany<Post>('post', { async: false, inverse: 'author' })
  declare posts: HasMany<Post>;

  [Type] = 'user' as const;
}
```

## Async HasMany (restricted)

If you don't need access to meta, links or template iterations on relationships, you can type the relationship as just a promise resolving to an array. Only use this if the value
will always be awaited before iteration.

`hasMany` relationships will have their resource type and options config validated against the passed in type.

Once we move to stage-3 decorators, explicitly setting the generic would not be required as it could be infered from the field's type.

```ts
import Model, { hasMany, AsyncHasMany } from '@ember-data/model';
import type Post from './post';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @hasMany<Post>('post', { async: true, inverse: 'author' })
  declare posts: Promise<Post[]>;

  [Type] = 'user' as const;
}
```

`Promise<HasMany<Post>>` also works.

## Async HasMany (with links, meta, etc.)

`hasMany` relationships will have their resource type and options config validated against the passed in type.

Once we move to stage-3 decorators, explicitly setting the generic would not be required as it could be infered from the field's type.

```ts
import Model, { hasMany, AsyncHasMany } from '@ember-data/model';
import type Post from './post';
import { Type } from '@warp-drive/core-types/symbols';

export default class User extends Model {
  @hasMany<Post>('post', { async: true, inverse: 'author' })
  declare posts: AsyncHasMany<Post>;

  [Type] = 'user' as const;
}
```
