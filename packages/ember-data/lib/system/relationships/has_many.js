require("ember-data/system/model/model");

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set, setProperties = Ember.setProperties;
var forEach = Ember.EnumerableUtils.forEach;

function asyncHasMany(type, options, meta) {
  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store');

    var link = data.links && data.links[key],
        records = data[key],
        relationship;

    // a URL was specified in deserialization
    if (link) {
      relationship = this._relationships[key] = store.findHasMany(this, link, meta);
    } else {
      relationship = this._relationships[key] = store.findMany(meta.type, records);
    }

    setProperties(relationship, {
      owner: this, name: key, isPolymorphic: options.polymorphic
    });

    return this.resolveOn.call(relationship, 'didLoad');
  }).property('data').meta(meta);
}

var hasRelationship = function(type, options) {
  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'hasMany' };

  if (options.async) {
    return asyncHasMany(type, options, meta);
  }

  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'),
        ids, relationship;

    if (typeof type === 'string') {
      if (type.indexOf(".") === -1) {
        type = store.modelFor(type);
      } else {
        type = get(Ember.lookup, type);
      }
    }

    //ids can be references or opaque token
    //(e.g. `{url: '/relationship'}`) that will be passed to the adapter
    var records = data[key];

    relationship = store.findMany(meta.type, records);
    set(relationship, 'owner', this);
    set(relationship, 'name', key);
    set(relationship, 'isPolymorphic', options.polymorphic);

    return relationship;
  }).property().meta(meta);
};

DS.hasMany = function(type, options) {
  Ember.assert("The type passed to DS.hasMany must be defined", !!type);
  return hasRelationship(type, options);
};

function clearUnmaterializedHasMany(record, relationship) {
  var data = get(record, 'data');

  var references = data[relationship.key];

  if (!references) { return; }

  var inverse = record.constructor.inverseFor(relationship.key);

  if (inverse) {
    forEach(references, function(reference) {
      var childRecord;

      if (childRecord = reference.record) {
        record.suspendRelationshipObservers(function() {
          set(childRecord, inverse.name, null);
        });
      }
    });
  }
}

DS.Model.reopen({
  clearHasMany: function(relationship) {
    var hasMany = this.cacheFor(relationship.name);

    if (hasMany) {
      hasMany.clear();
    } else {
      clearUnmaterializedHasMany(this, relationship);
    }
  }
});
