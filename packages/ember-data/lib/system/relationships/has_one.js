var get = Ember.get, set = Ember.set,
  none = Ember.isNone;

DS.hasOne = function(type, options) {
  Ember.assert("The first argument DS.hasOne must be a model type or string, like DS.hasOne(App.Person)", !!type && (typeof type === 'string' || DS.Model.detect(type)));

  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'hasOne' };

  return Ember.computed(function(key, value) {
    if (arguments.length === 2) {
      return value === undefined ? null : value;
    }

    var data = get(this, 'data').hasOne,
      store = get(this, 'store'), id;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(Ember.lookup, type);
    }

    id = data[key];

    if (!id) {
      return null;
    } else if (typeof id === 'object') {
      return store.recordForReference(id);
    } else {
      return store.find(type, id);
    }
  }).property('data').meta(meta);
};

/**
 These observers observe all `hasOne` relationships on the record. See
 `relationships/ext` to see how these observers get their dependencies.

 */

DS.Model.reopen({
  /** @private */
  hasOneWillChange: Ember.beforeObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var oldChild = get(record, key),
          parentReference = get(record, '_reference'),
          store = get(record, 'store');

      if (oldChild) {
        var change = DS.RelationshipChange.createChange(parentReference, get(oldChild, '_reference'), store, { key: key, kind: "hasOne", changeType: "remove" });
        change.sync();

        this._changesToSync[key] = change;
      }
    }
  }),

  /** @private */
  hasOneDidChange: Ember.immediateObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var newChild = get(record, key);

      if (newChild) {
        var parentReference = get(record, '_reference'),
            store = get(record, 'store');

        var change = DS.RelationshipChange.createChange(parentReference, get(newChild, '_reference'), store, { key: key, kind: "hasOne", changeType: "add" });
        change.sync();

        if (this._changesToSync[key]) {
          DS.OneToManyChange.ensureSameTransaction([change, this._changesToSync[key]], store);
        }
      }
    }
    delete this._changesToSync[key];
  })
});
