import Ember from 'ember';
import { assert, warn } from "ember-data/-private/debug";
import normalizeModelName from "ember-data/-private/system/normalize-model-name";

/**
  `DS.belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).


  `DS.belongsTo` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a
    related model in a One-To-Many relationship. See [Explicit Inverses](#toc_explicit-inverses)

  #### One-To-One
  To declare a one-to-one relationship between two models, use
  `DS.belongsTo`:

  ```app/models/user.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    profile: DS.belongsTo('profile')
  });
  ```

  ```app/models/profile.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    user: DS.belongsTo('user')
  });
  ```

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment')
  });
  ```

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the key name.

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo()
  });
  ```

  will lookup for a Post type.

  @namespace
  @method belongsTo
  @for DS
  @param {String} modelName (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
export default function belongsTo(modelName, options) {
  var opts, userEnteredModelName;
  if (typeof modelName === 'object') {
    opts = modelName;
    userEnteredModelName = undefined;
  } else {
    opts = options;
    userEnteredModelName = modelName;
  }

  if (typeof userEnteredModelName === 'string') {
    userEnteredModelName = normalizeModelName(userEnteredModelName);
  }

  assert("The first argument to DS.belongsTo must be a string representing a model type key, not an instance of " + Ember.inspect(userEnteredModelName) + ". E.g., to define a relation to the Person model, use DS.belongsTo('person')", typeof userEnteredModelName === 'string' || typeof userEnteredModelName === 'undefined');

  opts = opts || {};

  var meta = {
    type: userEnteredModelName,
    isRelationship: true,
    options: opts,
    kind: 'belongsTo',
    key: null
  };

  return Ember.computed({
    get(key) {
      if (opts.hasOwnProperty('serialize')) {
        warn(`You provided a serialize option on the "${key}" property in the "${this._internalModel.modelName}" class, this belongs in the serializer. See DS.Serializer and it's implementations http://emberjs.com/api/data/classes/DS.Serializer.html`, false, {
          id: 'ds.model.serialize-option-in-belongs-to'
        });
      }

      if (opts.hasOwnProperty('embedded')) {
        warn(`You provided an embedded option on the "${key}" property in the "${this._internalModel.modelName}" class, this belongs in the serializer. See DS.EmbeddedRecordsMixin http://emberjs.com/api/data/classes/DS.EmbeddedRecordsMixin.html`, false, {
          id: 'ds.model.embedded-option-in-belongs-to'
        });
      }

      return this._internalModel._relationships.get(key).getRecord();
    },
    set(key, value) {
      if (value === undefined) {
        value = null;
      }
      if (value && value.then) {
        this._internalModel._relationships.get(key).setRecordPromise(value);
      } else if (value) {
        this._internalModel._relationships.get(key).setRecord(value._internalModel);
      } else {
        this._internalModel._relationships.get(key).setRecord(value);
      }

      return this._internalModel._relationships.get(key).getRecord();
    }
  }).meta(meta);
}

/*
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.
*/
export const BelongsToMixin = Ember.Mixin.create({
  notifyBelongsToChanged(key) {
    this.notifyPropertyChange(key);
  }
});
