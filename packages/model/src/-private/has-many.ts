/**
  @module @ember-data/model
*/
import { assert, deprecate } from '@ember/debug';
import { computed } from '@ember/object';
import { dasherize } from '@ember/string';

import { singularize } from 'ember-inflector';

import { DEPRECATE_NON_STRICT_TYPES } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { RecordStore } from '@warp-drive/core-types/symbols';

import type { NoNull, RelationshipDecorator, RelationshipOptions } from './belongs-to';
import { lookupLegacySupport } from './legacy-relationships-support';
import type { MinimalLegacyRecord } from './model-methods';
import { isElementDescriptor } from './util';

function normalizeType(type: string) {
  if (DEPRECATE_NON_STRICT_TYPES) {
    const result = singularize(dasherize(type));

    deprecate(
      `The resource type '${type}' is not normalized. Update your application code to use '${result}' instead of '${type}'.`,
      result === type,
      {
        id: 'ember-data:deprecate-non-strict-types',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '5.3',
          enabled: '5.3',
        },
      }
    );

    return result;
  }

  return type;
}

function _hasMany<T, Async extends boolean>(
  type: string,
  options: RelationshipOptions<T, Async>
): RelationshipDecorator<T> {
  assert(`Expected hasMany options.async to be a boolean`, options && typeof options.async === 'boolean');

  // Metadata about relationships is stored on the meta of
  // the relationship. This is used for introspection and
  // serialization. Note that `key` is populated lazily
  // the first time the CP is called.
  const meta = {
    type: normalizeType(type),
    options,
    isRelationship: true,
    kind: 'hasMany',
    name: '<Unknown BelongsTo>',
    key: null,
  };

  return computed({
    get<R extends MinimalLegacyRecord>(this: R, key: string) {
      if (DEBUG) {
        if (['currentState'].includes(key)) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your hasMany on ${this.constructor.toString()}`
          );
        }
      }
      if (this.isDestroying || this.isDestroyed) {
        return [];
      }
      return lookupLegacySupport(this).getHasMany(key);
    },
    set<R extends MinimalLegacyRecord>(this: R, key: string, records: T[]) {
      if (DEBUG) {
        if (['currentState'].includes(key)) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your hasMany on ${this.constructor.toString()}`
          );
        }
      }
      const support = lookupLegacySupport(this);
      const manyArray = support.getManyArray(key);
      assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(records));
      this[RecordStore]._join(() => {
        manyArray.splice(0, manyArray.length, ...records);
      });

      return support.getHasMany(key);
    },
  }).meta(meta);
}

/**
  `hasMany` is used to define Many-To-One and Many-To-Many, and Many-To-None
  relationships on a [Model](/ember-data/release/classes/Model).

  `hasMany` takes a configuration hash as a second parameter, currently
  supported options are:

  - `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
  - `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
  - `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
  - `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

  ### Examples

  To declare a **many-to-one** (or one-to-many) relationship, use
  `belongsTo` in combination with `hasMany`:

  ```js
  // app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Post extends Model {
    @hasMany('comment', { async: false, inverse: 'post' }) comments;
  }


  // app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Comment extends Model {
    @belongsTo('post', { async: false, inverse: 'comments' }) post;
  }
  ```

  To declare a **many-to-many** relationship with managed inverses, use `hasMany` for both sides:

  ```js
  // app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Post extends Model {
    @hasMany('tag', { async: true, inverse: 'posts' }) tags;
  }

  // app/models/tag.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Tag extends Model {
    @hasMany('post', { async: true, inverse: 'tags' }) posts;
  }
  ```

  To declare a **many-to-many** relationship without managed inverses, use `hasMany` for both sides
  with `null` as the inverse:

  ```js
  // app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Post extends Model {
    @hasMany('tag', { async: true, inverse: null }) tags;
  }

  // app/models/tag.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Tag extends Model {
    @hasMany('post', { async: true, inverse: null }) posts;
  }
  ```

  To declare a many-to-none relationship between two models, use
  `hasMany` with inverse set to `null` on just one side::

  ```js
  // app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Post extends Model {
    @hasMany('category', { async: true, inverse: null }) categories;
  }
  ```

  #### Sync vs Async Relationships

  EmberData fulfills relationships using resource data available in
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
  import Model, { belongsTo } from '@ember-data/model';

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
  import Model, { hasMany } from '@ember-data/model';

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

  @method hasMany
  @public
  @static
  @for @ember-data/model
  @param {string} type (optional) the name of the related resource
  @param {object} options (optional) a hash of options
  @return {PropertyDescriptor} relationship
*/
export function hasMany(): never;
export function hasMany(type: string): never;
export function hasMany<T>(
  type: TypeFromInstance<NoNull<T>>,
  options: RelationshipOptions<T, boolean>
): RelationshipDecorator<T>;
// export function hasMany<K extends Promise<unknown>, T extends Awaited<K> = Awaited<K>>(
//   type: TypeFromInstance<NoNull<T>>,
//   options: RelationshipOptions<T, true>
// ): RelationshipDecorator<K>;
export function hasMany(type: string, options: RelationshipOptions<unknown, boolean>): RelationshipDecorator<unknown>;
export function hasMany<T>(
  type?: TypeFromInstance<NoNull<T>>,
  options?: RelationshipOptions<T, boolean>
): RelationshipDecorator<T> {
  if (DEBUG) {
    assert(
      `hasMany must be invoked with a type and options. Did you mean \`@hasMany(${type}, { async: false, inverse: null })\`?`,
      !isElementDescriptor(arguments as unknown as unknown[])
    );
  }
  return _hasMany(type!, options!);
}
