import { makeDecorator } from './util';
/**
  @module @ember-data/model
*/

/**
  `hasMany` is used to define One-To-Many and Many-To-Many
  relationships on a [Model](/ember-data/release/classes/Model).

  `hasMany` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship. The default is true.
  - `inverse`: A string used to identify the inverse property on a related model.
  - `polymorphic` A boolean value to mark the relationship as polymorphic

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

  #### Many-To-Many
  To declare a many-to-many relationship between two models, use
  `hasMany`:

  ```app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany('tag') tags;
  }
  ```

  ```app/models/tag.js
  import Model, { hasMany } from '@ember-data/model';

  export default class TagModel extends Model {
    @hasMany('post') posts; 
  }
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the singularized key name.

  ```app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany tags;
  }
  ```

  will lookup for a Tag type.

  #### Explicit Inverses

  Ember Data will do its best to discover which relationships map to
  one another. In the one-to-many code above, for example, Ember Data
  can figure out that changing the `comments` relationship should update
  the `post` relationship on the inverse because post is the only
  relationship to that model.

  However, sometimes you may have multiple `belongsTo`/`hasMany` for the
  same type. You can specify which property on the related model is
  the inverse using `hasMany`'s `inverse` option:

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post') onePost;
    @belongsTo('post') twoPost
    @belongsTo('post') redPost;
    @belongsTo('post') bluePost;
  }
  ```

  ```app/models/post.js
  import Model from '@ember-data/model';
  import { hasMany } from '@ember-decorators/data';

  export default class PostModel extends Model {
    @hasMany('comment', {
      inverse: 'redPost'
    })
    comments;
  }
  ```

  You can also specify an inverse on a `belongsTo`, which works how
  you'd expect.

  #### Sync relationships

  Ember Data resolves sync relationships with the related resources
  available in its local store, hence it is expected these resources
  to be loaded before or along-side the primary resource.

  ```app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany('comment', {
      async: false
    })
    comments;
  }
  ```

  In contrast to async relationship, accessing a sync relationship
  will always return a [ManyArray](/ember-data/release/classes/ManyArray) instance
  containing the existing local resources. But it will error on access
  when any of the known related resources have not been loaded.

  ```
  post.get('comments').forEach((comment) => {

  });

  ```

  If you are using `links` with sync relationships, you have to use
  `ref.reload` to fetch the resources.

  @method hasMany
  @public
  @static
  @for @ember-data/model
  @param {String} type (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
export default makeDecorator('hasMany', {
  getter(key) {
    return function() {
      return this._internalModel.getHasMany(key);
    };
  },
  setter(key) {
    return function(records) {
      this._internalModel.setDirtyHasMany(key, records);
    };
  },
});
