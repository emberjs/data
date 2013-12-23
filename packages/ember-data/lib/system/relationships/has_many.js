require("ember-data/system/model/model");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, setProperties = Ember.setProperties;

/**
  `DS.hasMany` is used to define One-To-Many and Many-To-Many
  relationships on a [DS.Model](DS.Model.html).

  `DS.hasMany` takes an optional hash as a second parameter, currently
  supported options are:

  - `async`: A boolean value used to explicitly declare this to be an async relationship.
  - `inverse`: A string used to identify the inverse property on a related model.

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

  #### Many-To-Many
  To declare a many-to-many relationship between two models, use
  `DS.hasMany`:

  ```javascript
  App.Post = DS.Model.extend({
    tags: DS.hasMany('tag')
  });

  App.Tag = DS.Model.extend({
    posts: DS.hasMany('post')
  });
  ```

  #### Explicit Inverses

  Ember Data will do its best to discover which relationships map to
  one another. In the one-to-many code above, for example, Ember Data
  can figure out that changing the `comments` relationship should update
  the `post` relationship on the inverse because post is the only
  relationship to that model.

  However, sometimes you may have multiple `belongsTo`/`hasManys` for the
  same type. You can specify which property on the related model is
  the inverse using `DS.hasMany`'s `inverse` option:

  ```javascript
  var belongsTo = DS.belongsTo,
      hasMany = DS.hasMany;

  App.Comment = DS.Model.extend({
    onePost: belongsTo('post'),
    twoPost: belongsTo('post'),
    redPost: belongsTo('post'),
    bluePost: belongsTo('post')
  });

  App.Post = DS.Model.extend({
    comments: hasMany('comment', {
      inverse: 'redPost'
    })
  });
  ```

  You can also specify an inverse on a `belongsTo`, which works how
  you'd expect.

  @namespace
  @method hasMany
  @for DS
  @param {String or DS.Model} type the model type of the relationship
  @param {Object} options a hash of options
  @return {Ember.computed} relationship
*/
DS.hasMany = function(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }

  var meta = {
    isRelationship: true,
    type: type,
    kind: 'hasMany',
    options: options || {}
  };

  return Ember.computed(function() {
    return this.store.recordArrayManager.createManyArray(type, Ember.A());
  }).meta(meta);
};

DS.Model.reopen({
  notifyHasManyAdded: function(key, record) {
    var manyArray = get(this, key);
    manyArray.addRecord(record);
  },

  notifyHasManyRemoved: function(key, record) {
    var manyArray = get(this, key);
    manyArray.removeRecord(record);
  }
});
