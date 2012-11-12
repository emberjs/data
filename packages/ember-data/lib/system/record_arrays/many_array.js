require("ember-data/system/record_arrays/record_array");
require("ember-data/system/record_arrays/many_array_states");

var get = Ember.get, set = Ember.set;

/**
  A ManyArray is a RecordArray that represents the contents of a has-many
  association.

  The ManyArray is instantiated lazily the first time the association is
  requested.

  ### Inverses

  Often, the associations in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

      App.Post = DS.Model.extend({
        comments: DS.hasMany('App.Comment')
      });

      App.Comment = DS.Model.extend({
        post: DS.belongsTo('App.Post')
      });

  If you created a new instance of `App.Post` and added
  a `App.Comment` record to its `comments` has-many
  association, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which an association belongs the
  association's _owner_.
*/
DS.ManyArray = DS.RecordArray.extend({
  init: function() {
    this._super.apply(this, arguments);
    this._changesToSync = Ember.OrderedSet.create();
  },

  /**
    @private

    The record to which this association belongs.

    @property {DS.Model}
  */
  owner: null,

  // LOADING STATE

  isLoaded: false,

  loadingRecordsCount: function(count) {
    this.loadingRecordsCount = count;
  },

  loadedRecord: function() {
    this.loadingRecordsCount--;
    if (this.loadingRecordsCount === 0) {
      set(this, 'isLoaded', true);
      this.trigger('didLoad');
    }
  },

  fetch: function() {
    var clientIds = get(this, 'content'),
        store = get(this, 'store'),
        type = get(this, 'type');

    store.fetchUnloadedClientIds(type, clientIds);
  },

  // Overrides Ember.Array's replace method to implement
  replaceContent: function(index, removed, added) {
    // Map the array of record objects into an array of  client ids.
    added = added.map(function(record) {
      Ember.assert("You can only add records of " + (get(this, 'type') && get(this, 'type').toString()) + " to this association.", !get(this, 'type') || (get(this, 'type') === record.constructor));
      return record.get('clientId');
    }, this);

    this._super(index, removed, added);
  },

  arrangedContentDidChange: function() {
    this.fetch();
  },

  arrayContentWillChange: function(index, removed, added) {
    var owner = get(this, 'owner'),
        name = get(this, 'name');

    if (!owner._suspendedAssociations) {
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
        var clientId = get(this, 'content').objectAt(i);
        //var record = this.objectAt(i);
        //if (!record) { continue; }

        var change = DS.OneToManyChange.forChildAndParent(clientId, get(this, 'store'), {
          parentType: owner.constructor,
          hasManyName: name
        });
        change.hasManyName = name;

        if (change.oldParent === undefined) { change.oldParent = get(owner, 'clientId'); }
        change.newParent = null;
        this._changesToSync.add(change);
      }
    }

    return this._super.apply(this, arguments);
  },

  arrayContentDidChange: function(index, removed, added) {
    this._super.apply(this, arguments);

    var owner = get(this, 'owner'),
        name = get(this, 'name');

    if (!owner._suspendedAssociations) {
      // This code is the second half of code that started in
      // `arrayContentWillChange`. It gets or creates a change
      // from the child object, and adds the current owner as
      // the new parent.
      for (var i=index; i<index+added; i++) {
        var clientId = get(this, 'content').objectAt(i);

        var change = DS.OneToManyChange.forChildAndParent(clientId, get(this, 'store'), {
          parentType: owner.constructor,
          hasManyName: name
        });
        change.hasManyName = name;

        // The oldParent will be looked up in `sync` if it
        // was not set by `belongsToWillChange`.
        change.newParent = get(owner, 'clientId');
        this._changesToSync.add(change);
      }

      // We wait until the array has finished being
      // mutated before syncing the OneToManyChanges created
      // in arrayContentWillChange, so that the array
      // membership test in the sync() logic operates
      // on the final results.
      this._changesToSync.forEach(function(change) {
        change.sync();
      });
      this._changesToSync.clear();
    }
  },

  // Create a child record within the owner
  createRecord: function(hash, transaction) {
    var owner = get(this, 'owner'),
        store = get(owner, 'store'),
        type = get(this, 'type'),
        record;

    transaction = transaction || get(owner, 'transaction');

    record = store.createRecord.call(store, type, hash, transaction);
    this.pushObject(record);

    return record;
  },

  /**
    METHODS FOR USE BY INVERSE RELATIONSHIPS
    ========================================

    These methods exists so that belongsTo relationships can
    set their inverses without causing an infinite loop.

    This creates two APIs:

    * the normal enumerable API, which is used by clients
      of the `ManyArray` and triggers a change to inverse
      `belongsTo` relationships.
    * `removeFromContent` and `addToContent`, which are
      used by inverse relationships and do not trigger a
      change to `belongsTo` relationships.

    Unlike the normal `addObject` and `removeObject` APIs,
    these APIs manipulate the `content` array without
    triggering side-effects.
  */

  /** @private */
  removeFromContent: function(record) {
    var clientId = get(record, 'clientId');
    get(this, 'content').removeObject(clientId);
  },

  /** @private */
  addToContent: function(record) {
    var clientId = get(record, 'clientId');
    get(this, 'content').addObject(clientId);
  }
});
