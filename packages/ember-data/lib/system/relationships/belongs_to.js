var get = Ember.get, set = Ember.set,
    none = Ember.isNone;

DS.belongsTo = function(type, options) {
  Ember.assert("The first argument DS.belongsTo must be a model type or string, like DS.belongsTo(App.Person)", !!type && (typeof type === 'string' || DS.Model.detect(type)));

  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'belongsTo' };

  return Ember.computed(function(key, value) {
    if (arguments.length === 2) {
      return value === undefined ? null : value;
    }

    var data = get(this, 'data').belongsTo,
        store = get(this, 'store'), id;

    if (typeof type === 'string') {
      type = get(this, type, false) || get(Ember.lookup, type);
    }

    id = data[key];

    if(!id) {
      return null;
    } else if (typeof id === 'object') {
      return store.recordForReference(id);
    } else {
      return store.find(type, id);
    }
  }).property('data').meta(meta);
};

/**
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.

*/

DS.Model.reopen({
  /** @private */
  belongsToWillChange: Ember.beforeObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var oldParent = get(record, key);

      var childReference = get(record, '_reference'),
          store = get(record, 'store');
      if (oldParent){
        var change = DS.RelationshipChange.createChange(childReference, get(oldParent, '_reference'), store, { key: key, kind:"belongsTo", changeType: "remove" });
        change.sync();
        this._changesToSync[key] = change;
      }
    }
  }),

  /** @private */
  belongsToDidChange: Ember.immediateObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var newParent = get(record, key);
      if(newParent){
        var childReference = get(record, '_reference'),
            store = get(record, 'store');
        var change = DS.RelationshipChange.createChange(childReference, get(newParent, '_reference'), store, { key: key, kind:"belongsTo", changeType: "add" });
        change.sync();
        if(this._changesToSync[key]){
          DS.OneToManyChange.ensureSameTransaction([change, this._changesToSync[key]], store);
        }
      }
    }
    delete this._changesToSync[key];
  })
});
