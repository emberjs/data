var get = Ember.get, set = Ember.set;

DS.OneToOneChange = DS.RelationshipChange.extend({
  hasOneNameBinding: 'hasOneOrManyName',

  /** @private */
  addChildToParent: function(parent) {
    var hasOneName = get(this, 'hasOneName'),
        child = this.getChild();

    // Only set the hasOne on the parent if it isn't already
    // set to this child. This happens if the change happened
    // from the belongsTo side.
    if (get(parent, hasOneName) !== child) {
      set(parent, hasOneName, child);
    }
  },

  /** @private */
  removeChildFromParent: function(parent) {
    var hasOneName = get(this, 'hasOneName'),
        child = this.getChild();

    // Only unset the hasOne on the parent if it is set to
    // this child. This happens if the change happened from
    // the belongsTo side.
    if (get(parent, hasOneName) === child) {
      parent.suspendAssociationObservers(function() {
        set(parent, hasOneName, null);
      });
    }
  },

  /** @private */
  parentDidChange: function(dirtySet, parent) {
    this.store.recordHasOneDidChange(dirtySet, parent, this);
  }
});
