require("ember-data/system/model/model");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, setProperties = Ember.setProperties;

function asyncHasMany(type, options, meta) {
  return Ember.computed(function(key, value) {
    var relationship = this._relationships[key],
        promiseLabel = "DS: Async hasMany " + this + " : " + key;

    if (!relationship) {
      var resolver = Ember.RSVP.defer(promiseLabel);
      relationship = buildRelationship(this, key, options, function(store, data) {
        var link = data.links && data.links[key];
        var rel;
        if (link) {
          rel = store.findHasMany(this, link, meta, resolver);
        } else {
          rel = store.findMany(this, data[key], meta.type, resolver);
        }
        // cache the promise so we can use it
        // when we come back and don't need to rebuild
        // the relationship.
        set(rel, 'promise', resolver.promise);
        return rel;
      });
    }

    var promise = relationship.get('promise').then(function() {
      return relationship;
    }, null, "DS: Async hasMany records received");

    return DS.PromiseArray.create({ promise: promise });
  }).property('data').meta(meta);
}

function buildRelationship(record, key, options, callback) {
  var rels = record._relationships;

  if (rels[key]) { return rels[key]; }

  var data = get(record, 'data'),
      store = get(record, 'store');

  var relationship = rels[key] = callback.call(record, store, data);

  return setProperties(relationship, {
    owner: record, name: key, isPolymorphic: options.polymorphic
  });
}

function hasRelationship(type, options) {
  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'hasMany' };

  if (options.async) {
    return asyncHasMany(type, options, meta);
  }

  return Ember.computed(function(key, value) {
    return buildRelationship(this, key, options, function(store, data) {
      var records = data[key];
      Ember.assert("You looked up the '" + key + "' relationship on '" + this + "' but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", Ember.A(records).everyProperty('isEmpty', false));
      return store.findMany(this, data[key], meta.type);
    });
  }).property('data').meta(meta);
}

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
  return hasRelationship(type, options);
};
