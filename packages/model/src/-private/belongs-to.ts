import { assert, warn } from '@ember/debug';
import { computed } from '@ember/object';

import { DEBUG } from '@ember-data/env';
import type { TypeFromInstance } from '@warp-drive/core-types/record';
import { RecordStore } from '@warp-drive/core-types/symbols';

import { lookupLegacySupport } from './legacy-relationships-support';
import type { MinimalLegacyRecord } from './model-methods';
import { isElementDescriptor, normalizeModelName } from './util';
/**
  @module @ember-data/model
*/

export type RelationshipOptions<T, Async extends boolean> = {
  async: Async;
  inverse: null | (keyof NoNull<T> & string);
  polymorphic?: boolean;
  as?: string;
};

type NoNull<T> = Exclude<T, null>;
type BelongsToDecoratorObject<getT> = {
  get: () => getT;
  // set: (value: Awaited<getT>) => void;
  set: (value: getT) => void;
  // init: () => getT;
};
export type BelongsToDecorator<getT> = <This>(
  target: This,
  key: string,
  desc?: PropertyDescriptor
) => BelongsToDecoratorObject<getT>;

function _belongsTo<T, Async extends boolean>(
  type: string,
  options: RelationshipOptions<T, Async>
): BelongsToDecorator<T> {
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
  }).meta(meta) as BelongsToDecorator<T>;
}

/**
  `belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [Model](/ember-data/release/classes/Model).


  `belongsTo` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship. The default is true.
  - `inverse`: A string used to identify the inverse property on a
    related model in a One-To-Many relationship. See [Explicit Inverses](#explicit-inverses)
  - `polymorphic` A boolean value to mark the relationship as polymorphic

  #### One-To-One
  To declare a one-to-one relationship between two models, use
  `belongsTo`:

  ```app/models/user.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class UserModel extends Model {
    @belongsTo('profile') profile;
  }
  ```

  ```app/models/profile.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class ProfileModel extends Model {
    @belongsTo('user') user;
  }
  ```

  #### One-To-Many

  To declare a one-to-many relationship between two models, use
  `belongsTo` in combination with `hasMany`, like this:

  ```app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany('comment', { async: false, inverse: 'post' }) comments;
  }
  ```

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post', { async: false, inverse: 'comments' }) post;
  }
  ```

  #### Sync relationships

  EmberData resolves sync relationships with the related resources
  available in its local store, hence it is expected these resources
  to be loaded before or along-side the primary resource.

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post', {
      async: false,
      inverse: null
    })
    post;
  }
  ```

  In contrast to async relationship, accessing a sync relationship
  will always return the record (Model instance) for the existing
  local resource, or null. But it will error on access when
  a related resource is known to exist and it has not been loaded.

  ```
  let post = comment.post;
  ```

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
  options: RelationshipOptions<T, false>
): BelongsToDecorator<T>;
export function belongsTo<K extends Promise<unknown>, T extends Awaited<K> = Awaited<K>>(
  type: TypeFromInstance<NoNull<T>>,
  options: RelationshipOptions<T, true>
): BelongsToDecorator<K>;
export function belongsTo(type: string, options: RelationshipOptions<unknown, boolean>): BelongsToDecorator<unknown>;
export function belongsTo<T>(
  type?: TypeFromInstance<NoNull<T>>,
  options?: RelationshipOptions<T, boolean>
): BelongsToDecorator<T> | BelongsToDecoratorObject<T> {
  if (DEBUG) {
    assert(
      `belongsTo must be invoked with a type and options. Did you mean \`@belongsTo(${type}, { async: false, inverse: null })\`?`,
      !isElementDescriptor(arguments as unknown as unknown[])
    );
  }
  return _belongsTo(type!, options!);
}
