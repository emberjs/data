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
    if (!record._relationshipLinks[key]) {
      record._relationshipLinks[key] = DS.OneToManyLink.create({
        oldParent: get(record, key),
        belongsToName: key,
        child: record
      });
    }
  }),

  /** @private */
  belongsToDidChange: Ember.immediateObserver(function(record, key) {
    var link = record._relationshipLinks[key],
        newParent = get(record, key);

    link.newParent = newParent;
    link.sync();
  }),

  destroyChildLink: function(key) {
    delete this._relationshipLinks[key];
  },

  destroyParentLink: function(key, child) {
    this._relationshipLinks[key].remove(child);
  }
});
