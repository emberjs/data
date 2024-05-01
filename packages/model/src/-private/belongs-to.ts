import { assert, warn } from '@ember/debug';
import { computed } from '@ember/object';

import { DEBUG } from '@warp-drive/build-config/env';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { lookupLegacySupport } from './legacy-relationships-support';
import type { MinimalLegacyRecord } from './model-methods';
import { isElementDescriptor, normalizeModelName } from './util';
/**
  @module @ember-data/model
*/

export type IsUnknown<T> = unknown extends T ? true : false;

export type RelationshipOptions<T, Async extends boolean> = {
  async: Async;
  inverse: null | (IsUnknown<T> extends true ? string : keyof NoNull<T> & string);
  polymorphic?: boolean;
  as?: string;
  resetOnRemoteUpdate?: boolean;
};

export type NoNull<T> = Exclude<T, null>;
// type BelongsToDecoratorObject<getT> = {
//   get: () => getT;
//   // set: (value: Awaited<getT>) => void;
//   set: (value: getT) => void;
//   // init: () => getT;
// };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type RelationshipDecorator<T> = <This>(target: This, key: string, desc?: PropertyDescriptor) => void; // BelongsToDecoratorObject<getT>;

function _belongsTo<T, Async extends boolean>(
  type: string,
  options: RelationshipOptions<T, Async>
): RelationshipDecorator<T> {
  assert(
    `Expected options.async from @belongsTo('${type}', options) to be a boolean`,
    options && typeof options.async === 'boolean'
  );
  assert(
    `Expected options.inverse from @belongsTo('${type}', options) to be either null or the string type of the related resource.`,
    options.inverse === null || (typeof options.inverse === 'string' && options.inverse.length > 0)
  );

  const meta = {
    type: normalizeModelName(type),
    isRelationship: true,
    options: options,
    kind: 'belongsTo',
    name: '<Unknown BelongsTo>',
    key: null,
  };

  return computed({
    get<R extends MinimalLegacyRecord>(this: R, key: string) {
      // this is a legacy behavior we may not carry into a new model setup
      // it's better to error on disconnected records so users find errors
      // in their logic.
      if (this.isDestroying || this.isDestroyed) {
        return null;
      }
      const support = lookupLegacySupport(this);

      if (DEBUG) {
        if (['currentState'].includes(key)) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${this.constructor.toString()}`
          );
        }
        if (Object.prototype.hasOwnProperty.call(options, 'serialize')) {
          warn(
            `You provided a serialize option on the "${key}" property in the "${support.identifier.type}" class, this belongs in the serializer. See Serializer and it's implementations https://api.emberjs.com/ember-data/release/classes/Serializer`,
            false,
            {
              id: 'ds.model.serialize-option-in-belongs-to',
            }
          );
        }

        if (Object.prototype.hasOwnProperty.call(options, 'embedded')) {
          warn(
            `You provided an embedded option on the "${key}" property in the "${support.identifier.type}" class, this belongs in the serializer. See EmbeddedRecordsMixin https://api.emberjs.com/ember-data/release/classes/EmbeddedRecordsMixin`,
            false,
            {
              id: 'ds.model.embedded-option-in-belongs-to',
            }
          );
        }
      }

      return support.getBelongsTo(key);
    },
    set<R extends MinimalLegacyRecord>(this: R, key: string, value: unknown) {
      const support = lookupLegacySupport(this);
      if (DEBUG) {
        if (['currentState'].includes(key)) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${this.constructor.toString()}`
          );
        }
      }
      this[RecordStore]._join(() => {
        support.setDirtyBelongsTo(key, value);
      });

      return support.getBelongsTo(key);
    },
  }).meta(meta) as RelationshipDecorator<T>;
}

/**
  `belongsTo` is used to define One-To-One and One-To-Many, and One-To-None
  relationships on a [Model](/ember-data/release/classes/Model).

  `belongsTo` takes a configuration hash as a second parameter, currently
  supported options are:

  - `async`: (*required*) A boolean value used to declare whether this is a sync (false) or async (true) relationship.
  - `inverse`: (*required*)  A string used to identify the inverse property on a related model, or `null`.
  - `polymorphic`: (*optional*) A boolean value to mark the relationship as polymorphic
  - `as`: (*optional*) A string used to declare the abstract type "this" record satisfies for polymorphism.

  ### Examples

  To declare a **one-to-many** (or many-to-many) relationship, use
  `belongsTo` in combination with `hasMany`:

  ```js
  // app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Comment extends Model {
    @belongsTo('post', { async: false, inverse: 'comments' }) post;
  }

  // app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class Post extends Model {
    @hasMany('comment', { async: false, inverse: 'post' }) comments;
  }
  ```

  To declare a **one-to-one** relationship with managed inverses, use `belongsTo` for both sides:

  ```js
  // app/models/author.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Author extends Model {
    @belongsTo('address', { async: true, inverse: 'owner' }) address;
  }

  // app/models/address.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Address extends Model {
    @belongsTo('author', { async: true, inverse: 'address' }) owner;
  }
  ```

  To declare a **one-to-one** relationship without managed inverses, use `belongsTo` for both sides
  with `null` as the inverse:

  ```js
  // app/models/author.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Author extends Model {
    @belongsTo('address', { async: true, inverse: null }) address;
  }

  // app/models/address.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Address extends Model {
    @belongsTo('author', { async: true, inverse: null }) owner;
  }
  ```

  To declare a one-to-none relationship between two models, use
  `belongsTo` with inverse set to `null` on just one side::

  ```js
  // app/models/person.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class Person extends Model {
    @belongsTo('person', { async: false, inverse: null }) bestFriend;
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

  @method belongsTo
  @public
  @static
  @for @ember-data/model
  @param {string} type (optional) the name of the related resource
  @param {object} options (optional) a hash of options
  @return {PropertyDescriptor} relationship
*/

export function belongsTo(): never;
export function belongsTo(type: string): never;
export function belongsTo<T>(
  type: TypeFromInstance<NoNull<T>>,
  options: RelationshipOptions<T, boolean>
): RelationshipDecorator<T>;
// export function belongsTo<K extends Promise<unknown>, T extends Awaited<K> = Awaited<K>>(
//   type: TypeFromInstance<NoNull<T>>,
//   options: RelationshipOptions<T, true>
// ): RelationshipDecorator<K>;
export function belongsTo(type: string, options: RelationshipOptions<unknown, boolean>): RelationshipDecorator<unknown>;
export function belongsTo<T>(
  type?: TypeFromInstance<NoNull<T>>,
  options?: RelationshipOptions<T, boolean>
): RelationshipDecorator<T> {
  if (DEBUG) {
    assert(
      `belongsTo must be invoked with a type and options. Did you mean \`@belongsTo(${type}, { async: false, inverse: null })\`?`,
      !isElementDescriptor(arguments as unknown as unknown[])
    );
  }
  return _belongsTo(type!, options!);
}
