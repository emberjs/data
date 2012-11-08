var get = Ember.get, set = Ember.set;

DS.hasOne = function(type, options) {
  Ember.assert("The type passed to DS.hasOne must be defined", !!type);

  options = options || {};

  var meta = { type: type, isAssociation: true, options: options, kind: 'hasOne' };

  return Ember.computed(function(key, value) {
    if (arguments.length === 2) {
      return value === undefined ? null : value;
    }

    var data = get(this, 'data').hasOne,
      store = get(this, 'store'), id;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(window, type);
    }

    id = data[key];
    return id ? store.find(type, id) : null;
  }).property('data').meta(meta);
};

DS.Model.reopen({
  /** @private */
  init: function() {
    this._super.apply(this, arguments);
    this._hasOneChangesToSync = Ember.OrderedSet.create();
  },

  /** @private */
  hasOneWillChange: Ember.beforeObserver(function(record, key) {
    var child = get(record, key), childId, store, change;
    // if the record is the old parent (and is loaded)
    if (child && get(record, 'isLoaded')) {
      childId = get(child, 'clientId');
      store = get(child, 'store');

      change = DS.RelationshipChange.findOrCreate(childId, store, {
        parentType: record.constructor,
        hasOneName: key,
        oldParent: get(record, 'clientId')
      });
      set(change, 'newParent', null);

      this._hasOneChangesToSync.add(change);
    }
  }),

  /** @private */
  hasOneDidChange: Ember.immediateObserver(function(record, key) {
    var child = get(record, key), childId, store, change;

    // if the record is the new parent (and is loaded)

    if (child && get(record, 'isLoaded')) {
      childId = get(child, 'clientId');
      store = get(child, 'store');

      change = DS.RelationshipChange.findOrCreate(childId, store, {
        parentType: record.constructor,
        hasOneName: key
      });
      set(change, 'newParent', get(record, 'clientId'));

      this._hasOneChangesToSync.add(change);
    }

    this._hasOneChangesToSync.forEach(function(change) {
      change.sync();
    });
    this._hasOneChangesToSync.clear();
  })
});
