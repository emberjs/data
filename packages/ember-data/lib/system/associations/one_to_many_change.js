var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

DS.OneToManyChange = function(options) {
  this.oldParent = options.oldParent;
  this.child = options.child;
  this.belongsToName = options.belongsToName;
  this.store = options.store;
  this.committed = {};
  this.awaiting = 0;
  this.type = options.type;
  this.parentId = options.parentId;
};

/** @private */
DS.OneToManyChange.create = function(options) {
  return new DS.OneToManyChange(options);
};


/** @private */
DS.OneToManyChange.forChildAndParent = function(childClientId, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = store.typeForClientId(childClientId), key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = inverseBelongsToName(options.parentType, childType, options.hasManyName);
    //TODO(Igor) Move this logic to a OneToManyChange specific place
    if (options.type === "add" && store.recordIsMaterialized(childClientId)) {
      var child = store.findByClientId(null, childClientId);
      var oldParent = get(child, key);
      if (oldParent){
        var correspondingChange = DS.OneToManyChange.forChildAndParent(childClientId, store, {
            parentType: options.parentType,
            hasManyName: options.hasManyName,
            parentId: oldParent.get('clientId'),
            type: "remove"
          }); 
       correspondingChange.sync();
      } 
    }
  } else if (options.belongsToName) {
    key = options.belongsToName;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  //var change = store.relationshipChangeFor(childClientId, key);
  var change;
  if (!change) {
    change = DS.OneToManyChange.create({
      child: childClientId,
      parentId: options.parentId,
      store: store,
      type: options.type
    });

    store.addRelationshipChangeFor(childClientId, key, options.parentId , null, change);
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
      parent = this.parentId;
      if (!parent) { return; }

      var childType = store.typeForClientId(this.child);
      var inverseType = DS._inverseTypeFor(childType, this.belongsToName);
      name = inverseHasManyName(inverseType, childType, this.belongsToName);
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
      name = DS._inverseNameFor(childType, parentType, 'belongsTo', this.hasManyName);

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
        child, oldParent, newParent, lastParent, transaction;

    store.removeRelationshipChangeFor(childClientId, belongsToName, this.parentId, hasManyName, this.type);

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

  getParent: function(){
    return this.getByClientId(this.parentId);
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
  ensureSameTransaction: function(child, parentRecord, hasManyName, belongsToName) {
    var transactions = Ember.A();

    if (child)     { transactions.pushObject(get(child, 'transaction')); }
    if (parentRecord) { transactions.pushObject(get(parentRecord, 'transaction')); }
    //if (newParent) { transactions.pushObject(get(newParent, 'transaction')); }

    var transaction = transactions.reduce(function(prev, t) {
      if (!get(t, 'isDefault')) {
        if (prev === null) { return t; }
        Ember.assert("All records in a changed relationship must be in the same transaction. You tried to change the relationship between records when one is in " + t + " and the other is in " + prev, t === prev);
      }

      return prev;
    }, null);

    if (transaction) {
      transaction.add(child);
      if (parentRecord) { transaction.add(parentRecord); }
      //if (newParent) { transaction.add(newParent); }
    } else {
      transaction = transactions.objectAt(0);
    }

    this.transaction = transaction;
    return transaction;
  },

  callChangeEvents: function(){
    var hasManyName = this.getHasManyName(),
        belongsToName = this.getBelongsToName(),
        child = this.getChild(),
        parentRecord = this.getParent();
    
    var dirtySet = new Ember.OrderedSet();
    
    // TODO: This implementation causes a race condition in key-value
    // stores. The fix involves buffering changes that happen while
    // a record is loading. A similar fix is required for other parts
    // of ember-data, and should be done as new infrastructure, not
    // a one-off hack. [tomhuda]
    if (parentRecord && get(parentRecord, 'isLoaded')) {
      this.store.recordHasManyDidChange(dirtySet, parentRecord, this);
    }
    if (child) {
      this.store.recordBelongsToDidChange(dirtySet, child, this);
    }
    dirtySet.forEach(function(record) {
      record.adapterDidDirty();
    });
  },

  coalesce: function(){
    var relationshipPairs = this.store.relationshipChangePairsFor(this.child);
    forEach(relationshipPairs, function(pair){
      var addedChange = pair["add"];
      var removedChange = pair["remove"];
      if(addedChange && removedChange){
        addedChange.destroy();
        removedChange.destroy();
      }
    });
  },

  /** @private */
  sync: function() {
    var hasManyName = this.getHasManyName(),
        belongsToName = this.getBelongsToName(),
        child = this.getChild(),
        parentRecord = this.getParent();
    
    //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);
    //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

    var transaction = this.ensureSameTransaction(child, parentRecord, hasManyName, belongsToName);
    transaction.relationshipBecameDirty(this);
    
    this.callChangeEvents();

    if (this.type === "add"){
      parentRecord.suspendAssociationObservers(function(){
        get(parentRecord, hasManyName).addObject(child);
      });
      if (get(child, belongsToName) !== parentRecord) {
        child.suspendAssociationObservers(function(){
          set(child, belongsToName, parentRecord);
        });
      }
    }
    else {
      parentRecord.suspendAssociationObservers(function(){
        get(parentRecord, hasManyName).removeObject(child);
      });
      if (get(child, belongsToName)) {
        child.suspendAssociationObservers(function(){
          set(child, belongsToName, null);
        });
      }
    }

    this.coalesce();
  },

  /** @private */
  adapterDidUpdate: function() {
    if (this.awaiting > 0) { return; }
    var belongsToName = this.getBelongsToName();
    var hasManyName = this.getHasManyName();
    var oldParent, newParent, child;

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

function inverseBelongsToName(parentType, childType, hasManyName) {
  // Get the options passed to the parent's DS.hasMany()
  var options = parentType.metaForProperty(hasManyName).options;
  var belongsToName;

  if (belongsToName = options.inverse) {
    return belongsToName;
  }

  return DS._inverseNameFor(childType, parentType, 'belongsTo');
}

function inverseHasManyName(parentType, childType, belongsToName) {
  var options = childType.metaForProperty(belongsToName).options;
  var hasManyName;

  if (hasManyName = options.inverse) {
    return hasManyName;
  }

  return DS._inverseNameFor(parentType, childType, 'hasMany');
}
