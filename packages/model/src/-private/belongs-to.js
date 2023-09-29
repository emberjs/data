import { assert, warn } from '@ember/debug';
import { computed } from '@ember/object';

import { DEBUG } from '@ember-data/env';

import { lookupLegacySupport } from './model';
import { computedMacroWithOptionalParams, normalizeModelName } from './util';

/**
  @module @ember-data/model
*/

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

  Ember Data resolves sync relationships with the related resources
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
  @param {String} modelName (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
function belongsTo(modelName, options) {
  let opts = options;
  let userEnteredModelName = modelName;

  assert(
    `Expected options.async from @belongsTo('${userEnteredModelName}', options) to be a boolean`,
    opts && typeof opts.async === 'boolean'
  );
  assert(
    `Expected options.inverse from @belongsTo('${userEnteredModelName}', options) to be either null or the string type of the related resource.`,
    opts.inverse === null || (typeof opts.inverse === 'string' && opts.inverse.length > 0)
  );

  let meta = {
    type: normalizeModelName(userEnteredModelName),
    isRelationship: true,
    options: opts,
    kind: 'belongsTo',
    name: '<Unknown BelongsTo>',
    key: null,
  };

  return computed({
    get(key) {
      // this is a legacy behavior we may not carry into a new model setup
      // it's better to error on disconnected records so users find errors
      // in their logic.
      if (this.isDestroying || this.isDestroyed) {
        return null;
      }
      const support = lookupLegacySupport(this);

      if (DEBUG) {
        if (['currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${this.constructor.toString()}`
          );
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'serialize')) {
          warn(
            `You provided a serialize option on the "${key}" property in the "${support.identifier.type}" class, this belongs in the serializer. See Serializer and it's implementations https://api.emberjs.com/ember-data/release/classes/Serializer`,
            false,
            {
              id: 'ds.model.serialize-option-in-belongs-to',
            }
          );
        }

        if (Object.prototype.hasOwnProperty.call(opts, 'embedded')) {
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
    set(key, value) {
      const support = lookupLegacySupport(this);
      if (DEBUG) {
        if (['currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${this.constructor.toString()}`
          );
        }
      }
      this.store._join(() => {
        support.setDirtyBelongsTo(key, value);
      });

      return support.getBelongsTo(key);
    },
  }).meta(meta);
}

export default computedMacroWithOptionalParams(belongsTo);
