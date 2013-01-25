var get = Ember.get, set = Ember.set;

require("ember-data/system/model/model");

var map = Ember.EnumerableUtils.map;

var hasRelationship = function(type, options) {
  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'hasMany' };

  return Ember.computed(function(key, value) {
    var data = get(this, 'data').hasMany,
        store = get(this, 'store'),
        ids, relationship, references;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(Ember.lookup, type);
    }

    ids = data[key] || [];

    if (Ember.isArray(ids)) {
      // Coerce id-type tuples into Record Reference
      references = map(ids, function(id) {
        if (typeof id === 'object' && !id.clientId) {
          return store.referenceForId(id.type, id.id);
        }

        return id;
      }, this);
    } else {
      // custom, opaque token (e.g. `{url: '/relationship'}`) that will be passed to the adapter
      references = ids;
    }

    relationship = store.findMany(type, references, this, meta);
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
