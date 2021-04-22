import { makeDecorator } from './util';
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

export default makeDecorator('belongsTo', {
  getter(key) {
    return function() {
      return this._internalModel.getBelongsTo(key);
    };
  },
  setter(key) {
    return function(value) {
      this._internalModel.setDirtyBelongsTo(key, value);
    };
  },
});
