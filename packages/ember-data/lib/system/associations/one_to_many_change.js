var get = Ember.get, set = Ember.set;

DS.OneToManyChange = function(options) {
  this.oldParent = options.oldParent;
  this.child = options.child;
  this.belongsToName = options.belongsToName;
  this.store = options.store;
  this.committed = {};
  this.awaiting = 0;
};

/** @private */
DS.OneToManyChange.create = function(options) {
  return new DS.OneToManyChange(options);
};

/** @private */
DS.OneToManyChange.forChildAndParent = function(childClientId, store, options) {
  var childType = store.typeForClientId(childClientId), key;

  if (options.parentType) {
    key = inverseBelongsToForHasMany(options.parentType, childType, options.hasManyName);
  } else {
    key = options.belongsToName;
  }

  var change = store.relationshipChangeFor(childClientId, key);

  if (!change) {
    change = DS.OneToManyChange.create({
      child: childClientId,
      store: store
    });

    store.addRelationshipChangeFor(childClientId, key, change);
  }

  change.belongsToName = key;

  return change;
};

DS.OneToManyChange.prototype = {
  /**
    Get the child type and ID, if available.

    @returns {Array} an array of type and ID
  */
  getChildTypeAndId: function() {
    return this.getTypeAndIdFor(this.child);
  },

  /**
    Get the old parent type and ID, if available.

    @returns {Array} an array of type and ID
  */
  getOldParentTypeAndId: function() {
    return this.getTypeAndIdFor(this.oldParent);
  },

  /**
    Get the new parent type and ID, if available.

    @returns {Array} an array of type and ID
  */
  getNewParentTypeAndId: function() {
    return this.getTypeAndIdFor(this.newParent);
  },

  /**
    Get the name of the relationship on the hasMany side.

    @returns {String}
  */
  getHasManyName: function() {
    var name = this.hasManyName, store = this.store, parent;

    if (!name) {
      parent = this.oldParent || this.newParent;
      if (!parent) { return; }

      var childType = store.typeForClientId(this.child);
      var inverseType = DS.inverseTypeFor(childType, this.belongsToName);
      name = DS.inverseNameFor(inverseType, childType, 'hasMany');
      this.hasManyName = name;
    }

    return name;
  },

  /**
    Get the name of the relationship on the belongsTo side.

    @returns {String}
  */
  getBelongsToName: function() {
    var name = this.belongsToName, store = this.store, parent;

    if (!name) {
      parent = this.oldParent || this.newParent;
      if (!parent) { return; }

      var childType = store.typeForClientId(this.child);
      var parentType = store.typeForClientId(parent);
      name = DS.inverseNameFor(childType, parentType, 'belongsTo', this.hasManyName);

      this.belongsToName = name;
    }

    return name;
  },

  /** @private */
  getTypeAndIdFor: function(clientId) {
    if (clientId) {
      var store = this.store;

      return [
        store.typeForClientId(clientId),
        store.idForClientId(clientId)
      ];
    }
  },

  /** @private */
  destroy: function() {
    var childClientId = this.child,
        belongsToName = this.getBelongsToName(),
        hasManyName = this.getHasManyName(),
        store = this.store,
        child, oldParent, newParent, transaction;

    store.removeRelationshipChangeFor(childClientId, belongsToName);

    if (child = this.getChild()) {
      child.removeDirtyFactor(belongsToName);
    }

    if (oldParent = this.getOldParent()) {
      oldParent.removeDirtyFactor(hasManyName);
    }

    if (newParent = this.getNewParent()) {
      newParent.removeDirtyFactor(hasManyName);
    }

    if (transaction = this.transaction) {
      transaction.relationshipBecameClean(this);
    }
  },

  /** @private */
  getByClientId: function(clientId) {
    var store = this.store;

    // return null or undefined if the original clientId was null or undefined
    if (!clientId) { return clientId; }

    if (store.recordIsMaterialized(clientId)) {
      return store.findByClientId(null, clientId);
    }
  },

  /** @private */
  getChild: function() {
    return this.getByClientId(this.child);
  },

  /** @private */
  getOldParent: function() {
    return this.getByClientId(this.oldParent);
  },

  /** @private */
  getNewParent: function() {
    return this.getByClientId(this.newParent);
  },

  /** @private */
  getLastParent: function() {
    return this.getByClientId(this.lastParent);
  },

  /**
    @private

    Make sure that all three parts of the relationship change are part of
    the same transaction. If any of the three records is clean and in the
    default transaction, and the rest are in a different transaction, move
    them all into that transaction.
  */
  ensureSameTransaction: function(child, oldParent, newParent, hasManyName, belongsToName) {
    var transactions = Ember.A();

    if (child)     { transactions.pushObject(get(child, 'transaction')); }
    if (oldParent) { transactions.pushObject(get(oldParent, 'transaction')); }
    if (newParent) { transactions.pushObject(get(newParent, 'transaction')); }

    var transaction = transactions.reduce(function(prev, t) {
      if (!get(t, 'isDefault')) {
        if (prev === null) { return t; }
        Ember.assert("All records in a changed relationship must be in the same transaction. You tried to change the relationship between records when one is in " + t + " and the other is in " + prev, t === prev);
      }

      return prev;
    }, null);

    if (transaction) {
      transaction.add(child);
      if (oldParent) { transaction.add(oldParent); }
      if (newParent) { transaction.add(newParent); }
    } else {
      transaction = transactions.objectAt(0);
    }

    this.transaction = transaction;
    return transaction;
  },

  /** @private */
  sync: function() {
    var oldParentClientId = this.oldParent,
        newParentClientId = this.newParent,
        hasManyName = this.getHasManyName(),
        belongsToName = this.getBelongsToName(),
        child = this.getChild(),
        oldParent, newParent;

    //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);

    // This code path is reached if a child record was added to a new ManyArray
    // without being removed from its old ManyArray. Below, this method will
    // ensure (via `removeObject`) that the record is no longer in the old
    // ManyArray.
    if (oldParentClientId === undefined) {
      // Since the child was added to a ManyArray, we know it was materialized.
      oldParent = get(child, belongsToName);

      if (oldParent) {
        this.oldParent = get(oldParent, 'clientId');
      } else {
        this.oldParent = null;
      }
    } else {
      oldParent = this.getOldParent();
    }

    // Coalesce changes from A to B and back to A.
    if (oldParentClientId === newParentClientId) {
      // If we have gone from oldParent to newParent and back to oldParent,
      // there must be a materialized child.

      // If our lastParent clientId is not null, there will always be a
      // materialized lastParent.
      var lastParent = this.getLastParent();
      if (lastParent) {
        get(lastParent, hasManyName).removeObject(child);
      }

      // Don't do anything if the belongsTo is going from null back to null
      if (oldParent) {
        get(oldParent, hasManyName).addObject(child);
      }

      this.destroy();
      return;
    }

    //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

    newParent = this.getNewParent();
    var transaction = this.ensureSameTransaction(child, oldParent, newParent, hasManyName, belongsToName);

    transaction.relationshipBecameDirty(this);

    // Next, make sure that all three side of the association reflect the
    // state of the OneToManyChange, while making sure to avoid an
    // infinite loop.


    // If there is an `oldParent`, use the idempotent `removeObject`
    // to ensure that the record is no longer in its ManyArray. The
    // `removeObject` method only has an effect if:
    //
    // 1. The change happened from the belongsTo side
    // 2. The record was moved to a new parent without explicitly
    //    removing it from the old parent first.
    if (oldParent) {
      get(oldParent, hasManyName).removeObject(child);

      if (get(oldParent, 'isLoaded')) {
        oldParent.addDirtyFactor(hasManyName);
      }
    }

    // If there is a `newParent`, use the idempotent `addObject`
    // to ensure that the record is in its ManyArray. The `addObject`
    // method only has an effect if the change happened from the
    // belongsTo side.
    if (newParent) {
      get(newParent, hasManyName).addObject(child);

      if (get(newParent, 'isLoaded')) {
        newParent.addDirtyFactor(hasManyName);
      }
    }

    if (child) {
      // Only set the belongsTo on the child if it is not already the
      // newParent. This happens if the change happened from the
      // ManyArray side.
      if (get(child, belongsToName) !== newParent) {
        set(child, belongsToName, newParent);
      }

      if (get(child, 'isLoaded')) {
        child.addDirtyFactor(belongsToName);
      }
    }

    // If this change is later reversed (A->B followed by B->A),
    // we will need to remove the child from this parent. Save
    // it off as `lastParent` so we can do that.
    this.lastParent = newParentClientId;
  },

  /** @private */
  adapterDidUpdate: function() {
    if (this.awaiting > 0) { return; }
    var belongsToName = this.getBelongsToName();
    var hasManyName = this.getHasManyName();
    var oldParent, newParent, child;

    if (oldParent = this.getOldParent()) { oldParent.removeInFlightDirtyFactor(hasManyName); }
    if (newParent = this.getNewParent()) { newParent.removeInFlightDirtyFactor(hasManyName); }
    if (child = this.getChild())         { child.removeInFlightDirtyFactor(belongsToName); }
    this.destroy();
  },

  wait: function() {
    this.awaiting++;
  },

  done: function() {
    this.awaiting--;

    if (this.awaiting === 0) {
      this.adapterDidUpdate();
    }
  }
};

function inverseBelongsToForHasMany(parentType, childType, hasManyName) {
  // Get the options passed to the parent's DS.hasMany()
  var options = parentType.metaForProperty(hasManyName).options;
  var belongsToName;

  if (belongsToName = options.inverse) {
    return belongsToName;
  }

  return DS.inverseNameFor(childType, parentType, 'belongsTo');
}
