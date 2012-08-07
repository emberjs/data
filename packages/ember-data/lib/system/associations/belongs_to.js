var get = Ember.get, set = Ember.set,
    none = Ember.none;

var hasAssociation = function(type, options, one) {
  options = options || {};

  var meta = { type: type, isAssociation: true, options: options, kind: 'belongsTo' };

  return Ember.computed(function(key, value) {
    if (arguments.length === 2) {
      return value === undefined ? null : value;
    }

    var data = get(this, 'data').belongsTo,
        store = get(this, 'store'), id;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(window, type);
    }

    id = data[key];
    return id ? store.find(type, id) : null;
  }).property('data').cacheable().meta(meta);
};

DS.belongsTo = function(type, options) {
  Ember.assert("The type passed to DS.belongsTo must be defined", !!type);
  return hasAssociation(type, options);
};

/**
  These observers observe all `belongsTo` relationships on the record. See
  `associations/ext` to see how these observers get their dependencies.

  The observers use `removeFromContent` and `addToContent` to avoid
  going through the public Enumerable API that would try to set the
  inverse (again) and trigger an infinite loop.
*/

DS.Model.reopen({
  /** @private */
  belongsToWillChange: Ember.beforeObserver(function(record, key) {
    if (!record.hasChildChange(key) && get(record, 'isLoaded')) {
      record.addChildChange(key, DS.OneToManyChange.create({
        oldParent: get(record, key),
        belongsToName: key,
        child: record
      }));
    }
  }),

  /** @private */
  belongsToDidChange: Ember.immediateObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var change = record.getChildChange(key),
          newParent = get(record, key);

      change.newParent = newParent;
      change.sync();
    }
  }),

  hasChildChange: function(key) {
    return key in this._relationshipChanges;
  },

  eachRelationshipChange: function(callback, binding) {
    for (var prop in this._relationshipChanges) {
      if (!this._relationshipChanges.hasOwnProperty(prop)) { continue; }
      callback.call(binding, prop, this._relationshipChanges[prop]);
    }
  },

  getChildChange: function(key) {
    return this._relationshipChanges[key];
  },

  getRelationshipChange: function(key) {
    return this._relationshipChanges[key];
  },

  addChildChange: function(key, change) {
    get(this, 'transaction').relationshipBecameDirty(change);
    this._relationshipChanges[key] = change;
  },

  destroyChildChange: function(key) {
    var change = this._relationshipChanges[key];
    get(this, 'transaction').relationshipBecameClean(change);
    delete this._relationshipChanges[key];
  },

  destroyParentChange: function(key, child) {
    this._relationshipChanges[key].remove(child);
  }
});
