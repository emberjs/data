var get = Ember.get, set = Ember.set, forEach = Ember.ArrayPolyfills.forEach;

require("ember-data/system/model/model");

var hasRelationship = function(type, options) {
  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'hasMany' };

  return Ember.computed(function(key, value) {
    var data = get(this, 'data').hasMany,
        store = get(this, 'store'),
        ids, relationship;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(Ember.lookup, type);
    }

    //ids can be references or opaque token
    //(e.g. `{url: '/relationship'}`) that will be passed to the adapter
    ids = data[key];

    relationship = store.findMany(type, ids, this, meta);
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
  var store = get(record, 'store'),
      data = get(record, 'data').hasMany;

  var references = data[relationship.key];

  if (!references) { return; }

  var inverseName = record.constructor.inverseFor(relationship.key).name;


  forEach.call(references, function(reference) {
    var childRecord;

    if (childRecord = reference.record) {
      record.suspendRelationshipObservers(function() {
        set(childRecord, inverseName, null);
      });
    }
  });
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
