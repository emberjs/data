var get = Ember.get, set = Ember.set;

DS.RelationshipChange = Ember.Object.extend();

/** @private */
DS.RelationshipChange.findOrCreate = function(childClientId, store, options) {
  var opts = optionsForChange(childClientId, store, options),
      changeType = opts[0],
      changeOptions = opts[1];

  var change = store.relationshipChangeFor(childClientId, changeOptions.belongsToName);

  if (!change) {
    change = changeType.create(changeOptions);

    store.addRelationshipChangeFor(childClientId, changeOptions.belongsToName, change);
  }

  return change;
};

DS.RelationshipChange.reopen({
  init: function() {
    this._super.apply(this, arguments);

    this.awaiting = 0;
  },

  /** @private */
  getByClientId: function(clientId) {
    var store = get(this, 'store');

    // return null or undefined if the original clientId was null or undefined
    if (!clientId) { return clientId; }

    if (store.recordIsMaterialized(clientId)) {
      return store.findByClientId(null, clientId);
    }
  },

  /** @private */
  getChild: function() {
    return this.getByClientId(get(this, 'child'));
  },

  /** @private */
  getOldParent: function() {
    return this.getByClientId(get(this, 'oldParent'));
  },

  /** @private */
  getNewParent: function() {
    return this.getByClientId(get(this, 'newParent'));
  },

  /** @private */
  getLastParent: function() {
    return this.getByClientId(get(this, 'lastParent'));
  },

  /**
    @private

    Make sure that all three parts of the relationship change are part of
    the same transaction. If any of the three records is clean and in the
    default transaction, and the rest are in a different transaction, move
    them all into that transaction.
  */
  ensureSameTransaction: function(child, oldParent, newParent, hasOneOrManyName, belongsToName) {
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

    set(this, 'transaction', transaction);
    return transaction;
  },

  /** @private */
  addChildToParent: Ember.K,

  /** @private */
  removeChildFromParent: Ember.K,

  /** @private */
  parentDidChange: Ember.K,

  sync: function() {
    var oldParentClientId = get(this, 'oldParent'),
        newParentClientId = get(this, 'newParent'),
        hasOneOrManyName = get(this, 'hasOneOrManyName'),
        belongsToName = get(this, 'belongsToName'),
        child = this.getChild(),
        oldParent = this.getOldParent(),
        newParent = this.getNewParent();

    // Coalesce changes from A to B and back to A.
    if (oldParentClientId === newParentClientId) {
      // If we have gone from oldParent to newParent and back to oldParent,
      // there must be a materialized child.

      // If our lastParent clientId is not null, there will always be a
      // materialized lastParent.
      var lastParent = this.getLastParent();
      if (lastParent) {
        this.removeChildFromParent(lastParent);
      }

      // Don't do anything if the belongsTo is going from null back to null
      if (oldParent) {
        this.addChildToParent(oldParent);
      }

      set(child, belongsToName, oldParent);

      this.destroy();
      return;
    }

    // This code path is reached if a child record was added to a new parent
    // without being removed from its old parent. Below, this method will
    // ensure that the record is no longer associated with the old parent.
    if (oldParentClientId === undefined) {
      // Since the child was added to a parent, we know it was materialized.
      oldParent = get(child, belongsToName);

      if (oldParent) {
        set(this, 'oldParent', get(oldParent, 'clientId'));
      } else {
        set(this, 'oldParent', null);
      }
    }

    var transaction = this.ensureSameTransaction(child, oldParent, newParent, hasOneOrManyName, belongsToName);

    transaction.relationshipBecameDirty(this);

    // Next, make sure that all three side of the association reflect the
    // state of the OneToManyChange, while making sure to avoid an
    // infinite loop.

    var dirtySet = new Ember.OrderedSet();

    if (oldParent && oldParent !== newParent) {
      this.removeChildFromParent(oldParent);

      // TODO: This implementation causes a race condition in key-value
      // stores. The fix involves buffering changes that happen while
      // a record is loading. A similar fix is required for other parts
      // of ember-data, and should be done as new infrastructure, not
      // a one-off hack. [tomhuda]
      if (get(oldParent, 'isLoaded')) {
        this.parentDidChange(dirtySet, oldParent);
      }
    }

    if (newParent) {
      this.addChildToParent(newParent);

      if (get(newParent, 'isLoaded')) {
        this.parentDidChange(dirtySet, newParent);
      }
    }

    if (child) {
      // Only set the belongsTo on the child if it is not already the
      // newParent. This happens if the change happened from the
      // parent side.
      if (get(child, belongsToName) !== newParent) {
        set(child, belongsToName, newParent);
      }

      this.store.recordBelongsToDidChange(dirtySet, child, this);
    }

    dirtySet.forEach(function(record) {
      record.adapterDidDirty();
    });


    // If this change is later reversed (A->B followed by B->A),
    // we will need to remove the child from this parent. Save
    // it off as `lastParent` so we can do that.
    set(this, 'lastParent', newParentClientId);
  },

  /** @private */
  adapterDidUpdate: function() {
    if (this.awaiting > 0) { return; }

    var belongsToName = get(this, 'belongsToName'),
        hasOneOrManyName = get(this, 'hasOneOrManyName'),
        oldParent, newParent, child;

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
  },

  /** @private */
  destroy: function() {
    var childClientId = get(this, 'child'),
        belongsToName = get(this, 'belongsToName'),
        hasOneOrManyNameName = get(this, 'hasOneOrManyName'),
        store = this.store,
        child, oldParent, newParent, lastParent, transaction;

    store.removeRelationshipChangeFor(childClientId, belongsToName);

    if (transaction = get(this, 'transaction')) {
      transaction.relationshipBecameClean(this);
    }
  }
});

function optionsForChange(childClientId, store, options) {
  var childType = store.typeForClientId(childClientId),
      changeType, changeOptions = {},
      belongsToName, hasOneOrManyName;

  changeOptions.child = childClientId;
  changeOptions.store = store;
  changeOptions.oldParent = options.oldParent;

  if (options.parentType) {
    if (options.hasManyName) {
      hasOneOrManyName = options.hasManyName;
      changeType = DS.OneToManyChange;
    } else if (options.hasOneName) {
      hasOneOrManyName = options.hasOneName;
      changeType = DS.OneToOneChange;
    }

    belongsToName = inverseBelongsToName(options.parentType, childType, hasOneOrManyName);
  } else if (options.belongsToName) {
    belongsToName = options.belongsToName;

    var result = inverseHasOneOrManyName(childType, belongsToName);

    hasOneOrManyName = result[0];
    changeType = result[1];
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.findOrCreate", false);
  }

  changeOptions.belongsToName = belongsToName;
  changeOptions.hasOneOrManyName = hasOneOrManyName;

  return [changeType, changeOptions];
}

function inverseBelongsToName(parentType, childType, hasOneOrManyName) {
  // Get the options passed to the parent's association constructor
  var options = get(parentType, 'associationsByName').get(hasOneOrManyName).options,
      belongsToName;

  if (belongsToName = options.inverse) {
    return belongsToName;
  }

  return DS._inverseNameFor(childType, parentType, 'belongsTo');
}

function inverseHasOneOrManyName(childType, belongsToName) {
  var hasOneOrManyName, changeType,
      belongsTo = get(childType, 'associationsByName').get(belongsToName),
      options = belongsTo.options,
      parentType = belongsTo.type;

  // use explicit inverse option, if present
  if (hasOneOrManyName = options.inverse) {
    var parentAssociationKind = DS._inverseKindFor(parentType, hasOneOrManyName);

    if (parentAssociationKind === 'hasMany') {
      changeType = DS.OneToManyChange;
    } else if (parentAssociationKind === 'hasOne') {
      changeType = DS.OneToOneChange;
    }
  }

  // otherwise, look for matching hasMany association on parent
  if (!hasOneOrManyName) {
    hasOneOrManyName = DS._inverseNameFor(parentType, childType, 'hasMany');
    if (hasOneOrManyName) { changeType = DS.OneToManyChange; }
  }

  // otherwise, look for matching hasOne association on parent
  if (!hasOneOrManyName) {
    hasOneOrManyName = DS._inverseNameFor(parentType, childType, 'hasOne');
    if (hasOneOrManyName) { changeType = DS.OneToOneChange; }
  }

  return [hasOneOrManyName, changeType];
}
