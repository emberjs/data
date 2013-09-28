var get = Ember.get, set = Ember.set,
    isNone = Ember.isNone;

/**
  @module ember-data
*/

function asyncBelongsTo(type, options, meta) {
  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store');

    if (arguments.length === 2) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof store.modelFor(type));
      return value === undefined ? null : value;
    }

    var link = data.links && data.links[key],
        belongsTo = data[key];

    if(!isNone(belongsTo)) {
      var promise = store.fetchRecord(belongsTo) || Ember.RSVP.resolve(belongsTo);
      return DS.PromiseObject.create({promise: promise});
    } else if (link) {
      var resolver = Ember.RSVP.defer();
      store.findBelongsTo(this, link, meta, resolver);
      return DS.PromiseObject.create({ promise: resolver.promise });
    } else {
      return null;
    }
  }).property('data').meta(meta);
}

DS.belongsTo = function(type, options) {
  if (typeof type === 'object') {
    options = type;
    type = undefined;
  } else {
    Ember.assert("The first argument DS.belongsTo must be a model type or string, like DS.belongsTo(App.Person)", !!type && (typeof type === 'string' || DS.Model.detect(type)));
  }

  options = options || {};

  var meta = { type: type, isRelationship: true, options: options, kind: 'belongsTo' };

  if (options.async) {
    return asyncBelongsTo(type, options, meta);
  }

  return Ember.computed(function(key, value) {
    var data = get(this, 'data'),
        store = get(this, 'store'), belongsTo, typeClass;

    if (typeof type === 'string') {
      typeClass = store.modelFor(type);
    } else {
      typeClass = type;
    }

    if (arguments.length === 2) {
      Ember.assert("You can only add a '" + type + "' record to this relationship", !value || value instanceof typeClass);
      return value === undefined ? null : value;
    }

    belongsTo = data[key];

    if (isNone(belongsTo)) { return null; }

    store.fetchRecord(belongsTo);

    return belongsTo;
  }).property('data').meta(meta);
};

/*
  These observers observe all `belongsTo` relationships on the record. See
  `relationships/ext` to see how these observers get their dependencies.

  @class Model
  @namespace DS
*/
DS.Model.reopen({

  /**
    @method belongsToWillChange
    @private
    @static
    @param record
    @param key
  */
  belongsToWillChange: Ember.beforeObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var oldParent = get(record, key);

      if (oldParent) {
        var store = get(record, 'store'),
            change = DS.RelationshipChange.createChange(record, oldParent, store, { key: key, kind: "belongsTo", changeType: "remove" });

        change.sync();
        this._changesToSync[key] = change;
      }
    }
  }),

  /**
    @method belongsToDidChange
    @private
    @static
    @param record
    @param key
  */
  belongsToDidChange: Ember.immediateObserver(function(record, key) {
    if (get(record, 'isLoaded')) {
      var newParent = get(record, key);

      if (newParent) {
        var store = get(record, 'store'),
            change = DS.RelationshipChange.createChange(record, newParent, store, { key: key, kind: "belongsTo", changeType: "add" });

        change.sync();
      }
    }

    delete this._changesToSync[key];
  })
});
