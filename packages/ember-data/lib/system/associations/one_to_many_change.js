var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

DS.RelationshipChange = function(options) {
  this.oldParent = options.oldParent;
  this.child = options.child;
  this.belongsToName = options.belongsToName;
  this.store = options.store;
  this.committed = {};
  this.awaiting = 0;
  this.changeType = options.changeType;
  this.parentClientId = options.parentClientId;
};

DS.RelationshipChangeAdd = function(options){
  DS.RelationshipChange.call(this, options);
};

DS.RelationshipChangeRemove = function(options){
  DS.RelationshipChange.call(this, options);
};

/** @private */
DS.RelationshipChange.create = function(options) {
  return new DS.RelationshipChange(options);
};

/** @private */
DS.RelationshipChangeAdd.create = function(options) {
  return new DS.RelationshipChangeAdd(options);
};

/** @private */
DS.RelationshipChangeRemove.create = function(options) {
  return new DS.RelationshipChangeRemove(options);
};

DS.OneToManyChange = {};
DS.OneToManyChange.create = function(options){
  if(options.changeType === "add"){
    return DS.RelationshipChangeAdd.create(options);   
  }
  if(options.changeType === "remove"){
    return DS.RelationshipChangeRemove.create(options);   
  }
};

/** @private */
DS.OneToManyChange.createChange = function(childClientId, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = store.typeForClientId(childClientId), key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = inverseBelongsToName(options.parentType, childType, options.hasManyName);
    DS.OneToManyChange.maintainInvariant( options, store, childClientId, key );
  } else if (options.belongsToName) {
    key = options.belongsToName;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.OneToManyChange.create({
      child: childClientId,
      parentClientId: options.parentClientId,
      store: store,
      changeType: options.changeType
  });

  store.addRelationshipChangeFor(childClientId, key, options.parentClientId , null, change);

  change.belongsToName = key;

  return change;
};


DS.OneToManyChange.maintainInvariant = function(options, store, childClientId, key){
  if (options.changeType === "add" && store.recordIsMaterialized(childClientId)) {
    var child = store.findByClientId(null, childClientId);
    var oldParent = get(child, key);
    if (oldParent){
      var correspondingChange = DS.OneToManyChange.createChange(childClientId, store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          parentClientId: oldParent.get('clientId'),
          changeType: "remove"
        }); 
     correspondingChange.sync();
    } 
  }
};

DS.OneToManyChange.ensureSameTransaction = function(changes, store){
  var records = Ember.A();
  forEach(changes, function(change){
    if(change){
      records.addObject(change.getParent());  
      records.addObject(change.getChild());  
    }
  });
  var transaction = store.ensureSameTransaction(records);
  forEach(changes, function(change){
    if(change){
      change.transaction = transaction;  
    }
 });
};

DS.RelationshipChange.prototype = {
  /**
    Get the child type and ID, if available.

    @returns {Array} an array of type and ID
  */
  getChildTypeAndId: function() {
    return this.getTypeAndIdFor(this.child);
  },

  getHasManyName: function() {
    var name = this.hasManyName, store = this.store, parent;

    if (!name) {
      parent = this.parentClientId;
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

    store.removeRelationshipChangeFor(childClientId, belongsToName, this.parentClientId, hasManyName, this.changeType);

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
    return this.getByClientId(this.parentClientId);
  },

  /** @private */
  getChild: function() {
    return this.getByClientId(this.child);
  },

  /**
    @private

    Make sure that all three parts of the relationship change are part of
    the same transaction. If any of the three records is clean and in the
    default transaction, and the rest are in a different transaction, move
    them all into that transaction.
  */
  ensureSameTransaction: function() {
    var child = this.getChild(),
      parentRecord = this.getParent();

    var transaction = this.store.ensureSameTransaction([child, parentRecord]);

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

DS.RelationshipChangeAdd.prototype = Ember.create(DS.RelationshipChange.create({}));
DS.RelationshipChangeRemove.prototype = Ember.create(DS.RelationshipChange.create({}));

DS.RelationshipChangeAdd.prototype.changeType = "add";
DS.RelationshipChangeAdd.prototype.sync = function() {
  var hasManyName = this.getHasManyName(),
      belongsToName = this.getBelongsToName(),
      child = this.getChild(),
      parentRecord = this.getParent();
  
  //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);
  //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

  var transaction = this.ensureSameTransaction(child, parentRecord, hasManyName, belongsToName);
  transaction.relationshipBecameDirty(this);
  
  this.callChangeEvents();

  parentRecord.suspendAssociationObservers(function(){
    get(parentRecord, hasManyName).addObject(child);
  });
  if (get(child, belongsToName) !== parentRecord) {
    child.suspendAssociationObservers(function(){
      set(child, belongsToName, parentRecord);
    });
  }

  this.coalesce();
};

DS.RelationshipChangeRemove.prototype.changeType = "remove";
DS.RelationshipChangeRemove.prototype.sync = function() {
  var hasManyName = this.getHasManyName(),
      belongsToName = this.getBelongsToName(),
      child = this.getChild(),
      parentRecord = this.getParent();
  
  //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);
  //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

  var transaction = this.ensureSameTransaction(child, parentRecord, hasManyName, belongsToName);
  transaction.relationshipBecameDirty(this);
  
  this.callChangeEvents();

  parentRecord.suspendAssociationObservers(function(){
    get(parentRecord, hasManyName).removeObject(child);
  });
  if (get(child, belongsToName)) {
    child.suspendAssociationObservers(function(){
      set(child, belongsToName, null);
    });
  }

  this.coalesce();
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
