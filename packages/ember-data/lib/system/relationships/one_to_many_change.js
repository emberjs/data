var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

DS.RelationshipChange = function(options) {
  this.parentReference = options.parentReference;
  this.childReference = options.childReference;
  this.firstRecordReference = options.firstRecordReference;
  this.firstRecordKind = options.firstRecordKind;
  this.firstRecordName = options.firstRecordName;
  this.secondRecordReference = options.secondRecordReference;
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

DS.RelationshipChange.createChange = function(firstRecordReference, secondRecordReference, store, options){
  // Get the type of the child based on the child's client ID
  var firstRecordType = firstRecordReference.type, key, changeType;
  changeType = DS.RelationshipChange.determineRelationshipType(firstRecordType, options);
  if (changeType === "oneToMany"){
    return DS.OneToManyChange.createChange(firstRecordReference, secondRecordReference, store, options);
  }
  else if (changeType === "manyToOne"){
    return DS.OneToManyChange.createChange(secondRecordReference, firstRecordReference, store, options);
  }
  else if (changeType === "oneToNone"){
    return DS.OneToNoneChange.createChange(firstRecordReference, secondRecordReference, store, options);
  }
  else if (changeType === "manyToNone"){
    return DS.ManyToNoneChange.createChange(firstRecordReference, secondRecordReference, store, options);
  }
  else if (changeType === "oneToOne"){
    return DS.OneToOneChange.createChange(firstRecordReference, secondRecordReference, store, options);
  }
  else if (changeType === "manyToMany"){
    return DS.ManyToManyChange.createChange(firstRecordReference, secondRecordReference, store, options);
  }
};

/** @private */
DS.OneToNoneChange.createChange = function(childReference, parentReference, store, options) {
  var key = options.key;
  var change = DS.RelationshipChange._createChange({
      parentReference: parentReference,
      childReference: childReference,
      firstRecordReference: childReference,
      store: store,
      changeType: options.changeType,
      firstRecordName: key,
      firstRecordKind: "belongsTo"
  });

  store.addRelationshipChangeFor(childReference, key, parentReference, null, change);

  return change;
};

/** @private */
DS.ManyToNoneChange.createChange = function(childReference, parentReference, store, options) {
  var key = options.key;
  var change = DS.RelationshipChange._createChange({
      parentReference: childReference,
      childReference: parentReference,
      secondRecordReference: childReference,
      store: store,
      changeType: options.changeType,
      secondRecordName: options.key,
      secondRecordKind: "hasMany"
  });

  store.addRelationshipChangeFor(childReference, key, parentReference, null, change);
  return change;
};


/** @private */
DS.ManyToManyChange.createChange = function(childReference, parentReference, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = childReference.type, key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  key = options.key;

  var change = DS.RelationshipChange._createChange({
      parentReference: parentReference,
      childReference: childReference,
      firstRecordReference: childReference,
      secondRecordReference: parentReference,
      firstRecordKind: "hasMany",
      secondRecordKind: "hasMany",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childReference, key, parentReference, null, change);


  return change;
};

/** @private */
DS.OneToOneChange.createChange = function(childReference, parentReference, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = childReference.type, key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = inverseBelongsToName(options.parentType, childType, options.key);
    //DS.OneToOneChange.maintainInvariant( options, store, childReference, key );
  } else if (options.key) {
    key = options.key;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.RelationshipChange._createChange({
      parentReference: parentReference,
      childReference: childReference,
      firstRecordReference: childReference,
      secondRecordReference: parentReference,
      firstRecordKind: "belongsTo",
      secondRecordKind: "belongsTo",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childReference, key, parentReference, null, change);


  return change;
};

DS.OneToOneChange.maintainInvariant = function(options, store, childReference, key){
  if (options.changeType === "add" && store.recordIsMaterialized(childReference)) {
    var child = store.recordForReference(childReference);
    var oldParent = get(child, key);
    if (oldParent){
      var correspondingChange = DS.OneToOneChange.createChange(childReference, oldParent.get('_reference'), store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          changeType: "remove",
          key: options.key
        });
      store.addRelationshipChangeFor(childReference, key, options.parentReference , null, correspondingChange);
     correspondingChange.sync();
    }
  }
};

/** @private */
DS.OneToManyChange.createChange = function(childReference, parentReference, store, options) {
  // Get the type of the child based on the child's client ID
  var childType = childReference.type, key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = inverseBelongsToName(options.parentType, childType, options.key);
    DS.OneToManyChange.maintainInvariant( options, store, childReference, key );
  } else if (options.key) {
    key = options.key;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.RelationshipChange._createChange({
      parentReference: parentReference,
      childReference: childReference,
      firstRecordReference: childReference,
      secondRecordReference: parentReference,
      firstRecordKind: "belongsTo",
      secondRecordKind: "hasMany",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childReference, key, parentReference, null, change);


  return change;
};


DS.OneToManyChange.maintainInvariant = function(options, store, childReference, key){
  if (options.changeType === "add" && store.recordIsMaterialized(childReference)) {
    var child = store.recordForReference(childReference);
    var oldParent = get(child, key);
    if (oldParent){
      var correspondingChange = DS.OneToManyChange.createChange(childReference, oldParent.get('_reference'), store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          changeType: "remove",
          key: options.key
        });
      store.addRelationshipChangeFor(childReference, key, options.parentReference , null, correspondingChange);
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

  getSecondRecordName: function() {
    var name = this.secondRecordName, store = this.store, parent;

    if (!name) {
      parent = this.secondRecordReference;
      if (!parent) { return; }

      var childType = this.firstRecordReference.type;
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
    var name = this.firstRecordName, store = this.store, parent, child;

    if (!name) {
      parent = this.secondRecordReference;
      child = this.firstRecordReference;
      if (!(child && parent)) { return; }

      name = DS._inverseRelationshipFor(child.type, parent.type).name;

      this.firstRecordName = name;
    }

    return name;
  },

  /** @private */
  destroy: function() {
    var childReference = this.childReference,
        belongsToName = this.getFirstRecordName(),
        hasManyName = this.getSecondRecordName(),
        store = this.store,
        child, oldParent, newParent, lastParent, transaction;

    store.removeRelationshipChangeFor(childReference, belongsToName, this.parentReference, hasManyName, this.changeType);

    if (transaction = this.transaction) {
      transaction.relationshipBecameClean(this);
    }
  },

  /** @private */
  getByReference: function(reference) {
    var store = this.store;

    // return null or undefined if the original reference was null or undefined
    if (!reference) { return reference; }

    if (store.recordIsMaterialized(reference)) {
      return store.recordForReference(reference);
    }
  },

  getSecondRecord: function(){
    return this.getByReference(this.secondRecordReference);
  },

  /** @private */
  getFirstRecord: function() {
    return this.getByReference(this.firstRecordReference);
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

    dirtySet.forEach(function(record) {
      record.adapterDidDirty();
    });
  },

  coalesce: function(){
    var relationshipPairs = this.store.relationshipChangePairsFor(this.firstRecordReference);
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
      secondRecord.suspendRelationshipObservers(function(){
        set(secondRecord, secondRecordName, null);
      });
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
