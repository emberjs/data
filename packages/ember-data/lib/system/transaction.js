var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt,
    removeObject = Ember.EnumerableUtils.removeObject, forEach = Ember.EnumerableUtils.forEach;

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

      record = App.store.find(Person, 1);
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
    var person = Person.createRecord({ name: "Steve" });

    // won't work because person is dirty
    transaction.add(person);

  Call `createRecord()` on the transaction directly:

    var transaction = store.transaction();
    transaction.createRecord(Person, { name: "Steve" });

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

var arrayDefault = function() { return []; };

DS.Transaction = Ember.Object.extend({
  /**
    @private

    Creates the bucket data structure used to segregate records by
    type.
  */
  init: function() {
    set(this, 'buckets', {
      clean:    Ember.OrderedSet.create(),
      created:  Ember.OrderedSet.create(),
      updated:  Ember.OrderedSet.create(),
      deleted:  Ember.OrderedSet.create(),
      inflight: Ember.OrderedSet.create()
    });

    this.dirtyRelationships = {
      byChild: Ember.MapWithDefault.create({ defaultValue: arrayDefault }),
      byNewParent: Ember.MapWithDefault.create({ defaultValue: arrayDefault }),
      byOldParent: Ember.MapWithDefault.create({ defaultValue: arrayDefault }),
    };
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

  /**
    Adds an existing record to this transaction. Only records without
    modficiations (i.e., records whose `isDirty` property is `false`)
    can be added to a transaction.

    @param {DS.Model} record the record to add to the transaction
  */
  add: function(record) {
    // we could probably make this work if someone has a valid use case. Do you?
    Ember.assert("Once a record has changed, you cannot move it into a different transaction", !get(record, 'isDirty'));

    var recordTransaction = get(record, 'transaction'),
        defaultTransaction = getPath(this, 'store.defaultTransaction');

    Ember.assert("Models cannot belong to more than one transaction at a time.", recordTransaction === defaultTransaction);

    this.adoptRecord(record);
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
    var relationships = get(this, 'dirtyRelationships');

    var iterate = function(records) {
      var array = records.toArray();
      forEach(array, function(record) {
        record.send('willCommit');
      });
      return array;
    };

    var byChild = relationships.byChild,
        byOldParent = relationships.byOldParent,
        byNewParent = relationships.byNewParent;

    // If a record is part of a dirty relationship, it should be
    // included together with the updated elements.
    var extra = [];
    this.bucketForType('clean').forEach(function(record) {
      if (byChild.get(record).length || byOldParent.get(record).length || byNewParent.get(record).length) {
        record.send('willCommit');
        extra.push(record);
      }
    });

    var commitDetails = {
      created: iterate(this.bucketForType('created')),
      updated: iterate(this.bucketForType('updated')).concat(extra),
      deleted: iterate(this.bucketForType('deleted'))
    };

    relationships = {
      byChild: byChild.copy(),
      byOldParent: byOldParent.copy(),
      byNewParent: byNewParent.copy()
    };

    this.removeCleanRecords();

    if (adapter && adapter.commit) { adapter.commit(store, commitDetails, relationships); }
    else { throw fmt("Adapter is either null or does not implement `commit` method", this); }
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
    var store = get(this, 'store'),
        dirty;

    // Loop through all of the records in each of the dirty states
    // and initiate a rollback on them. As a side effect of telling
    // the record to roll back, it should also move itself out of
    // the dirty bucket and into the clean bucket.
    ['created', 'updated', 'deleted', 'inflight'].forEach(function(bucketType) {
      var records = this.bucketForType(bucketType);
      forEach(records, function(record) {
        record.send('rollback');
      });
      records.clear();
    }, this);

    // Now that all records in the transaction are guaranteed to be
    // clean, migrate them all to the store's default transaction.
    this.removeCleanRecords();
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
    var defaultTransaction = getPath(this, 'store.defaultTransaction');
    defaultTransaction.adoptRecord(record);
  },

  /**
    @private

    Removes all of the records in the transaction's clean bucket.
  */
  removeCleanRecords: function() {
    var clean = this.bucketForType('clean');
    clean.forEach(function(record) {
      this.remove(record);
    }, this);
    clean.clear();
  },

  /**
    @private

    Returns the bucket for the given bucket type. For example, you might call
    `this.bucketForType('updated')` to get the `Ember.Map` that contains all
    of the records that have changes pending.

    @param {String} bucketType the type of bucket
    @returns Ember.Map
  */
  bucketForType: function(bucketType) {
    var buckets = get(this, 'buckets');

    return get(buckets, bucketType);
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
      oldTransaction.removeFromBucket('clean', record);
    }

    this.addToBucket('clean', record);
    set(record, 'transaction', this);
  },

  /**
    @private

    Adds a record to the named bucket.

    @param {String} bucketType one of `clean`, `created`, `updated`, or `deleted`
  */
  addToBucket: function(bucketType, record) {
    this.bucketForType(bucketType).add(record);
  },

  /**
    @private

    Removes a record from the named bucket.

    @param {String} bucketType one of `clean`, `created`, `updated`, or `deleted`
  */
  removeFromBucket: function(bucketType, record) {
    this.bucketForType(bucketType).remove(record);
  },

  /**
    @private

    Called by a ManyArray when a new record is added to it. This
    method will index a relationship description by the child
    record, its old parent, and its new parent.

    The store will provide this description to the adapter's
    shouldCommit method, so it can determine whether any of
    the records is pending another record. The store will also
    provide a list of these descriptions to the adapter's commit
    method.

    @param {DS.Model} record the new child record
    @param {DS.Model} oldParent the parent that the child is
      moving from, or null
    @param {DS.Model} newParent the parent that the child is
      moving to, or null
  */
  relationshipBecameDirty: function(child, oldParent, newParent) {
    var relationships = this.dirtyRelationships, relationship;

    var relationshipsForChild = relationships.byChild.get(child),
        possibleRelationship,
        needsNewEntries = true;

    // If the child has any existing dirty relationships in this
    // transaction, we need to collapse the old relationship
    // into the new one. For example, if we change the parent of
    // a child record before saving, there is no need to save the
    // record that was its parent temporarily.
    if (relationshipsForChild) {

      // Loop through all of the relationships we know about that
      // contain the same child as the new relationship.
      for (var i=0, l=relationshipsForChild.length; i<l; i++) {
        relationship = relationshipsForChild[i];

        // If the parent of the child record has changed, there is
        // no need to update the old parent that had not yet been saved.
        //
        // This case is two changes in a record's parent:
        //
        //   A -> B
        //   B -> C
        //
        // In this case, there is no need to remember the A->B
        // change. We can collapse both changes into:
        //
        //   A -> C
        //
        // Another possible case is:
        //
        //   A -> B
        //   B -> A
        //
        // In this case, we don't need to do anything. We can
        // simply remove the original A->B change and call it
        // a day.
        if (relationship.newParent === oldParent) {
          oldParent = relationship.oldParent;
          this.removeRelationship(relationship);

          // This is the case of A->B followed by B->A.
          if (relationship.oldParent === newParent) {
            needsNewEntries = false;
          }
        }
      }
    }

    relationship = {
      child: child,
      oldParent: oldParent,
      newParent: newParent
    };

    // If we didn't go A->B and then B->A, add new dirty relationship
    // entries.
    if (needsNewEntries) {
      this.addRelationshipTo('byChild', child, relationship);
      this.addRelationshipTo('byOldParent', oldParent, relationship);
      this.addRelationshipTo('byNewParent', newParent, relationship);
    }
  },

  removeRelationship: function(relationship) {
    var relationships = this.dirtyRelationships;

    removeObject(relationships.byOldParent.get(relationship.oldParent), relationship);
    removeObject(relationships.byNewParent.get(relationship.newParent), relationship);
    removeObject(relationships.byChild.get(relationship.child), relationship);
  },

  addRelationshipTo: function(type, record, description) {
    var map = this.dirtyRelationships[type];
    map.get(record).push(description);
  },

  /**
    @private

    Called by a record's state manager to indicate that the record has entered
    a dirty state. The record will be moved from the `clean` bucket and into
    the appropriate dirty bucket.

    @param {String} bucketType one of `created`, `updated`, or `deleted`
  */
  recordBecameDirty: function(bucketType, record) {
    this.removeFromBucket('clean', record);
    this.addToBucket(bucketType, record);
  },

  /**
    @private

    Called by a record's state manager to indicate that the record has entered
    inflight state. The record will be moved from its current dirty bucket and into
    the `inflight` bucket.

    @param {String} bucketType one of `created`, `updated`, or `deleted`
  */
  recordBecameInFlight: function(kind, record) {
    this.removeFromBucket(kind, record);
    this.addToBucket('inflight', record);
  },

  /**
    @private

    Called by a record's state manager to indicate that the record has entered
    a clean state. The record will be moved from its current dirty or inflight bucket and into
    the `clean` bucket.

    @param {String} bucketType one of `created`, `updated`, or `deleted`
  */
  recordBecameClean: function(kind, record) {
    this.removeFromBucket(kind, record);
    this.remove(record);
  }
});
