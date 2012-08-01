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

var inverseNameFor = function(record, inverseType) {
  var associationMap = get(record.constructor, 'associations'),
      possibleAssociations = associationMap.get(inverseType),
      possible, actual, oldValue;

  if (!possibleAssociations) { return; }

  for (var i = 0, l = possibleAssociations.length; i < l; i++) {
    possible = possibleAssociations[i];

    if (possible.kind === 'hasMany') {
      actual = possible;
      break;
    }
  }

  if (actual) { return actual.name; }
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
    var oldParent = get(record, key);
    if (oldParent) {
      var inverseName = inverseNameFor(oldParent, record.constructor),
          inverseHasMany = get(oldParent, inverseName);

      inverseHasMany.removeFromContent(record);
    }
  }),

  /** @private */
  belongsToDidChange: Ember.immediateObserver(function(record, key) {
    var newParent = get(record, key);
    if (newParent) {
      var inverseName = inverseNameFor(newParent, record.constructor),
          inverseHasMany = get(newParent, inverseName);

      inverseHasMany.addToContent(record);
    }
  })
});
