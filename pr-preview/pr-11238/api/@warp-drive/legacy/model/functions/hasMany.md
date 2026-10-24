---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/api/@warp-drive/legacy/model/functions/hasMany.md
description: >-
  Legacy `Model` decorator that declares a to-many relationship to another
  resource type, configured with required `async` and `inverse` options.
---

&#x20;

# &#x20;hasMany()

```ts
function hasMany(): never;
function hasMany(type: string): never;
function hasMany<T>(type: TypeFromInstance<NoNull<T>>, options: RelationshipOptions<T, boolean>): RelationshipDecorator<T>;
function hasMany(type: string, options: RelationshipOptions<unknown, boolean>): RelationshipDecorator<unknown>;
```

## Call Signature

```ts
function hasMany(): never;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/has-many.ts:255](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model/-private/has-many.ts#L255)

`hasMany` is used to define Many-To-One and Many-To-Many, and Many-To-None
relationships on a [Model](../classes/Model.md).

`hasMany` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **many-to-one** (or one-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}

// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}
```

To declare a **many-to-many** relationship with managed inverses, use `hasMany` for both sides:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: 'posts' }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: 'tags' }) posts;
}
```

To declare a **many-to-many** relationship without managed inverses, use `hasMany` for both sides
with `null` as the inverse:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: null }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: null }) posts;
}
```

To declare a many-to-none relationship between two models, use
`hasMany` with inverse set to `null` on just one side::

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('category', { async: true, inverse: null }) categories;
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
the HasMany reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `comments` relationship:

```js
post.hasMany('comments').reload();
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
function hasMany(type: string): never;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/has-many.ts:256](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model/-private/has-many.ts#L256)

`hasMany` is used to define Many-To-One and Many-To-Many, and Many-To-None
relationships on a [Model](../classes/Model.md).

`hasMany` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **many-to-one** (or one-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}

// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}
```

To declare a **many-to-many** relationship with managed inverses, use `hasMany` for both sides:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: 'posts' }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: 'tags' }) posts;
}
```

To declare a **many-to-many** relationship without managed inverses, use `hasMany` for both sides
with `null` as the inverse:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: null }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: null }) posts;
}
```

To declare a many-to-none relationship between two models, use
`hasMany` with inverse set to `null` on just one side::

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('category', { async: true, inverse: null }) categories;
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
the HasMany reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `comments` relationship:

```js
post.hasMany('comments').reload();
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
function hasMany<T>(type: TypeFromInstance<NoNull<T>>, options: RelationshipOptions<T, boolean>): RelationshipDecorator<T>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/has-many.ts:257](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model/-private/has-many.ts#L257)

`hasMany` is used to define Many-To-One and Many-To-Many, and Many-To-None
relationships on a [Model](../classes/Model.md).

`hasMany` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **many-to-one** (or one-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}

// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}
```

To declare a **many-to-many** relationship with managed inverses, use `hasMany` for both sides:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: 'posts' }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: 'tags' }) posts;
}
```

To declare a **many-to-many** relationship without managed inverses, use `hasMany` for both sides
with `null` as the inverse:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: null }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: null }) posts;
}
```

To declare a many-to-none relationship between two models, use
`hasMany` with inverse set to `null` on just one side::

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('category', { async: true, inverse: null }) categories;
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
the HasMany reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `comments` relationship:

```js
post.hasMany('comments').reload();
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

[`TypeFromInstance`](../../../core/types/record/types/TypeFromInstance.md)<`NoNull`<`T`>>

the name of the related resource

#### options

`RelationshipOptions`<`T`, `boolean`>

a hash of options

### Returns

`RelationshipDecorator`<`T`>

## Call Signature

```ts
function hasMany(type: string, options: RelationshipOptions<unknown, boolean>): RelationshipDecorator<unknown>;
```

Defined in: [warp-drive-packages/legacy/src/model/-private/has-many.ts:265](https://github.com/warp-drive-data/warp-drive/blob/8bf4cade6bfc227d414394a8cb69ecfab1c21cbe/warp-drive-packages/legacy/src/model/-private/has-many.ts#L265)

`hasMany` is used to define Many-To-One and Many-To-Many, and Many-To-None
relationships on a [Model](../classes/Model.md).

`hasMany` takes a configuration hash as a second parameter, currently
supported options are:

* `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
* `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
* `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
* `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

### Examples

To declare a **many-to-one** (or one-to-many) relationship, use
`belongsTo` in combination with `hasMany`:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('comment', { async: false, inverse: 'post' }) comments;
}

// app/models/comment.js
import { Model, belongsTo } from '@warp-drive/legacy/model';

export default class Comment extends Model {
  @belongsTo('post', { async: false, inverse: 'comments' }) post;
}
```

To declare a **many-to-many** relationship with managed inverses, use `hasMany` for both sides:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: 'posts' }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: 'tags' }) posts;
}
```

To declare a **many-to-many** relationship without managed inverses, use `hasMany` for both sides
with `null` as the inverse:

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('tag', { async: true, inverse: null }) tags;
}

// app/models/tag.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Tag extends Model {
  @hasMany('post', { async: true, inverse: null }) posts;
}
```

To declare a many-to-none relationship between two models, use
`hasMany` with inverse set to `null` on just one side::

```js
// app/models/post.js
import { Model, hasMany } from '@warp-drive/legacy/model';

export default class Post extends Model {
  @hasMany('category', { async: true, inverse: null }) categories;
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
the HasMany reference API to fetch or refresh related resources
that aren't loaded. For instance, for a `comments` relationship:

```js
post.hasMany('comments').reload();
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
