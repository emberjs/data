# Ember Data Architecture

## Roles & Responsibilities

### DS.Store

The store is the primary interface between the application developer
and the data store. It is responsible for managing all available
records, both materialized and immaterialized. At its core, it is a
bookkeeping object that indexes loaded hashes, and serves as a
coordinator between the other objects in the system.

* Indexes data hashes by type and ID
* Supplies a `clientId` for each requested record, and maps type/ID
  to `clientId`s and vice versa.
* Serves as an identity map for records of a given type/ID
* Creates new records and transactions
  * By default, `Post.createRecord()` asks the default store to
    create the record.
  * Optionally, coordinates with adapter to generate a client-generated
    ID for new records.
* Coordinates with the adapter to request records (find, findMany,
  findAll, findQuery).
* Sends lifecycle events to records. For example, the store notifies
  a record when the adapter has saved its pending changes (`didCommit`)
* Serves as the callback target for the adapter (`didCreateRecord`, et
  al)
* Responsible for managing indexes that power live record arrays
  * Filters: when a new data hash is loaded into the store, it updates
    any filters registered on that type. Records notify the store
    (via `hashWasUpdated`) when any properties change, causing the
    filters to update.
  * `find()`: `find()` is a special filter that matches all records
    for a given type.

### DS.Model

A model defines the attributes and relationships for a given type.
Instances of models, called records, are objects that provide an Ember
interface to JSON hashes returned by the server. Internally, records
keep track of their original JSON hash and any unsaved changes (see
`DataProxy` below for more details).

Records move through states in a state manager throughout their life.
For example, a newly created record begins its life in the
`loaded.created` state. A record requested from the server starts in the
`loading` state, and moves into the `loaded.saved` state once the server
returns its JSON hash.

When a store materializes a record, it asks the adapter (see below) to
extract the record's attributes and relationships and normalize their
names. This means that records will always have normalized data hashes.

* Has a series of lifecycle flags (`isLoaded`, etc.)
* Serializes the record into a persistable JSON hash, accepting
  adapter-provided options (such as `includeForeignKeys`).
* Manages an underlying `DataProxy`
* Manages a `StateManager` and sends any events to its state manager
* Tracks its current transaction
* Sends events to the transaction when the record becomes dirty
* Updates materialized `ManyArrays` if the underlying data changes
* Aliases store methods that require a type parameter to the `DS.Model`
  type. For example, instead of requiring you to call
  `store.find(App.Person, 1)`, you can say `App.Person.find(1)`.

### DataProxy

A record's `DataProxy` wraps its server-returned JSON hash plus any
unsaved changes in a single object.

It also supports `commit`, which collapses the unsaved changes into
the saved changes, and `rollback`, which discards any unsaved changes.

### Record State Manager

Manages the current state of a record. Every record has its own instance
of the `StateManager`.

When events occur to the record (e.g. the data hash changes, the store
acknowledges its commit), the record sends events to the state manager.
This allows the record to have context-specific responses to these
events, and initiate state transitions in response to events.

There is a lot of specific documentation in `system/model/states.js`.

### DS.Transaction

A transaction represents a unit of work that can be atomically committed
to the adapter. When a transaction is committed, it is responsible for
providing all of the changes to the adapter to save. A transaction can
also be rolled back, which reverts any changes that occurred but had not
yet been saved to the adapter.

Every record must belong to a transaction. By default, records belong
to the default transaction, which is a transaction that is implicitly
created with the store.

Transactions are ephemeral objects. Once committed or rolled back, they
should not be used again.

* Stores references to records, grouped by the current state of the
  record.
  * For example, a newly created record is saved in the `created`
    bucket, while a record that has attributes changed is saved in the
    `updated` bucket.
* Stores descriptions of changed relationships. When a relationship
  changes, information about its old parent, new parent, and new child
  is saved in the transaction.
* Raises an exception if changes in relationships are made between
  records that are in different transactions.
* Able to move records into itself from another transaction if it is
  legal.
* When committed, provides changed records to the adapter and
  responsible for moving those records into an `inFlight` state.
* After committing or rolling back, moves clean records into the store's
  default transaction.
* When rolled back, the transaction notifies all changed records to
  discard changes.

### DS.RecordArray

Record arrays represent an ordered list of records. They are backed by
an array of client IDs. When retrieving a record from the record array,
it will be materialized lazily if necessary.

`DS.RecordArray` is an abstract base class that provides many of the
features needed by its concrete implementations, described below.

### DS.ManyArray

Represents a one-to-many relationship. When the relationship is
retrieved from a record, a `ManyArray` is created that contains an
array of the client IDs that belong to that record.

* Notifies the transaction if the relationship is modified
* Tracks aggregate state of member records via `isLoaded` flag
* Updates added records to point their inverse relationship to the new
  parent.

### DS.AdapterPopulatedRecordArray

Represents an ordered list of records whose order and membership is
determined by the adapter. For example, a query sent to the adapter may
trigger a search on the server, whose results would be loaded into an
instance of the `AdapterPopulatedRecordArray`.

### DS.FilteredRecordArray

Represents a list of records whose membership is determined by the
store. As records are created, loaded, or modified, the store evaluates
them to determine if they should be part of the record array.

### DS.Adapter

The adapter is responsible for translating a store request into the
appropriate action to take against a persistence layer. For example, a
REST adapter may translate the request to find a record of type
`App.Photo` with ID `1` into an HTTP `GET` request to
`/photos/1`.

The responsibility of the adapter fall into two general categories:
retrieving records and committing changes to records.

#### Finding Via an Adapter

* Loading records into the store in response to `find()`
* Loading multiple records into the store in response to `findMany()`
* Loading the results of a query into an `AdapterPopulatedRecordArray`
  in response to a `findQuery()`
* Loading records into the store in response to `findAll()`

#### Saving Changes

The adapter receives a list of all changes from a transaction in
its `commit()` method. It is responsible for evaluating those changes,
figuring out what to do in order to persist them, and letting the
store know when the server acknowledged the save for a given
record.

As part of this process, the adapter receives a list of all
created, updated, and deleted records, as well as a list of all
changes to relationships.

In order to make this easy for an adapter to implement this pattern,
the `DS.Adapter` abstract class offers some conveniences:

* If a record has no attribute changes, but is involved in a
  relationship change, the abstract `DS.Adapter` calls the
  `shouldCommit` method with the ambiguous record and the
  relationship changes.
  * In a relational model, for example, the adapter will return
    true if the record is the child of a relationship change
    and false if the record is the old or new parent.
  * If the `shouldCommit` method returns false, the abstract
    `commit` method will immediately call `didUpdateRecord`
    on the store.
* If a record is involved in a relationship change, the abstract
  `commit` method will call the adapter's `willCommit` method
  with the record and the list of relationships.
  * This gives the adapter an opportunity to pend the record.
    For example, if a child record needs a foreign key, but
    the parent record's ID does not exist yet, the adapter
    can wait for the parent ID to become populated.
* The abstract `commit` method will call `createRecords`,
  `updateRecords`, and `deleteRecords` to allow the adapter
  to break up the commits to the server in an appropriate way.

#### Client-Side ID Generation

Adapters can specify a mechanism for new records to generate client-side
IDs. In general, this method should return a UUID or something with
extremely low collission possibility.

When a store creates a new record, it first consults the adapter to
determine whether the ID can be generated on the client. If so, it will
apply the generated ID to the record immediately.

One major benefit of generating IDs on the client is that records do not
need to wait for related records to be saved in order to retrieve
their foreign keys.

#### Naming Conventions

The adapter is also responsible for normalizing a server-provided data
hash to the naming expected by Ember.

In general, this means converting underscored names to camelcased names.

It is also responsible for converting dirty records into a data hash
expected by the server. For example, the adapter may need to add a
foreign key to the data hash by adding `_id` to its relationship.

The abstract adapter class provides normalization functions that call
into the `namingConvention` hash in the concrete classes. For very
custom logic, the concrete classes may want to override the
normalization directly, but that should be very rare.
