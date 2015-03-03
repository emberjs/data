import Model from 'ember-data/system/model';

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

  ```javascript
  App.User = DS.Model.extend({
    profile: DS.belongsTo('profile')
  });

  App.Profile = DS.Model.extend({
    user: DS.belongsTo('user')
  });
  ```

  #### One-To-Many
  To declare a one-to-many relationship between two models, use
  `DS.belongsTo` in combination with `DS.hasMany`, like this:

  ```javascript
  App.Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  App.Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  You can avoid passing a string as the first parameter. In that case Ember Data
  will infer the type from the key name.

  ```javascript
  App.Comment = DS.Model.extend({
    post: DS.belongsTo()
  });
  ```

  will lookup for a Post type.

  @namespace
  @method belongsTo
  @for DS
  @param {String} type (optional) type of the relationship
  @param {Object} options (optional) a hash of options
  @return {Ember.computed} relationship
*/
function belongsTo(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }

  Ember.assert("The first argument to DS.belongsTo must be a string representing a model type key, not an instance of " + Ember.inspect(type) + ". E.g., to define a relation to the Person model, use DS.belongsTo('person')", typeof type === 'string' || typeof type === 'undefined');

  options = options || {};

  var meta = {
    type: type,
    isRelationship: true,
    options: options,
    kind: 'belongsTo',
    key: null
  };

  return Ember.computed(function(key, value) {
    if (arguments.length>1) {
      if ( value === undefined ) {
        value = null;
      }
      if (value && value.then) {
        this._relationships[key].setRecordPromise(value);
      } else {
        this._relationships[key].setRecord(value);
      }
    }

    return this._relationships[key].getRecord();
  }).meta(meta);
}

/*
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.
*/
Model.reopen({
  notifyBelongsToChanged: function(key) {
    this.notifyPropertyChange(key);
  }
});

export default belongsTo;
