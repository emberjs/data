var get = Ember.get, set = Ember.set;

DS.OneToManyChange = function(options) {
  this.oldParent = options.oldParent;
  this.child = options.child;
  this.belongsToName = options.belongsToName;
  this.commited = {};
};

DS.OneToManyChange.create = function(options) {
  return new DS.OneToManyChange(options);
};

// This method returns a OneToManyChange for a given child and
// parent object. It is used by `ManyArray` to retrieve a change
// from the child if one already exists.
//
// This makes the child record the canonical store of any
// OneToManyChange objects.
DS.OneToManyChange.forChildAndParent = function(child, parent) {
  var key = DS.inverseNameFor(child.constructor, parent.constructor, 'belongsTo'),
      change = child.getChildChange(key);

  if (!change) {
    change = DS.OneToManyChange.create({
      belongsToName: name,
      child: child
    });

    child.addChildChange(key, change);
  }

  return change;
};

DS.OneToManyChange.prototype = {
  destroy: function() {
    var oldParent = this.oldParent,
        newParent = this.newParent,
        child = this.child,
        belongsToName = this.getBelongsToName(),
        hasManyName = this.getHasManyName();

    child.destroyChildChange(belongsToName);
    child.removeDirtyFactor(belongsToName);

    if (oldParent) {
      oldParent.removeDirtyFactor(hasManyName);
    }

    if (newParent) {
      newParent.removeDirtyFactor(hasManyName);
    }
  },

  /**
    @private

    Make sure that all three parts of the relationship change are part of
    the same transaction. If any of the three records is clean and in the
    default transaction, and the rest are in a different transaction, move
    them all into that transaction.
  */
  ensureSameTransaction: function(child, oldParent, newParent, hasManyName, belongsToName) {
    var transactions = Ember.A([
      get(child, 'transaction')
    ]);

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
    }
  },

  sync: function() {
    var oldParent = this.oldParent,
        newParent = this.newParent,
        child = this.child,
        hasManyName = this.getHasManyName(),
        belongsToName = this.getBelongsToName();

    Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);

    // This code path is reached if a child record was added to a new ManyArray
    // without being removed from its old ManyArray. Below, this method will
    // ensure (via `removeObject`) that the record is no longer in the old
    // ManyArray.
    if (oldParent === undefined) {
      oldParent = this.oldParent = child.get(belongsToName);
    }

    // Coalesce changes from A to B and back to A.
    if (oldParent === newParent) {
      var lastParent = this.lastParent;
      if (lastParent) {
        get(lastParent, hasManyName).removeObject(child);
      }

      if (oldParent) {
        get(oldParent, hasManyName).addObject(child);
      }

      this.destroy();
      return;
    }

    Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParent).constructor), hasManyName);

    this.ensureSameTransaction(child, oldParent, newParent, hasManyName, belongsToName);

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

    // Only set the belongsTo on the child if it is not already the
    // newParent. This happens if the change happened from the
    // ManyArray side.
    if (get(child, belongsToName) !== newParent) {
      set(child, belongsToName, newParent);
    }

    if (get(child, 'isLoaded')) {
      child.addDirtyFactor(belongsToName);
    }

    // If this change is later reversed (A->B followed by B->A),
    // we will need to remove the child from this parent. Save
    // it off as `lastParent` so we can do that.
    this.lastParent = newParent;
  },

  getHasManyName: function() {
    var name = this.hasManyName, parent;

    if (!name) {
      parent = this.oldParent || this.newParent;
      if (!parent) { return; }

      var inverseType = DS.inverseTypeFor(this.child.constructor, this.belongsToName);
      name = DS.inverseNameFor(inverseType, this.child.constructor, 'hasMany');
      this.hasManyName = name;
    }

    return name;
  },

  getBelongsToName: function() {
    var name = this.belongsToName, parent;

    if (!name) {
      parent = this.oldParent || this.newParent;
      if (!parent) { return; }

      name = DS.inverseNameFor(this.child.constructor, parent.constructor, 'belongsTo');

      this.belongsToName = name;
    }

    return name;
  },

  didUpdateRelationship: function(relationshipName, record) {
    var committed = this.committed,
        oldParent = this.oldParent,
        newParent = this.newParent,
        child     = this.child;

    if (oldParent === null) {
      committed.oldParent = true;
    }

    if (newParent === null) {
      committed.newParent = true;
    }

    var belongsToName = this.getBelongsToName();
    var hasManyName = this.getHasManyName();

    // Handle the case of a circular belongsTo relationship
    // by first checking whether the relationshipName is the
    // belongsTo name
    if (relationshipName === belongsToName) {
      committed.child = true;
    } else if (this.oldParent === record) {
      committed.oldParent = true;
    } else {
      committed.newParent = true;
    }

    // If all three sides of the relationship are acknowledged by the server,
    // remove the relationship from the inFlightDirtyFactors. If this is
    // the last dirty factor, this will notify the record that it has been
    // fully committed (via `didCommit`).
    if (committed.child && committed.oldParent && committed.newParent) {
      if (oldParent) { oldParent.removeInFlightDirtyFactor(hasManyName); }
      if (newParent) { newParent.removeInFlightDirtyFactor(hasManyName); }
      if (child)     { child.removeInFlightDirtyFactor(belongsToName); }
      this.destroy();
    }
  }
};
