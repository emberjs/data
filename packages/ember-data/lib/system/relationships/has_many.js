/**
  @module ember-data
*/

import { PromiseArray } from "ember-data/system/store";

import {
  relationshipFromMeta,
  typeForRelationshipMeta
} from "ember-data/system/relationship-meta";

var get = Ember.get;
var set = Ember.set;
var setProperties = Ember.setProperties;
var map = Ember.EnumerableUtils.map;

/**
  Returns a computed property that synchronously returns a ManyArray for
  this relationship. If not all of the records in this relationship are
  loaded, it will raise an exception.
*/

function syncHasMany(type, options, meta) {
  return Ember.computed('data', function(key) {
    return buildRelationship(this, key, options, function(store, data) {
      // Configure the metadata for the computed property to contain
      // the key.
      meta.key = key;

      var records = data[key];

      Ember.assert("You looked up the '" + key + "' relationship on '" + this + "' but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", Ember.A(records).isEvery('isEmpty', false));

      return store.findMany(this, data[key], typeForRelationshipMeta(store, meta));
    });
  }).meta(meta).readOnly();
}

/**
  Returns a computed property that itself returns a promise that resolves to a
  ManyArray.
 */

function asyncHasMany(type, options, meta) {
  return Ember.computed('data', function(key) {
    // Configure the metadata for the computed property to contain
    // the key.
    meta.key = key;

    var relationship = buildRelationship(this, key, options, function(store, data) {
      var link = data.links && data.links[key];
      var rel;
      var promiseLabel = "DS: Async hasMany " + this + " : " + key;
      var resolver = Ember.RSVP.defer(promiseLabel);

      if (link) {
        rel = store.findHasMany(this, link, relationshipFromMeta(store, meta), resolver);
      } else {

        //This is a temporary workaround for setting owner on the relationship
        //until single source of truth lands. It only works for OneToMany atm
        var records = data[key];
        var inverse = this.constructor.inverseFor(key);
        var owner = this;
        if (inverse && records) {
          if (inverse.kind === 'belongsTo'){
            map(records, function(record){
              set(record, inverse.name, owner);
            });
          }
        }

        rel = store.findMany(owner, data[key], typeForRelationshipMeta(store, meta), resolver);
      }

      // Cache the promise so we can use it when we come back and don't
      // need to rebuild the relationship.
      set(rel, 'promise', resolver.promise);

      return rel;
    });

    var promise = relationship.get('promise').then(function() {
      return relationship;
    }, null, "DS: Async hasMany records received");

    return PromiseArray.create({
      promise: promise
    });
  }).meta(meta).readOnly();
}

/*
  Builds the ManyArray for a relationship using the provided callback,
  but only if it had not been created previously. After building, it
  sets some metadata on the created ManyArray, such as the record which
  owns it and the name of the relationship.
*/
function buildRelationship(record, key, options, callback) {
  var rels = record._relationships;

  if (rels[key]) { return rels[key]; }

  var data = get(record, 'data');
  var store = get(record, 'store');

  var relationship = rels[key] = callback.call(record, store, data);

  return setProperties(relationship, {
    owner: record,
    name: key,
    isPolymorphic: options.polymorphic
  });
}

/**
  `DS.hasMany` is used to define One-To-Many and Many-To-Many
  relationships on a [DS.Model](/api/data/classes/DS.Model.html).

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
function hasMany(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }

  options = options || {};

  // Metadata about relationships is stored on the meta of
  // the relationship. This is used for introspection and
  // serialization. Note that `key` is populated lazily
  // the first time the CP is called.
  var meta = {
    type: type,
    isRelationship: true,
    options: options,
    kind: 'hasMany',
    key: null
  };

  if (options.async) {
    return asyncHasMany(type, options, meta);
  } else {
    return syncHasMany(type, options, meta);
  }
}

export default hasMany;
