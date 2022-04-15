import { assert, inspect, warn } from '@ember/debug';
import { computed } from '@ember/object';
import { DEBUG } from '@glimmer/env';

import { computedMacroWithOptionalParams } from './util';

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
    @hasMany('comment') comments;
  }
  ```

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post') post;
  }
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the key name.

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo post;
  }
  ```

  will lookup for a Post type.

  #### Sync relationships

  Ember Data resolves sync relationships with the related resources
  available in its local store, hence it is expected these resources
  to be loaded before or along-side the primary resource.

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post', {
      async: false
    })
    post;
  }
  ```

  In contrast to async relationship, accessing a sync relationship
  will always return the record (Model instance) for the existing
  local resource, or null. But it will error on access when
  a related resource is known to exist and it has not been loaded.

  ```
  let post = comment.get('post');

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
  let opts, userEnteredModelName;
  if (typeof modelName === 'object') {
    opts = modelName;
    userEnteredModelName = undefined;
  } else {
    opts = options;
    userEnteredModelName = modelName;
  }

  assert(
    'The first argument to belongsTo must be a string representing a model type key, not an instance of ' +
      inspect(userEnteredModelName) +
      ". E.g., to define a relation to the Person model, use belongsTo('person')",
    typeof userEnteredModelName === 'string' || typeof userEnteredModelName === 'undefined'
  );

  opts = opts || {};
  if (!('async' in opts)) {
    opts.async = true;
  }

  let meta = {
    type: userEnteredModelName,
    isRelationship: true,
    options: opts,
    kind: 'belongsTo',
    name: 'Belongs To',
    key: null,
  };

  return computed({
    get(key) {
      if (DEBUG) {
        if (['_internalModel', 'recordData', 'currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${this.constructor.toString()}`
          );
        }
        if (Object.prototype.hasOwnProperty.call(opts, 'serialize')) {
          warn(
            `You provided a serialize option on the "${key}" property in the "${this._internalModel.modelName}" class, this belongs in the serializer. See Serializer and it's implementations https://api.emberjs.com/ember-data/release/classes/Serializer`,
            false,
            {
              id: 'ds.model.serialize-option-in-belongs-to',
            }
          );
        }

        if (Object.prototype.hasOwnProperty.call(opts, 'embedded')) {
          warn(
            `You provided an embedded option on the "${key}" property in the "${this._internalModel.modelName}" class, this belongs in the serializer. See EmbeddedRecordsMixin https://api.emberjs.com/ember-data/release/classes/EmbeddedRecordsMixin`,
            false,
            {
              id: 'ds.model.embedded-option-in-belongs-to',
            }
          );
        }
      }

      return this._internalModel.getBelongsTo(key);
    },
    set(key, value) {
      if (DEBUG) {
        if (['_internalModel', 'recordData', 'currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your belongsTo on ${this.constructor.toString()}`
          );
        }
      }
      this.store._backburner.join(() => {
        this._internalModel.setDirtyBelongsTo(key, value);
      });

      return this._internalModel.getBelongsTo(key);
    },
  }).meta(meta);
}

export default computedMacroWithOptionalParams(belongsTo);
