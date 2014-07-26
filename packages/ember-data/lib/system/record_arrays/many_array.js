import RecordArray from "ember-data/system/record_arrays/record_array";
import {RelationshipChange} from "ember-data/system/changes";

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var map = Ember.EnumerableUtils.map;

function sync(change) {
  change.sync();
}

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
  @extends DS.RecordArray
*/
export default RecordArray.extend({
  init: function() {
    this._super.apply(this, arguments);
    this._changesToSync = Ember.OrderedSet.create();
  },

  /**
    The property name of the relationship

    @property {String} name
    @private
  */
  name: null,

  /**
    The record to which this relationship belongs.

    @property {DS.Model} owner
    @private
  */
  owner: null,

  /**
    `true` if the relationship is polymorphic, `false` otherwise.

    @property {Boolean} isPolymorphic
    @private
  */
  isPolymorphic: false,

  // LOADING STATE

  isLoaded: false,

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
    @method fetch
    @private
  */
  fetch: function() {
    var records = get(this, 'content');
    var store = get(this, 'store');
    var owner = get(this, 'owner');

    var unloadedRecords = records.filterBy('isEmpty', true);
    store.scheduleFetchMany(unloadedRecords, owner);
  },

  // Overrides Ember.Array's replace method to implement
  replaceContent: function(index, removed, added) {
    // Map the array of record objects into an array of  client ids.
    added = map(added, function(record) {
      Ember.assert("You cannot add '" + record.constructor.typeKey + "' records to this relationship (only '" + this.type.typeKey + "' allowed)", !this.type || record instanceof this.type);
      return record;
    }, this);

    this._super(index, removed, added);
  },

  arrangedContentDidChange: function() {
    Ember.run.once(this, 'fetch');
  },

  arrayContentWillChange: function(index, removed, added) {
    var owner = get(this, 'owner');
    var name = get(this, 'name');

    if (!owner._suspendedRelationships) {
      // This code is the first half of code that continues inside
      // of arrayContentDidChange. It gets or creates a change from
      // the child object, adds the current owner as the old
      // parent if this is the first time the object was removed
      // from a ManyArray, and sets `newParent` to null.
      //
      // Later, if the object is added to another ManyArray,
      // the `arrayContentDidChange` will set `newParent` on
      // the change.
      for (var i=index; i<index+removed; i++) {
        var record = get(this, 'content').objectAt(i);

        var change = RelationshipChange.createChange(owner, record, get(this, 'store'), {
          parentType: owner.constructor,
          changeType: "remove",
          kind: "hasMany",
          key: name
        });

        this._changesToSync.add(change);
      }
    }

    return this._super.apply(this, arguments);
  },

  arrayContentDidChange: function(index, removed, added) {
    this._super.apply(this, arguments);

    var owner = get(this, 'owner');
    var name = get(this, 'name');
    var store = get(this, 'store');

    if (!owner._suspendedRelationships) {
      // This code is the second half of code that started in
      // `arrayContentWillChange`. It gets or creates a change
      // from the child object, and adds the current owner as
      // the new parent.
      for (var i=index; i<index+added; i++) {
        var record = get(this, 'content').objectAt(i);

        var change = RelationshipChange.createChange(owner, record, store, {
          parentType: owner.constructor,
          changeType: "add",
          kind:"hasMany",
          key: name
        });
        change.hasManyName = name;

        this._changesToSync.add(change);
      }

      // We wait until the array has finished being
      // mutated before syncing the OneToManyChanges created
      // in arrayContentWillChange, so that the array
      // membership test in the sync() logic operates
      // on the final results.
      this._changesToSync.forEach(sync);

      this._changesToSync.clear();
    }
  },

  /**
    Create a child record within the owner

    @method createRecord
    @private
    @param {Object} hash
    @return {DS.Model} record
  */
  createRecord: function(hash) {
    var owner = get(this, 'owner');
    var store = get(owner, 'store');
    var type = get(this, 'type');
    var record;

    Ember.assert("You cannot add '" + type.typeKey + "' records to this polymorphic relationship.", !get(this, 'isPolymorphic'));

    record = store.createRecord.call(store, type, hash);
    this.pushObject(record);

    return record;
  }
});
