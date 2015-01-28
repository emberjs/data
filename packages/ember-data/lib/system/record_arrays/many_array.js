/**
  @module ember-data
*/

var get = Ember.get;
var set = Ember.set;

/**
  A `ManyArray` is a `RecordArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```javascript
  App.Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  App.Comment = DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  If you created a new instance of `App.Post` and added
  a `App.Comment` record to its `comments` has-many
  relationship, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which a relationship belongs the
  relationship's _owner_.

  @class ManyArray
  @namespace DS
  @extends Ember.Object
  @uses Ember.MutableArray, Ember.Evented
*/
export default Ember.Object.extend(Ember.MutableArray, Ember.Evented, {
  init: function() {
    this.currentState = Ember.A([]);
    this.diff = [];
  },

  record: null,

  canonicalState: null,
  currentState: null,

  diff: null,

  length: 0,

  objectAt: function(index) {
    if (this.currentState[index]) {
      return this.currentState[index];
    } else {
      return this.canonicalState[index];
    }
  },

  flushCanonical: function() {
    //TODO make this smarter, currently its plenty stupid
    var toSet = this.canonicalState.slice(0);
    //a hack for not removing new records
    //TODO remove once we have proper diffing
    var newRecords = this.currentState.filter(function(record) {
      return record.get('isNew');
    });
    toSet = toSet.concat(newRecords);
    this.arrayContentWillChange(0, this.length, this.length);
    this.set('length', toSet.length);
    this.currentState = toSet;
    this.arrayContentDidChange(0, this.length, this.length);
    //TODO Figure out to notify only on additions and maybe only if unloaded
    this.relationship.notifyHasManyChanged();
    this.record.updateRecordArrays();
  },
  /**
    `true` if the relationship is polymorphic, `false` otherwise.

    @property {Boolean} isPolymorphic
    @private
  */
  isPolymorphic: false,

  /**
    The loading state of this array

    @property {Boolean} isLoaded
  */
  isLoaded: false,

   /**
     The relationship which manages this array.

     @property {ManyRelationship} relationship
     @private
   */
  relationship: null,

  internalReplace: function(idx, amt, objects) {
    if (!objects) {
      objects = [];
    }
    this.arrayContentWillChange(idx, amt, objects.length);
    this.currentState.splice.apply(this.currentState, [idx, amt].concat(objects));
    this.set('length', this.currentState.length);
    this.arrayContentDidChange(idx, amt, objects.length);
    if (objects) {
      //TODO(Igor) probably needed only for unloaded records
      this.relationship.notifyHasManyChanged();
    }
    this.record.updateRecordArrays();
  },

  //TODO(Igor) optimize
  internalRemoveRecords: function(records) {
    var index;
    for (var i=0; i < records.length; i++) {
      index = this.currentState.indexOf(records[i]);
      this.internalReplace(index, 1);
    }
  },

  //TODO(Igor) optimize
  internalAddRecords: function(records, idx) {
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.internalReplace(idx, 0, records);
  },

  replace: function(idx, amt, objects) {
    var records;
    if (amt > 0) {
      records = this.currentState.slice(idx, idx+amt);
      this.get('relationship').removeRecords(records);
    }
    if (objects) {
      this.get('relationship').addRecords(objects, idx);
    }
  },
  /**
    Used for async `hasMany` arrays
    to keep track of when they will resolve.

    @property {Ember.RSVP.Promise} promise
    @private
  */
  promise: null,

  /**
    @method loadingRecordsCount
    @param {Number} count
    @private
  */
  loadingRecordsCount: function(count) {
    this.loadingRecordsCount = count;
  },

  /**
    @method loadedRecord
    @private
  */
  loadedRecord: function() {
    this.loadingRecordsCount--;
    if (this.loadingRecordsCount === 0) {
      set(this, 'isLoaded', true);
      this.trigger('didLoad');
    }
  },

  /**
    @method reload
    @public
  */
  reload: function() {
    return this.relationship.reload();
  },

  /**
    Create a child record within the owner

    @method createRecord
    @private
    @param {Object} hash
    @return {DS.Model} record
  */
  createRecord: function(hash) {
    var store = get(this, 'store');
    var type = get(this, 'type');
    var record;

    Ember.assert("You cannot add '" + type.typeKey + "' records to this polymorphic relationship.", !get(this, 'isPolymorphic'));

    record = store.createRecord(type, hash);
    this.pushObject(record);

    return record;
  },

  /**
    @method addRecord
    @param {DS.Model} record
    @deprecated Use `addObject()` instead
  */
  addRecord: function(record) {
    Ember.deprecate('Using manyArray.addRecord() has been deprecated. You should use manyArray.addObject() instead.');
    this.addObject(record);
  },

  /**
    @method removeRecord
    @param {DS.Model} record
    @deprecated Use `removeObject()` instead
  */
  removeRecord: function(record) {
    Ember.deprecate('Using manyArray.removeRecord() has been deprecated. You should use manyArray.removeObject() instead.');
    this.removeObject(record);
  }
});
