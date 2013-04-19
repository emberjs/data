var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

/**
  @module data
  @submodule data-transaction
*/

/**
  A transaction allows you to collect multiple records into a unit of work
  that can be committed or rolled back as a group.

  For example, if a record has local modifications that have not yet
  been saved, calling `commit()` on its transaction will cause those
  modifications to be sent to the adapter to be saved. Calling
  `rollback()` on its transaction would cause all of the modifications to
  be discarded and the record to return to the last known state before
  changes were made.

  If a newly created record's transaction is rolled back, it will
  immediately transition to the deleted state.

  If you do not explicitly create a transaction, a record is assigned to
  an implicit transaction called the default transaction. In these cases,
  you can treat your application's instance of `DS.Store` as a transaction
  and call the `commit()` and `rollback()` methods on the store itself.

  Once a record has been successfully committed or rolled back, it will
  be moved back to the implicit transaction. Because it will now be in
  a clean state, it can be moved to a new transaction if you wish.

  ### Creating a Transaction

  To create a new transaction, call the `transaction()` method of your
  application's `DS.Store` instance:

      var transaction = App.store.transaction();

  This will return a new instance of `DS.Transaction` with no records
  yet assigned to it.

  ### Adding Existing Records

  Add records to a transaction using the `add()` method:

      record = App.store.find(App.Person, 1);
      transaction.add(record);

  Note that only records whose `isDirty` flag is `false` may be added
  to a transaction. Once modifications to a record have been made
  (its `isDirty` flag is `true`), it is not longer able to be added to
  a transaction.

  ### Creating New Records

  Because newly created records are dirty from the time they are created,
  and because dirty records can not be added to a transaction, you must
  use the `createRecord()` method to assign new records to a transaction.

  For example, instead of this:

    var transaction = store.transaction();
    var person = App.Person.createRecord({ name: "Steve" });

    // won't work because person is dirty
    transaction.add(person);

  Call `createRecord()` on the transaction directly:

    var transaction = store.transaction();
    transaction.createRecord(App.Person, { name: "Steve" });

  ### Asynchronous Commits

  Typically, all of the records in a transaction will be committed
  together. However, new records that have a dependency on other new
  records need to wait for their parent record to be saved and assigned an
  ID. In that case, the child record will continue to live in the
  transaction until its parent is saved, at which time the transaction will
  attempt to commit again.

  For this reason, you should not re-use transactions once you have committed
  them. Always make a new transaction and move the desired records to it before
  calling commit.
*/

DS.Transaction = Ember.Object.extend({
  /**
    @private

    Creates the bucket data structure used to segregate records by
    type.
  */
  init: function() {
    set(this, 'records', Ember.OrderedSet.create());

    set(this, 'relationships', Ember.OrderedSet.create());
  },

  /**
    Creates a new record of the given type and assigns it to the transaction
    on which the method was called.

    This is useful as only clean records can be added to a transaction and
    new records created using other methods immediately become dirty.

    @param {DS.Model} type the model type to create
    @param {Object} hash the data hash to assign the new record
  */
  createRecord: function(type, hash) {
    var store = get(this, 'store');

    return store.createRecord(type, hash, this);
  },

  isEqualOrDefault: function(other) {
    if (this === other || other === get(this, 'store.defaultTransaction')) {
      return true;
    }
  },

  isDefault: Ember.computed(function() {
    return this === get(this, 'store.defaultTransaction');
  }),

  /**
    Adds an existing record to this transaction. Only records without
    modificiations (i.e., records whose `isDirty` property is `false`)
    can be added to a transaction.

    @param {DS.Model} record the record to add to the transaction
  */
  add: function(record) {
    Ember.assert("You must pass a record into transaction.add()", record instanceof DS.Model);

    this.adoptRecord(record);
  },

  relationshipBecameDirty: function(relationship) {
    get(this, 'relationships').add(relationship);
  },

  relationshipBecameClean: function(relationship) {
    get(this, 'relationships').remove(relationship);
  },

  /**
    Commits the transaction, which causes all of the modified records that
    belong to the transaction to be sent to the adapter to be saved.

    Once you call `commit()` on a transaction, you should not re-use it.

    When a record is saved, it will be removed from this transaction and
    moved back to the store's default transaction.
  */
  commit: function() {
    var store = get(this, 'store');
    var adapter = get(store, '_adapter');
    var defaultTransaction = get(store, 'defaultTransaction');

    if (this === defaultTransaction) {
      set(store, 'defaultTransaction', store.transaction());
    }

    this.removeCleanRecords();
    var relationships = get(this, 'relationships');

    var commitDetails = this._commitDetails();

    if (!commitDetails.created.isEmpty() || !commitDetails.updated.isEmpty() || !commitDetails.deleted.isEmpty() || !commitDetails.relationships.isEmpty()) {

      Ember.assert("You tried to commit records but you have no adapter", adapter);
      Ember.assert("You tried to commit records but your adapter does not implement `commit`", adapter.commit);

      adapter.commit(store, commitDetails);
    }

    // Once we've committed the transaction, there is no need to
    // keep the OneToManyChanges around. Destroy them so they
    // can be garbage collected.
    relationships.forEach(function(relationship) {
      relationship.destroy();
    });
  },

  _commitDetails: function() {
    var relationships = get(this, 'relationships');
    var commitDetails = {
      created: Ember.OrderedSet.create(),
      updated: Ember.OrderedSet.create(),
      deleted: Ember.OrderedSet.create(),
      relationships: relationships
    };

    var records = get(this, 'records');

    records.forEach(function(record) {
      if(!get(record, 'isDirty')) return;
      record.send('willCommit');
      commitDetails[get(record, 'dirtyType')].add(record);
    });

    return commitDetails;
  },

  /**
    Rolling back a transaction resets the records that belong to
    that transaction.

    Updated records have their properties reset to the last known
    value from the persistence layer. Deleted records are reverted
    to a clean, non-deleted state. Newly created records immediately
    become deleted, and are not sent to the adapter to be persisted.

    After the transaction is rolled back, any records that belong
    to it will return to the store's default transaction, and the
    current transaction should not be used again.
  */
  rollback: function() {
    var store = get(this, 'store');

    // Destroy all relationship changes and compute
    // all references affected
    var references = Ember.OrderedSet.create();
    var relationships = get(this, 'relationships');
    relationships.forEach(function(r) {
      references.add(r.firstRecordReference);
      references.add(r.secondRecordReference);
      r.destroy();
    });
    relationships.clear();

    var records = get(this, 'records');
    records.forEach(function(record) {
      if (!record.get('isDirty')) return;
      record.send('rollback');
    });

    // Now that all records in the transaction are guaranteed to be
    // clean, migrate them all to the store's default transaction.
    this.removeCleanRecords();

    // Remaining associated references are not part of the transaction, but
    // can still have hasMany's which have not been reloaded
    references.forEach(function(r) {

      if (r && r.record) {
        var record = r.record;
        record.suspendRelationshipObservers(function() {
          record.reloadHasManys();
        });
      }
    }, this);
  },

  /**
    @private

    Removes a record from this transaction and back to the store's
    default transaction.

    Note: This method is private for now, but should probably be exposed
    in the future once we have stricter error checking (for example, in the
    case of the record being dirty).

    @param {DS.Model} record
  */
  remove: function(record) {
    var defaultTransaction = get(this, 'store.defaultTransaction');
    defaultTransaction.adoptRecord(record);
  },

  /**
    @private

    Removes all of the records in the transaction's clean bucket.
  */
  removeCleanRecords: function() {
    var records = get(this, 'records');
    records.forEach(function(record) {
      if(!record.get('isDirty')) {
        this.remove(record);
      }
    }, this); 
  },

  /**
    @private

    This method moves a record into a different transaction without the normal
    checks that ensure that the user is not doing something weird, like moving
    a dirty record into a new transaction.

    It is designed for internal use, such as when we are moving a clean record
    into a new transaction when the transaction is committed.

    This method must not be called unless the record is clean.

    @param {DS.Model} record
  */
  adoptRecord: function(record) {
    var oldTransaction = get(record, 'transaction');

    if (oldTransaction) {
      oldTransaction.removeRecord(record);
    }

    get(this, 'records').add(record);
    set(record, 'transaction', this);
  },

  /**
   @private

   Removes the record without performing the normal checks
   to ensure that the record is re-added to the store's
   default transaction.
  */
  removeRecord: function(record) {
    get(this, 'records').remove(record);
  }

});

DS.Transaction.reopenClass({
  ensureSameTransaction: function(records){
    var transactions = Ember.A();
    forEach( records, function(record){
      if (record){ transactions.pushObject(get(record, 'transaction')); }
    });

    var transaction = transactions.reduce(function(prev, t) {
      if (!get(t, 'isDefault')) {
        if (prev === null) { return t; }
        Ember.assert("All records in a changed relationship must be in the same transaction. You tried to change the relationship between records when one is in " + t + " and the other is in " + prev, t === prev);
      }

      return prev;
    }, null);

    if (transaction) {
      forEach( records, function(record){
        if (record){ transaction.add(record); }
      });
    } else {
      transaction = transactions.objectAt(0);
    }
    return transaction;
   }
});
