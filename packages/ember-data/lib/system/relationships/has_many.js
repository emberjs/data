require("ember-data/system/model/model");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, setProperties = Ember.setProperties;

function asyncHasMany(type, options, meta) {
  return Ember.computed(function(key, value) {
    if (this._relationships[key]) { return this._relationships[key]; }

    var resolver = Ember.RSVP.defer();

    var relationship = buildRelationship(this, key, options, function(store, data) {
      var link = data.links && data.links[key];

      if (link) {
        return store.findHasMany(this, link, meta, resolver);
      } else {
        return store.findMany(this, data[key], meta.type, resolver);
      }
    });

    var promise = resolver.promise.then(function() {
      return relationship;
    });

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
