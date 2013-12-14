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

DS.hasMany = function(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  }
  return hasRelationship(type, options);
};
