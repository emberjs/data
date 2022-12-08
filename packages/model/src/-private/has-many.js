/**
  @module @ember-data/model
*/
import { A } from '@ember/array';
import { assert, deprecate, inspect } from '@ember/debug';
import { computed } from '@ember/object';
import { dasherize } from '@ember/string';
import { DEBUG } from '@glimmer/env';

import { singularize } from 'ember-inflector';

import {
  DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC,
  DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE,
  DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE,
} from '@ember-data/private-build-infra/deprecations';

import { lookupLegacySupport } from './model';
import { computedMacroWithOptionalParams } from './util';

function normalizeType(type) {
  if (DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE) {
    if (!type) {
      return;
    }
  }

  return singularize(dasherize(type));
}

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
  import Model, { hasMany } from '@ember-data/model';

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
  post.comments.forEach((comment) => {

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
function hasMany(type, options) {
  if (DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE) {
    if (typeof type !== 'string' || !type.length) {
      deprecate(
        'hasMany(<type>, <options>) must specify the string type of the related resource as the first parameter',
        false,
        {
          id: 'ember-data:deprecate-non-strict-relationships',
          for: 'ember-data',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
        }
      );
      if (typeof type === 'object') {
        options = type;
        type = undefined;
      }

      assert(
        `The first argument to hasMany must be a string representing a model type key, not an instance of ${inspect(
          type
        )}. E.g., to define a relation to the Comment model, use hasMany('comment')`,
        typeof type === 'string' || typeof type === 'undefined'
      );
    }
  }

  if (DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC) {
    if (!options || typeof options.async !== 'boolean') {
      options = options || {};
      if (!('async' in options)) {
        options.async = true;
      }
      deprecate('hasMany(<type>, <options>) must specify options.async as either `true` or `false`.', false, {
        id: 'ember-data:deprecate-non-strict-relationships',
        for: 'ember-data',
        until: '5.0',
        since: { enabled: '4.7', available: '4.7' },
      });
    } else {
      assert(`Expected hasMany options.async to be a boolean`, options && typeof options.async === 'boolean');
    }
  } else {
    assert(`Expected hasMany options.async to be a boolean`, options && typeof options.async === 'boolean');
  }

  if (DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE) {
    if (options.inverse !== null && (typeof options.inverse !== 'string' || options.inverse.length === 0)) {
      deprecate(
        'hasMany(<type>, <options>) must specify options.inverse as either `null` or the name of the field on the related resource type.',
        false,
        {
          id: 'ember-data:deprecate-non-strict-relationships',
          for: 'ember-data',
          until: '5.0',
          since: { enabled: '4.7', available: '4.7' },
        }
      );
    }
  }

  // Metadata about relationships is stored on the meta of
  // the relationship. This is used for introspection and
  // serialization. Note that `key` is populated lazily
  // the first time the CP is called.
  let meta = {
    type: normalizeType(type),
    options,
    isRelationship: true,
    kind: 'hasMany',
    name: 'Has Many',
    key: null,
  };

  return computed({
    get(key) {
      if (DEBUG) {
        if (['currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your hasMany on ${this.constructor.toString()}`
          );
        }
      }
      if (this.isDestroying || this.isDestroyed) {
        return A();
      }
      return lookupLegacySupport(this).getHasMany(key);
    },
    set(key, records) {
      if (DEBUG) {
        if (['currentState'].indexOf(key) !== -1) {
          throw new Error(
            `'${key}' is a reserved property name on instances of classes extending Model. Please choose a different property name for your hasMany on ${this.constructor.toString()}`
          );
        }
      }
      const support = lookupLegacySupport(this);
      const manyArray = support.getManyArray(key);
      assert(`You must pass an array of records to set a hasMany relationship`, Array.isArray(records));
      this.store._join(() => {
        manyArray.splice(0, manyArray.length, ...records);
      });

      return support.getHasMany(key);
    },
  }).meta(meta);
}

export default computedMacroWithOptionalParams(hasMany);
