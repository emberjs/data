import { Model } from 'ember-data/system/model';


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

  @namespace
  @method belongsTo
  @for DS
  @param {String or DS.Model} type the model type of the relationship
  @param {Object} options a hash of options
  @return {Ember.computed} relationship
*/
function belongsTo(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    Ember.assert("The first argument to DS.belongsTo must be a string representing a model type key, e.g. use DS.belongsTo('person') to define a relation to the App.Person model", !!type && (typeof type === 'string' || Model.detect(type)));
  }

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
      this._relationships[key].setRecord(value);
    }

    return this._relationships[key].getRecord();
  }).meta(meta);
}

/**
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.

  @class Model
  @namespace DS
*/
Model.reopen({
  notifyBelongsToAdded: function(key, relationship) {
    this.notifyPropertyChange(key);
  },

  notifyBelongsToRemoved: function(key) {
    this.notifyPropertyChange(key);
  }
});

export default belongsTo;
