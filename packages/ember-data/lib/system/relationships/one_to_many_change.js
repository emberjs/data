var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

DS.RelationshipChange = function(options) {
  this.firstRecordClientId = options.firstRecordClientId;
  this.firstRecordKind = options.firstRecordKind;
  this.firstRecordName = options.firstRecordName;
  this.secondRecordClientId = options.secondRecordClientId;
  this.secondRecordKind = options.secondRecordKind;
  this.secondRecordName = options.secondRecordName;
  this.store = options.store;
  this.committed = {};
  this.changeType = options.changeType;
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
DS.OneToNoneChange = {};
DS.ManyToNoneChange = {};
DS.OneToOneChange = {};
DS.ManyToManyChange = {};

DS.RelationshipChange._createChange = function(options){
  if(options.changeType === "add"){
    return DS.RelationshipChangeAdd.create(options);
  }
  if(options.changeType === "remove"){
    return DS.RelationshipChangeRemove.create(options);
  }
};


DS.RelationshipChange.determineRelationshipType = function(recordType, knownSide){
  var knownKey = knownSide.key, key, type, otherContainerType,assoc;
  var knownContainerType = knownSide.kind;
  var options = recordType.metaForProperty(knownKey).options;
  var otherType = DS._inverseTypeFor(recordType, knownKey);
    
  if(options.inverse){
    key = options.inverse;
    otherContainerType = get(otherType, 'relationshipsByName').get(key).kind; 
  } 
  else if(assoc = DS._inverseRelationshipFor(otherType, recordType)){
    key = assoc.name;
    otherContainerType = assoc.kind;
  } 
  if(!key){
    return knownContainerType === "belongsTo" ? "oneToNone" : "manyToNone";
  }
  else{
    if(otherContainerType === "belongsTo"){
      return knownContainerType === "belongsTo" ? "oneToOne" : "manyToOne";
    }
    else{
      return knownContainerType === "belongsTo" ? "oneToMany" : "manyToMany";
    }
  } 
 
};

DS.RelationshipChange.createChange = function(firstRecordClientId, secondRecordClientId, store, options){
  // Get the type of the child based on the child's client ID
  var firstRecordType = store.typeForClientId(firstRecordClientId), key, changeType;
  changeType = DS.RelationshipChange.determineRelationshipType(firstRecordType, options);
  if (changeType === "oneToMany"){
    return DS.OneToManyChange.createChange(firstRecordClientId, secondRecordClientId, store, options); 
  }
  else if (changeType === "manyToOne"){
    return DS.OneToManyChange.createChange(secondRecordClientId, firstRecordClientId, store, options); 
  }
  else if (changeType === "oneToNone"){
    return DS.OneToNoneChange.createChange(firstRecordClientId, "", store, options); 
  }
  else if (changeType === "manyToNone"){
    return DS.ManyToNoneChange.createChange(firstRecordClientId, "", store, options); 
  }
  else if (changeType === "oneToOne"){
    return DS.OneToOneChange.createChange(firstRecordClientId, secondRecordClientId, store, options); 
  }
  else if (changeType === "manyToMany"){
    return DS.ManyToManyChange.createChange(firstRecordClientId, secondRecordClientId, store, options); 
  }
};

/** @private */
DS.OneToNoneChange.createChange = function(childClientId, parentClientId, store, options) {
  var key = options.key;
  var change = DS.RelationshipChange._createChange({
      firstRecordClientId: childClientId,
      store: store,
      changeType: options.changeType,
      firstRecordName: key,
      firstRecordKind: "belongsTo"
  });

  store.addRelationshipChangeFor(childClientId, key, parentClientId, null, change);

  return change;
};  

/** @private */
DS.ManyToNoneChange.createChange = function(childClientId, parentClientId, store, options) {
  var key = options.key;
  var change = DS.RelationshipChange._createChange({
      secondRecordClientId: childClientId,
      store: store,
      changeType: options.changeType,
      secondRecordName: options.key,
      secondRecordKind: "hasMany"
  });

  store.addRelationshipChangeFor(childClientId, key, parentClientId, null, change);
  return change;
};  


/** @private */
DS.ManyToManyChange.createChange = function(childClientId, parentClientId, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = store.typeForClientId(childClientId), key;
  
  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  key = options.key;

  var change = DS.RelationshipChange._createChange({
      firstRecordClientId: childClientId,
      secondRecordClientId: parentClientId,
      firstRecordKind: "hasMany",
      secondRecordKind: "hasMany",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childClientId, key, parentClientId, null, change);


  return change;
};

/** @private */
DS.OneToOneChange.createChange = function(childClientId, parentClientId, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = store.typeForClientId(childClientId), key;
  
  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = inverseBelongsToName(options.parentType, childType, options.key);
    //DS.OneToOneChange.maintainInvariant( options, store, childClientId, key );
  } else if (options.key) {
    key = options.key;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.RelationshipChange._createChange({
      firstRecordClientId: childClientId,
      secondRecordClientId: parentClientId,
      firstRecordKind: "belongsTo",
      secondRecordKind: "belongsTo",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childClientId, key, parentClientId, null, change);


  return change;
};

DS.OneToOneChange.maintainInvariant = function(options, store, childClientId, key){
  if (options.changeType === "add" && store.recordIsMaterialized(childClientId)) {
    var child = store.findByClientId(null, childClientId);
    var oldParent = get(child, key);
    if (oldParent){
      var correspondingChange = DS.OneToOneChange.createChange(childClientId, oldParent.get('clientId'), store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          changeType: "remove",
          key: options.key
        });
      store.addRelationshipChangeFor(childClientId, key, options.parentClientId , null, correspondingChange);
     correspondingChange.sync();
    }
  }
};

/** @private */
DS.OneToManyChange.createChange = function(childClientId, parentClientId, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = store.typeForClientId(childClientId), key;
  
  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = inverseBelongsToName(options.parentType, childType, options.key);
    DS.OneToManyChange.maintainInvariant( options, store, childClientId, key );
  } else if (options.key) {
    key = options.key;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.RelationshipChange._createChange({
      firstRecordClientId: childClientId,
      secondRecordClientId: parentClientId,
      firstRecordKind: "belongsTo",
      secondRecordKind: "hasMany",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childClientId, key, parentClientId, null, change);


  return change;
};


DS.OneToManyChange.maintainInvariant = function(options, store, childClientId, key){
  if (options.changeType === "add" && store.recordIsMaterialized(childClientId)) {
    var child = store.findByClientId(null, childClientId);
    var oldParent = get(child, key);
    if (oldParent){
      var correspondingChange = DS.OneToManyChange.createChange(childClientId, oldParent.get('clientId'), store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          changeType: "remove",
          key: options.key
        });
      store.addRelationshipChangeFor(childClientId, key, options.parentClientId , null, correspondingChange);
     correspondingChange.sync();
    }
  }
};

DS.OneToManyChange.ensureSameTransaction = function(changes, store){
  var records = Ember.A();
  forEach(changes, function(change){
    records.addObject(change.getSecondRecord());
    records.addObject(change.getFirstRecord());
  });
  var transaction = store.ensureSameTransaction(records);
  forEach(changes, function(change){
    change.transaction = transaction;
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

  getSecondRecordName: function() {
    var name = this.secondRecordName, store = this.store, parent;

    if (!name) {
      parent = this.secondRecordClientId;
      if (!parent) { return; }

      var childType = store.typeForClientId(this.firstRecordClientId);
      var inverseType = DS._inverseTypeFor(childType, this.firstRecordName);
      name = inverseHasManyName(inverseType, childType, this.firstRecordName);
      this.secondRecordName = name;
    }

    return name;
  },

  /**
    Get the name of the relationship on the belongsTo side.

    @returns {String}
  */
  getFirstRecordName: function() {
    var name = this.firstRecordName, store = this.store, parent;

    if (!name) {
      parent = this.secondRecordClientId;
      if (!parent) { return; }

      var childType = store.typeForClientId(this.firstRecordClientId);
      var parentType = store.typeForClientId(parent);
      if (!(childType && parentType)) { return; }
      name = DS._inverseRelationshipFor(childType, parentType).name;

      this.firstRecordName = name;
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
    var childClientId = this.firstRecordClientId,
        belongsToName = this.getFirstRecordName(),
        hasManyName = this.getSecondRecordName(),
        store = this.store,
        child, oldParent, newParent, lastParent, transaction;

    store.removeRelationshipChangeFor(childClientId, belongsToName, this.secondRecordClientId, hasManyName, this.changeType);

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

  getSecondRecord: function(){
    return this.getByClientId(this.secondRecordClientId);
  },

  /** @private */
  getFirstRecord: function() {
    return this.getByClientId(this.firstRecordClientId);
  },

  /**
    @private

    Make sure that all three parts of the relationship change are part of
    the same transaction. If any of the three records is clean and in the
    default transaction, and the rest are in a different transaction, move
    them all into that transaction.
  */
  ensureSameTransaction: function() {
    var child = this.getFirstRecord(),
      parentRecord = this.getSecondRecord();

    var transaction = this.store.ensureSameTransaction([child, parentRecord]);

    this.transaction = transaction;
    return transaction;
  },

  callChangeEvents: function(){
    var hasManyName = this.getSecondRecordName(),
        belongsToName = this.getFirstRecordName(),
        child = this.getFirstRecord(),
        parentRecord = this.getSecondRecord();

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

    //Set the parent on the child's reference if the child is "always" embedded within the parent
    if (parentRecord && child) {
      var embeddedType = this.store.adapterForType(parentRecord.constructor).get('serializer').embeddedType(parentRecord.constructor, hasManyName);
      if (embeddedType === 'always') {
        child.get('_reference').parent = parentRecord;
      }
    }

    dirtySet.forEach(function(record) {
      record.adapterDidDirty();
    });
  },

  coalesce: function(){
    var relationshipPairs = this.store.relationshipChangePairsFor(this.firstRecordClientId);
    forEach(relationshipPairs, function(pair){
      var addedChange = pair["add"];
      var removedChange = pair["remove"];
      if(addedChange && removedChange) {
        addedChange.destroy();
        removedChange.destroy();
      }
    });
  }
};

DS.RelationshipChangeAdd.prototype = Ember.create(DS.RelationshipChange.create({}));
DS.RelationshipChangeRemove.prototype = Ember.create(DS.RelationshipChange.create({}));

DS.RelationshipChangeAdd.prototype.changeType = "add";
DS.RelationshipChangeAdd.prototype.sync = function() {
  var secondRecordName = this.getSecondRecordName(),
      firstRecordName = this.getFirstRecordName(),
      firstRecord = this.getFirstRecord(),
      secondRecord = this.getSecondRecord();

  //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);
  //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

  var transaction = this.ensureSameTransaction();
  transaction.relationshipBecameDirty(this);

  this.callChangeEvents();

  if (secondRecord && firstRecord) {
    if(this.secondRecordKind === "belongsTo"){
      secondRecord.suspendRelationshipObservers(function(){
        set(secondRecord, secondRecordName, firstRecord);
      });

     }
     else if(this.secondRecordKind === "hasMany"){
      secondRecord.suspendRelationshipObservers(function(){
        get(secondRecord, secondRecordName).addObject(firstRecord);
      });
    }
  }

  if (firstRecord && secondRecord && get(firstRecord, firstRecordName) !== secondRecord) {
    if(this.firstRecordKind === "belongsTo"){
      firstRecord.suspendRelationshipObservers(function(){
        set(firstRecord, firstRecordName, secondRecord);
      });
    }
    else if(this.firstdRecordKind === "hasMany"){
      firstRecord.suspendRelationshipObservers(function(){
        get(firstRecord, firstRecordName).addObject(secondRecord);
      });
    }
  }

  this.coalesce();
};

DS.RelationshipChangeRemove.prototype.changeType = "remove";
DS.RelationshipChangeRemove.prototype.sync = function() {
  var secondRecordName = this.getSecondRecordName(),
      firstRecordName = this.getFirstRecordName(),
      firstRecord = this.getFirstRecord(),
      secondRecord = this.getSecondRecord();

  //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);
  //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

  var transaction = this.ensureSameTransaction(firstRecord, secondRecord, secondRecordName, firstRecordName);
  transaction.relationshipBecameDirty(this);

  this.callChangeEvents();

  if (secondRecord && firstRecord) {
    if(this.secondRecordKind === "belongsTo"){
        set(secondRecord, secondRecordName, null);
     }
     else if(this.secondRecordKind === "hasMany"){
       secondRecord.suspendRelationshipObservers(function(){
        get(secondRecord, secondRecordName).removeObject(firstRecord);
      });
    }
  }

  if (firstRecord && get(firstRecord, firstRecordName)) {
    if(this.firstRecordKind === "belongsTo"){
      firstRecord.suspendRelationshipObservers(function(){
        set(firstRecord, firstRecordName, null);
      });
     }
     else if(this.firstdRecordKind === "hasMany"){
       firstRecord.suspendRelationshipObservers(function(){
        get(firstRecord, firstRecordName).removeObject(secondRecord);
      });
    }
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

  return DS._inverseRelationshipFor(childType, parentType).name;
}

function inverseHasManyName(parentType, childType, belongsToName) {
  var options = childType.metaForProperty(belongsToName).options;
  var hasManyName;

  if (hasManyName = options.inverse) {
    return hasManyName;
  }

  return DS._inverseRelationshipFor(parentType, childType).name;
}
