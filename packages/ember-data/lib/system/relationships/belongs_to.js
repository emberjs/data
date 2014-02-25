var get = Ember.get, set = Ember.set,
    isNone = Ember.isNone;

/**
  @module ember-data
*/

/**
  `DS.belongsTo` is used to define One-To-One and One-To-Many
  relationships on a [DS.Model](DS.Model.html).


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
DS.belongsTo = function(type, options) {
  var meta = {
    isRelationship: true,
    type: type,
    kind: 'belongsTo',
    options: options || {}
  };

  return Ember.computed(function(key, value) {
    if (arguments.length>1) {
      //TODO(Igor) bring back the assert
      //Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof typeClass);
      return value === undefined ? null : value;
    }

    if (this._relationships[key]) {
      return this._relationships[key].hasManyRecord;
    }

    return null;
  }).meta(meta);
};

DS.Model.reopen({
  notifyBelongsToAdded: function(key, record, relationship) {
    this._relationships[key] = relationship;
    this.notifyPropertyChange(key);
  },

  notifyBelongsToRemoved: function(key, record) {
    this._relationships[key] = null;
    this.notifyPropertyChange(key);
  }
});
