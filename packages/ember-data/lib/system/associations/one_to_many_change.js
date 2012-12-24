var get = Ember.get, set = Ember.set;

DS.OneToManyChange = DS.RelationshipChange.extend({
  hasManyNameBinding: 'hasOneOrManyName',

  /** @private */
  addChildToParent: function(parent) {
    var hasManyName = get(this, 'hasManyName'),
        child = this.getChild();

    // Use the idempotent `addObject` to ensure that the record
    // is in its ManyArray. The `addObject` method only has an
    // effect if the change happened from the belongsTo side.
    get(parent, hasManyName).addObject(child);
  },

  /** @private */
  removeChildFromParent: function(parent) {
    var hasManyName = get(this, 'hasManyName'),
        child = this.getChild();

    // If there is an `oldParent` and the `oldParent` is different from
    // the `newParent`, use the idempotent `removeObject` to ensure
    // that the record is no longer in its ManyArray. The `removeObject`
    // method only has an effect if:
    //
    // 1. The change happened from the belongsTo side
    // 2. The record was moved to a new parent without explicitly
    //    removing it from the old parent first.
    parent.suspendAssociationObservers(function() {
      get(parent, hasManyName).removeObject(child);
    });
  },

  /** @private */
  parentDidChange: function(dirtySet, parent) {
    this.store.recordHasManyDidChange(dirtySet, parent, this);
  }
});
