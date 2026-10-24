---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/api/@warp-drive/legacy/model/functions/belongsTo.md
---

&#x20;

# &#x20;belongsTo()

```ts
function belongsTo(): never;
function belongsTo(type: string): never;
function belongsTo<T>(type: TypeFromInstance<Exclude<T, null>>, options: RelationshipOptions<T, boolean>): RelationshipDecorator<T>;
function belongsTo(type: string, options: RelationshipOptions<unknown, boolean>): RelationshipDecorator<unknown>;
```

## Call Signature

```ts
function belongsTo(): never;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/belongs-to.ts:298](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/-private/belongs-to.ts#L298)

`belongsTo` is used to define One-To-One and One-To-Many, and One-To-None
relationships on a [Model](../classes/Model.md).

`belongsTo` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **one-to-many** (or many-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}

// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}
```

To declare a **one-to-one** relationship with managed inverses, use `belongsTo` for both sides:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: 'owner' }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: 'address' }) owner;
}
```

To declare a **one-to-one** relationship without managed inverses, use `belongsTo` for both sides
with `null` as the inverse:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: null }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: null }) owner;
}
```

To declare a one-to-none relationship between two models, use
`belongsTo` with inverse set to `null` on just one side::

```js
// app/models/person.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Person extends Model {
  @belongsTo('person', { async: false, inverse: null }) bestFriend;
}
```

#### Sync vs Async Relationships

WarpDrive fulfills relationships using resource data available in
the cache.

Sync relationships point directly to the known related resources.

When a relationship is declared as async, if any of the known related
resources have not been loaded, they will be fetched. The property
on the record when accessed provides a promise that resolves once
all resources are loaded.

Async relationships may take advantage of links. On access, if the related
link has not been loaded, or if any known resources are not available in
the cache, the fresh state will be fetched using the link.

In contrast to async relationship, accessing a sync relationship
will error on access when any of the known related resources have
not been loaded.

If you are using `links` with sync relationships, you have to use
the BelongsTo reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `bestFriend` relationship:

```js
person.belongsTo('bestFriend').reload();
```

#### Polymorphic Relationships

To declare a polymorphic relationship, use `hasMany` with the `polymorphic`
option set to `true`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('commentable', { async: false, inverse: 'comments', polymorphic: true }) parent;
}
```

`'commentable'` here is referred to as the "abstract type" for the polymorphic
relationship.

Polymorphic relationships with `inverse: null` will accept any type of record as their content.
Polymorphic relationships with `inverse` set to a string will only accept records with a matching
inverse relationships declaring itself as satisfying the abstract type.

Below, 'as' is used to declare the that 'post' record satisfies the abstract type 'commentable'
for this relationship.

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'parent', as: 'commentable' }) comments;
}
```

Note: every Model that declares an inverse to a polymorphic relationship must
declare itself exactly the same. This is because polymorphism is based on structural
traits.

Polymorphic to polymorphic relationships are supported. Both sides of the relationship
must be declared as polymorphic, and the `as` option must be used to declare the abstract
type each record satisfies on both sides.

### Returns

`never`

## Call Signature

```ts
function belongsTo(type: string): never;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/belongs-to.ts:299](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/-private/belongs-to.ts#L299)

`belongsTo` is used to define One-To-One and One-To-Many, and One-To-None
relationships on a [Model](../classes/Model.md).

`belongsTo` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **one-to-many** (or many-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}

// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}
```

To declare a **one-to-one** relationship with managed inverses, use `belongsTo` for both sides:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: 'owner' }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: 'address' }) owner;
}
```

To declare a **one-to-one** relationship without managed inverses, use `belongsTo` for both sides
with `null` as the inverse:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: null }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: null }) owner;
}
```

To declare a one-to-none relationship between two models, use
`belongsTo` with inverse set to `null` on just one side::

```js
// app/models/person.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Person extends Model {
  @belongsTo('person', { async: false, inverse: null }) bestFriend;
}
```

#### Sync vs Async Relationships

WarpDrive fulfills relationships using resource data available in
the cache.

Sync relationships point directly to the known related resources.

When a relationship is declared as async, if any of the known related
resources have not been loaded, they will be fetched. The property
on the record when accessed provides a promise that resolves once
all resources are loaded.

Async relationships may take advantage of links. On access, if the related
link has not been loaded, or if any known resources are not available in
the cache, the fresh state will be fetched using the link.

In contrast to async relationship, accessing a sync relationship
will error on access when any of the known related resources have
not been loaded.

If you are using `links` with sync relationships, you have to use
the BelongsTo reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `bestFriend` relationship:

```js
person.belongsTo('bestFriend').reload();
```

#### Polymorphic Relationships

To declare a polymorphic relationship, use `hasMany` with the `polymorphic`
option set to `true`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('commentable', { async: false, inverse: 'comments', polymorphic: true }) parent;
}
```

`'commentable'` here is referred to as the "abstract type" for the polymorphic
relationship.

Polymorphic relationships with `inverse: null` will accept any type of record as their content.
Polymorphic relationships with `inverse` set to a string will only accept records with a matching
inverse relationships declaring itself as satisfying the abstract type.

Below, 'as' is used to declare the that 'post' record satisfies the abstract type 'commentable'
for this relationship.

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'parent', as: 'commentable' }) comments;
}
```

Note: every Model that declares an inverse to a polymorphic relationship must
declare itself exactly the same. This is because polymorphism is based on structural
traits.

Polymorphic to polymorphic relationships are supported. Both sides of the relationship
must be declared as polymorphic, and the `as` option must be used to declare the abstract
type each record satisfies on both sides.

### Parameters

#### type

`string`

the name of the related resource

### Returns

`never`

## Call Signature

```ts
function belongsTo<T>(type: TypeFromInstance<Exclude<T, null>>, options: RelationshipOptions<T, boolean>): RelationshipDecorator<T>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/belongs-to.ts:300](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/-private/belongs-to.ts#L300)

`belongsTo` is used to define One-To-One and One-To-Many, and One-To-None
relationships on a [Model](../classes/Model.md).

`belongsTo` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **one-to-many** (or many-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}

// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}
```

To declare a **one-to-one** relationship with managed inverses, use `belongsTo` for both sides:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: 'owner' }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: 'address' }) owner;
}
```

To declare a **one-to-one** relationship without managed inverses, use `belongsTo` for both sides
with `null` as the inverse:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: null }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: null }) owner;
}
```

To declare a one-to-none relationship between two models, use
`belongsTo` with inverse set to `null` on just one side::

```js
// app/models/person.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Person extends Model {
  @belongsTo('person', { async: false, inverse: null }) bestFriend;
}
```

#### Sync vs Async Relationships

WarpDrive fulfills relationships using resource data available in
the cache.

Sync relationships point directly to the known related resources.

When a relationship is declared as async, if any of the known related
resources have not been loaded, they will be fetched. The property
on the record when accessed provides a promise that resolves once
all resources are loaded.

Async relationships may take advantage of links. On access, if the related
link has not been loaded, or if any known resources are not available in
the cache, the fresh state will be fetched using the link.

In contrast to async relationship, accessing a sync relationship
will error on access when any of the known related resources have
not been loaded.

If you are using `links` with sync relationships, you have to use
the BelongsTo reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `bestFriend` relationship:

```js
person.belongsTo('bestFriend').reload();
```

#### Polymorphic Relationships

To declare a polymorphic relationship, use `hasMany` with the `polymorphic`
option set to `true`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('commentable', { async: false, inverse: 'comments', polymorphic: true }) parent;
}
```

`'commentable'` here is referred to as the "abstract type" for the polymorphic
relationship.

Polymorphic relationships with `inverse: null` will accept any type of record as their content.
Polymorphic relationships with `inverse` set to a string will only accept records with a matching
inverse relationships declaring itself as satisfying the abstract type.

Below, 'as' is used to declare the that 'post' record satisfies the abstract type 'commentable'
for this relationship.

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'parent', as: 'commentable' }) comments;
}
```

Note: every Model that declares an inverse to a polymorphic relationship must
declare itself exactly the same. This is because polymorphism is based on structural
traits.

Polymorphic to polymorphic relationships are supported. Both sides of the relationship
must be declared as polymorphic, and the `as` option must be used to declare the abstract
type each record satisfies on both sides.

### Type Parameters

#### T

`T`

### Parameters

#### type

[`TypeFromInstance`](../../../core/types/record/types/TypeFromInstance.md)<[`Exclude`](https://www.typescriptlang.org/docs/handbook/utility-types.html#excludeuniontype-excludedmembers)<`T`, `null`>>

the name of the related resource

#### options

`RelationshipOptions`<`T`, `boolean`>

a hash of options

### Returns

`RelationshipDecorator`<`T`>

## Call Signature

```ts
function belongsTo(type: string, options: RelationshipOptions<unknown, boolean>): RelationshipDecorator<unknown>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/belongs-to.ts:308](https://github.com/warp-drive-data/warp-drive/blob/413a744256706ca96e9b51f41d057d461717f36f/warp-drive-packages/legacy/src/model/-private/belongs-to.ts#L308)

`belongsTo` is used to define One-To-One and One-To-Many, and One-To-None
relationships on a [Model](../classes/Model.md).

`belongsTo` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **one-to-many** (or many-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}

// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}
```

To declare a **one-to-one** relationship with managed inverses, use `belongsTo` for both sides:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: 'owner' }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: 'address' }) owner;
}
```

To declare a **one-to-one** relationship without managed inverses, use `belongsTo` for both sides
with `null` as the inverse:

```js
// app/models/author.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Author extends Model {
  @belongsTo('address', { async: true, inverse: null }) address;
}

// app/models/address.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Address extends Model {
  @belongsTo('author', { async: true, inverse: null }) owner;
}
```

To declare a one-to-none relationship between two models, use
`belongsTo` with inverse set to `null` on just one side::

```js
// app/models/person.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Person extends Model {
  @belongsTo('person', { async: false, inverse: null }) bestFriend;
}
```

#### Sync vs Async Relationships

WarpDrive fulfills relationships using resource data available in
the cache.

Sync relationships point directly to the known related resources.

When a relationship is declared as async, if any of the known related
resources have not been loaded, they will be fetched. The property
on the record when accessed provides a promise that resolves once
all resources are loaded.

Async relationships may take advantage of links. On access, if the related
link has not been loaded, or if any known resources are not available in
the cache, the fresh state will be fetched using the link.

In contrast to async relationship, accessing a sync relationship
will error on access when any of the known related resources have
not been loaded.

If you are using `links` with sync relationships, you have to use
the BelongsTo reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `bestFriend` relationship:

```js
person.belongsTo('bestFriend').reload();
```

#### Polymorphic Relationships

To declare a polymorphic relationship, use `hasMany` with the `polymorphic`
option set to `true`:

```js
// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('commentable', { async: false, inverse: 'comments', polymorphic: true }) parent;
}
```

`'commentable'` here is referred to as the "abstract type" for the polymorphic
relationship.

Polymorphic relationships with `inverse: null` will accept any type of record as their content.
Polymorphic relationships with `inverse` set to a string will only accept records with a matching
inverse relationships declaring itself as satisfying the abstract type.

Below, 'as' is used to declare the that 'post' record satisfies the abstract type 'commentable'
for this relationship.

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'parent', as: 'commentable' }) comments;
}
```

Note: every Model that declares an inverse to a polymorphic relationship must
declare itself exactly the same. This is because polymorphism is based on structural
traits.

Polymorphic to polymorphic relationships are supported. Both sides of the relationship
must be declared as polymorphic, and the `as` option must be used to declare the abstract
type each record satisfies on both sides.

### Parameters

#### type

`string`

the name of the related resource

#### options

`RelationshipOptions`<`unknown`, `boolean`>

a hash of options

### Returns

`RelationshipDecorator`<`unknown`>
