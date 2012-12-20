var get = Ember.get, set = Ember.set,
    none = Ember.isNone;

DS.belongsTo = function(type, options) {
  Ember.assert("The first argument DS.belongsTo must be a model type or string, like DS.belongsTo(App.Person)", !!type && (typeof type === 'string' || DS.Model.detect(type)));

  options = options || {};

  var meta = { type: type, isAssociation: true, options: options, kind: 'belongsTo' };

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
    return id ? store.find(type, id) : null;
  }).property('data').meta(meta);
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
    if (get(record, 'isLoaded')) {
      var oldParent = get(record, key);

      var childId = get(record, 'clientId'),
          store = get(record, 'store');
      if (oldParent){
        var change = DS.OneToManyChange.createChange(childId, store, { belongsToName: key, parentClientId: get(oldParent,'clientId'), changeType: "remove" });
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
        var childId = get(record, 'clientId'),
            store = get(record, 'store');
        var change = DS.OneToManyChange.createChange(childId, store, { belongsToName: key, parentClientId: get(newParent, 'clientId'), changeType: "add" });
        change.sync();
        if(this._changesToSync[key]){
          DS.OneToManyChange.ensureSameTransaction([change, this._changesToSync[key]], store);
        }
      }
    }
    delete this._changesToSync[key];
  })
});
