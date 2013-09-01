/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;

/**
  @class RelationshipChange
  @namespace DS
  @private
  @construtor
*/
DS.RelationshipChange = function(options) {
  this.parentRecord = options.parentRecord;
  this.childRecord = options.childRecord;
  this.firstRecord = options.firstRecord;
  this.firstRecordKind = options.firstRecordKind;
  this.firstRecordName = options.firstRecordName;
  this.secondRecord = options.secondRecord;
  this.secondRecordKind = options.secondRecordKind;
  this.secondRecordName = options.secondRecordName;
  this.changeType = options.changeType;
  this.store = options.store;

  this.committed = {};
};

/**
  @class RelationshipChangeAdd
  @namespace DS
  @private
  @construtor
*/
DS.RelationshipChangeAdd = function(options){
  DS.RelationshipChange.call(this, options);
};

/**
  @class RelationshipChangeRemove
  @namespace DS
  @private
  @construtor
*/
DS.RelationshipChangeRemove = function(options){
  DS.RelationshipChange.call(this, options);
};

DS.RelationshipChange.create = function(options) {
  return new DS.RelationshipChange(options);
};

DS.RelationshipChangeAdd.create = function(options) {
  return new DS.RelationshipChangeAdd(options);
};

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
  var knownKey = knownSide.key, key, otherKind;
  var knownKind = knownSide.kind;

  var inverse = recordType.inverseFor(knownKey);

  if (inverse){
    key = inverse.name;
    otherKind = inverse.kind;
  }

  if (!inverse){
    return knownKind === "belongsTo" ? "oneToNone" : "manyToNone";
  }
  else{
    if(otherKind === "belongsTo"){
      return knownKind === "belongsTo" ? "oneToOne" : "manyToOne";
    }
    else{
      return knownKind === "belongsTo" ? "oneToMany" : "manyToMany";
    }
  }

};

DS.RelationshipChange.createChange = function(firstRecord, secondRecord, store, options){
  // Get the type of the child based on the child's client ID
  var firstRecordType = firstRecord.constructor, changeType;
  changeType = DS.RelationshipChange.determineRelationshipType(firstRecordType, options);
  if (changeType === "oneToMany"){
    return DS.OneToManyChange.createChange(firstRecord, secondRecord, store, options);
  }
  else if (changeType === "manyToOne"){
    return DS.OneToManyChange.createChange(secondRecord, firstRecord, store, options);
  }
  else if (changeType === "oneToNone"){
    return DS.OneToNoneChange.createChange(firstRecord, secondRecord, store, options);
  }
  else if (changeType === "manyToNone"){
    return DS.ManyToNoneChange.createChange(firstRecord, secondRecord, store, options);
  }
  else if (changeType === "oneToOne"){
    return DS.OneToOneChange.createChange(firstRecord, secondRecord, store, options);
  }
  else if (changeType === "manyToMany"){
    return DS.ManyToManyChange.createChange(firstRecord, secondRecord, store, options);
  }
};

DS.OneToNoneChange.createChange = function(childRecord, parentRecord, store, options) {
  var key = options.key;
  var change = DS.RelationshipChange._createChange({
      parentRecord: parentRecord,
      childRecord: childRecord,
      firstRecord: childRecord,
      store: store,
      changeType: options.changeType,
      firstRecordName: key,
      firstRecordKind: "belongsTo"
  });

  store.addRelationshipChangeFor(childRecord, key, parentRecord, null, change);

  return change;
};

DS.ManyToNoneChange.createChange = function(childRecord, parentRecord, store, options) {
  var key = options.key;
  var change = DS.RelationshipChange._createChange({
      parentRecord: childRecord,
      childRecord: parentRecord,
      secondRecord: childRecord,
      store: store,
      changeType: options.changeType,
      secondRecordName: options.key,
      secondRecordKind: "hasMany"
  });

  store.addRelationshipChangeFor(childRecord, key, parentRecord, null, change);
  return change;
};


DS.ManyToManyChange.createChange = function(childRecord, parentRecord, store, options) {
  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  var key = options.key;

  var change = DS.RelationshipChange._createChange({
      parentRecord: parentRecord,
      childRecord: childRecord,
      firstRecord: childRecord,
      secondRecord: parentRecord,
      firstRecordKind: "hasMany",
      secondRecordKind: "hasMany",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childRecord, key, parentRecord, null, change);


  return change;
};

DS.OneToOneChange.createChange = function(childRecord, parentRecord, store, options) {
  var key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = options.parentType.inverseFor(options.key).name;
  } else if (options.key) {
    key = options.key;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.RelationshipChange._createChange({
      parentRecord: parentRecord,
      childRecord: childRecord,
      firstRecord: childRecord,
      secondRecord: parentRecord,
      firstRecordKind: "belongsTo",
      secondRecordKind: "belongsTo",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childRecord, key, parentRecord, null, change);


  return change;
};

DS.OneToOneChange.maintainInvariant = function(options, store, childRecord, key){
  if (options.changeType === "add" && store.recordIsMaterialized(childRecord)) {
    var oldParent = get(childRecord, key);
    if (oldParent){
      var correspondingChange = DS.OneToOneChange.createChange(childRecord, oldParent, store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          changeType: "remove",
          key: options.key
        });
      store.addRelationshipChangeFor(childRecord, key, options.parentRecord , null, correspondingChange);
     correspondingChange.sync();
    }
  }
};

DS.OneToManyChange.createChange = function(childRecord, parentRecord, store, options) {
  var key;

  // If the name of the belongsTo side of the relationship is specified,
  // use that
  // If the type of the parent is specified, look it up on the child's type
  // definition.
  if (options.parentType) {
    key = options.parentType.inverseFor(options.key).name;
    DS.OneToManyChange.maintainInvariant( options, store, childRecord, key );
  } else if (options.key) {
    key = options.key;
  } else {
    Ember.assert("You must pass either a parentType or belongsToName option to OneToManyChange.forChildAndParent", false);
  }

  var change = DS.RelationshipChange._createChange({
      parentRecord: parentRecord,
      childRecord: childRecord,
      firstRecord: childRecord,
      secondRecord: parentRecord,
      firstRecordKind: "belongsTo",
      secondRecordKind: "hasMany",
      store: store,
      changeType: options.changeType,
      firstRecordName:  key
  });

  store.addRelationshipChangeFor(childRecord, key, parentRecord, change.getSecondRecordName(), change);


  return change;
};


DS.OneToManyChange.maintainInvariant = function(options, store, childRecord, key){
  if (options.changeType === "add" && childRecord) {
    var oldParent = get(childRecord, key);
    if (oldParent){
      var correspondingChange = DS.OneToManyChange.createChange(childRecord, oldParent, store, {
          parentType: options.parentType,
          hasManyName: options.hasManyName,
          changeType: "remove",
          key: options.key
        });
      store.addRelationshipChangeFor(childRecord, key, options.parentRecord, correspondingChange.getSecondRecordName(), correspondingChange);
      correspondingChange.sync();
    }
  }
};

/**
  @class RelationshipChange
  @namespace DS
*/
DS.RelationshipChange.prototype = {

  getSecondRecordName: function() {
    var name = this.secondRecordName, parent;

    if (!name) {
      parent = this.secondRecord;
      if (!parent) { return; }

      var childType = this.firstRecord.constructor;
      var inverse = childType.inverseFor(this.firstRecordName);
      this.secondRecordName = inverse.name;
    }

    return this.secondRecordName;
  },

  /**
    Get the name of the relationship on the belongsTo side.

    @method getFirstRecordName
    @return {String}
  */
  getFirstRecordName: function() {
    var name = this.firstRecordName;
    return name;
  },

  /**
    @method destroy
    @private
  */
  destroy: function() {
    var childRecord = this.childRecord,
        belongsToName = this.getFirstRecordName(),
        hasManyName = this.getSecondRecordName(),
        store = this.store;

    store.removeRelationshipChangeFor(childRecord, belongsToName, this.parentRecord, hasManyName, this.changeType);
  },

  getSecondRecord: function(){
    return this.secondRecord;
  },

  /**
    @method getFirstRecord
    @private
  */
  getFirstRecord: function() {
    return this.firstRecord;
  },

  coalesce: function(){
    var relationshipPairs = this.store.relationshipChangePairsFor(this.firstRecord);
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

// the object is a value, and not a promise
function isValue(object) {
  return typeof object === 'object' && (!object.then || typeof object.then !== 'function');
}

DS.RelationshipChangeAdd.prototype.changeType = "add";
DS.RelationshipChangeAdd.prototype.sync = function() {
  var secondRecordName = this.getSecondRecordName(),
      firstRecordName = this.getFirstRecordName(),
      firstRecord = this.getFirstRecord(),
      secondRecord = this.getSecondRecord();

  //Ember.assert("You specified a hasMany (" + hasManyName + ") on " + (!belongsToName && (newParent || oldParent || this.lastParent).constructor) + " but did not specify an inverse belongsTo on " + child.constructor, belongsToName);
  //Ember.assert("You specified a belongsTo (" + belongsToName + ") on " + child.constructor + " but did not specify an inverse hasMany on " + (!hasManyName && (newParent || oldParent || this.lastParentRecord).constructor), hasManyName);

  if (secondRecord instanceof DS.Model && firstRecord instanceof DS.Model) {
    if(this.secondRecordKind === "belongsTo"){
      secondRecord.suspendRelationshipObservers(function(){
        set(secondRecord, secondRecordName, firstRecord);
      });

     }
     else if(this.secondRecordKind === "hasMany"){
      secondRecord.suspendRelationshipObservers(function(){
        var relationship = get(secondRecord, secondRecordName);
        if (isValue(relationship)) { relationship.addObject(firstRecord); }
      });
    }
  }

  if (firstRecord instanceof DS.Model && secondRecord instanceof DS.Model && get(firstRecord, firstRecordName) !== secondRecord) {
    if(this.firstRecordKind === "belongsTo"){
      firstRecord.suspendRelationshipObservers(function(){
        set(firstRecord, firstRecordName, secondRecord);
      });
    }
    else if(this.firstRecordKind === "hasMany"){
      firstRecord.suspendRelationshipObservers(function(){
        var relationship = get(firstRecord, firstRecordName);
        if (isValue(relationship)) { relationship.addObject(secondRecord); }
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

  if (secondRecord instanceof DS.Model && firstRecord instanceof DS.Model) {
    if(this.secondRecordKind === "belongsTo"){
      secondRecord.suspendRelationshipObservers(function(){
        set(secondRecord, secondRecordName, null);
      });
    }
    else if(this.secondRecordKind === "hasMany"){
      secondRecord.suspendRelationshipObservers(function(){
        var relationship = get(secondRecord, secondRecordName);
        if (isValue(relationship)) { relationship.removeObject(firstRecord); }
      });
    }
  }

  if (firstRecord instanceof DS.Model && get(firstRecord, firstRecordName)) {
    if(this.firstRecordKind === "belongsTo"){
      firstRecord.suspendRelationshipObservers(function(){
        set(firstRecord, firstRecordName, null);
      });
     }
     else if(this.firstRecordKind === "hasMany"){
       firstRecord.suspendRelationshipObservers(function(){
         var relationship = get(firstRecord, firstRecordName);
         if (isValue(relationship)) { relationship.removeObject(secondRecord); }
      });
    }
  }

  this.coalesce();
};
