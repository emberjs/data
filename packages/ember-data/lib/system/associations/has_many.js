var get = Ember.get, set = Ember.set;

require("ember-data/system/model/model");

var hasAssociation = function(type, options) {
  options = options || {};

  var meta = { type: type, isAssociation: true, options: options, kind: 'hasMany' };

  return Ember.computed(function(key, value) {
    var data = get(this, 'data').hasMany,
        store = get(this, 'store'),
        ids, association;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(window, type);
    }

    ids = data[key];
    association = store.findMany(type, ids || [], this, meta);
    set(association, 'owner', this);
    set(association, 'name', key);

    return association;
  }).property().meta(meta);
};

DS.hasMany = function(type, options) {
  Ember.assert("The type passed to DS.hasMany must be defined", !!type);
  return hasAssociation(type, options);
};
