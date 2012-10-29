# BREAKING CHANGES

This file lists breaking changes, ordered by revision number.

When you instantiate your adapter, include the API revision number, and
ember-data will automatically warn you of any breaking changes.

The ember-data project follows [semver](http://semver.org/) versioning.
Because we have not yet reached 1.0, breaking changes are allowed, but
we want to make sure that you are alerted to intentional breaking
changes.

Once we reach 1.0, we will remove this mechanism and use normal version
numbers to indicate breaking changes.

Example:

```javascript
App.Store = DS.Store.create({
  revision: 1
});
```

If a breaking change has been made to API revision 1, you will receive
an exception pointing you to this document. Once you have reviewed the
breaking changes and made any necessary changes to your application, you
will want to update the revision:

```javascript
App.Store = DS.Store.create({
  revision: 2
});
```

This will remove the exception about changes before revision 2. You will
receive another warning if there is another change.

# Revision 7

### Acknowledging Relationships

Previously, we said that in order for your adapter to acknowledge a
record as having been fully saved on the server, you would call
`store.didSaveRecord`. In theory, this would mark all attributes and
relationships as having been saved by the server.

However, this was too tightly coupled to adapters that change
relationships by updating foreign keys. It was buggy in general, and
didn't work at all for adapters using other strategies for persisting
relationships.

Now, the adapter must treat relationships as separate entities which
they acknowledge independently from records participating in them.

**NOTE** that if you are using the REST Adapter, we have updated it to
reflect these new semantics and no changes in your app should be
required.

There are three basic scenarios by which an adapter can
save a relationship.

#### Foreign Key

An adapter can save all relationship changes by updating
a foreign key on the child record. If it does this, it
should acknowledge the changes when the child record is
saved.

    record.eachAssociation(function(name, meta) {
      if (meta.kind === 'belongsTo') {
        store.didUpdateRelationship(record, name);
      }
    });

    store.didSaveRecord(record, hash);

#### Embedded in Parent

An adapter can save one-to-many relationships by embedding
IDs (or records) in the parent object. In this case, the
relationship is not considered acknowledged until both the
old parent and new parent have acknowledged the change.

In this case, the adapter should keep track of the old
parent and new parent, and acknowledge the relationship
change once both have acknowledged. If one of the two
sides does not exist (e.g. the new parent does not exist
because of nulling out the belongs-to relationship),
the adapter should acknowledge the relationship once
the other side has acknowledged.

#### Separate Entity

An adapter can save relationships as separate entities
on the server. In this case, they should acknowledge
the relationship as saved once the server has
acknowledged the entity.


# Revision 6

### String-normalized IDs

Because a record's ID may be serialized and deserialized into the URL
when using Ember.Router, it is common that the type of the ID is lost
during this process. For example, if a Post has an ID of `42`,
serializing it to the URL `/post/42` causes the ID to be coerced into a
string. Once this happens, there is later ambiguity about whether the
true ID is the number `42` or the string `"42"`.

To resolve this ambiguity, the store now automatically coerces all IDs
to strings. If your existing code uses numbers for IDs, they should
continue to work with minimal change to your application.

Do note that if you ask a record for its `id`, it will always report the
string representation:

```javascript
var post = App.Post.find(1);
post.get('id'); // "1"
```

This may also have repercussions to your adapter. DS.Serializer now has
a `serializeId` method that can be overridden to ensure that IDs are
correctly formatted before being sent to the persistence layer. If you
are using a custom adapter, make sure that methods like `findMany` are
using the serializer's `serializeId` or `serializeIds` methods, if they
include IDs in the data payload and your backend expects them to be in
non-string format.

## Revision 5

This is an extremely large refactor that changes many of the underlying
semantics and object responsibilities. Primarily, we have moved many
semantics that were hard-coded to relational databases to the REST
adapter.

This means that Ember Data should work just as well with
key-value stores as relational databases, or whatever persistence
technology you choose. Additionally, changing between different
types of back-end servers should have minimal impact on the Ember.js
application itself.

This work also makes the FixtureAdapter less coupled to a particular
backend, and sets the stage for local caching of Ember Data objects.

### Mapping

Before, if you wanted to map key names from your server-provided
data to your models, you would do this:

```javascript
App.Post = DS.Model.extend({
  title: DS.attr('string', { key: 'TITLE' });
});
```

Now, all mapping is done via `Adapter.map`. You will now do this:

```javascript
App.Adapter.map('App.Post', {
  title: { key: 'TITLE' }
});
```

This API works for attributes, belongs to associations and has many
associations.

If you want to define a custom primary key, you will now do:

```javascript
App.Adapter.map('App.Post', {
  primaryKey: '_id'
});
```

If you are using the RESTAdapter, you would do:

```javascript
DS.RESTAdapter.map('App.Post', {
  primaryKey: '_id',
  title: { key: 'TITLE' }
});
```

### ID as an Attribute

Some applications were erroneously declaring `id` as an attribute on
their models. You do not need to do this. With this revision, you will
start to see an error if you try.

For example, if you were doing this:

```javascript
App.Person = DS.Model.extend({
  id: DS.attr('number'),
  name: DS.attr('string')
});
```

replace it with:

```javascript
App.Person = DS.Model.extend({
  name: DS.attr('string')
});
```

### Change in `record.toJSON`

In this revision, the record's `toJSON` method delegates directly to the
adapter. This should not have any significant changes to the returned
values (assuming you moved your mappings over to `store.map` as
described above).

The one exception is that `toJSON` will no longer include the `id` by
default. If you would like to include the `id`, call:

```javascript
record.toJSON({ includeId: true });
```

If you were using `record.toJSON` in a custom adapter, make sure to
include IDs where needed.

### Fixtures

Because mappings and transforms are now defined on a per-adapter basis,
you can use your app's attribute names in your fixtures, and not have to
transform them based on your backend requirements.

Before:

```javascript
App.Post = DS.Model.extend({
  primaryKey: '__id!__',
  name: DS.attr('string', { key: '!idbNAME!' }
});

App.Post.FIXTURES = [
  {
    '__id__!': 1,
    '!idbNAME!': "Tom Dale"
  },
  {
    '__id__!': 2,
    '!idbNAME!': "Yehuda Katz"
  }
]
```

After:

```javascript
DS.RESTAdapter.map('App.Post', {
  primaryKey: '__id!__',
  name: { key: '!idbNAME!' }
});

App.Post.FIXTURES = [
  {
    id: 1,
    name: "Tom Dale"
  },
  {
    id: 2,
    name: "Yehuda Katz"
  }
]
```

This simplifies your fixtures, because:

* It allows you to describe your fixtures in the language of your
  domain, rather than the language of your backend
* It allows you to avoid modifying your fixtures if your backend API
  changes.

### Pending Records

Previously, transactions would automatically determine the dependencies
between records when saving.

For example, if you had these models:

```javascript
App.Deck = DS.Model.extend({
  name: DS.attr('string'),
  cards: DS.hasMany('App.Card')
});

App.Card = DS.Model.extend({
  front: DS.attr('string'),
  back: DS.attr('string'),
  deck: DS.belongsTo('App.Deck')
});
```

If you created a deck and a related card at the same time, the
transaction would automatically put the `Card` into a pending state
until the adapter assigned the `Deck` an `id`.

Unfortunately, this hardcoded relational semantics into the application,
and also exposed adapter concerns into the application.

At present, you will need to handle these dependencies yourself, by
observing the parent's `id` property. We plan to introduce a convenience
in `DS.Adapter` to simplify this case.

If you are using the `RESTAdapter`, you may have temporary issues with
records created using this pattern. In the interim, make sure not to
create graphs of records in the same transaction with foreign key
dependencies.

### Transforms

Previously, custom transforms were hardcoded into Ember Data, and there
was a temporary API for adding new transforms. Additionally, these
transforms were defined per-application, making it impossible for
fixtures to use different serialization than the server. Fixing this
also paves the way for local caching.

There is now a supported API for adding new transforms to your
application's adapter.

```javascript
// your backend uses Cocoa-style YES/NO for booleans
App.CocoaAdapter.registerTransform('boolean', {
  fromJSON: function(value) {
    if (value === 'YES') {
      return true;
    } else if (value === 'NO') {
      return false;
    }
  },

  toJSON: function(value) {
    if (value === true) {
      return 'YES';
    } else if (value === false) {
      return 'NO';
    }
  }
});
```

Once you have done this, you can define attributes that use the
transform like this:

```javascript
App.Person = DS.Model.extend({
  name: DS.attr('string'),
  isDrugDealer: DS.attr('boolean')
});
```

In general, you want to keep these types generic, so they can be
replaced with other serialization if the backend changes requirements,
and to support simple fixtures. For example, in this case, you would
not want to define `cocoaBoolean` as a type and use it throughout your
application.

### Naming Conventions

Previously, app-wide naming conventions were defined in a model
superclass using a `namingConvention` object.

Now, you need to define a custom serializer for your adapter:

```javascript
var store = DS.Store.create({
  adapter: DS.RESTAdapter.create({
    serializer: DS.Serializer.create({
      // `post` becomes `postId`. By default, the RESTAdapter's
      // serializer adds `_id` to the decamelized name.
      keyForBelongsTo: function(type, name) {
        return this.keyForAttributeName(type, name) + "Id";
      },

      // `firstName` stays as `firstName`. By default, the
      // RESTAdapter's serializer decamelizes name.
      keyForAttributeName: function(type, name) {
        return name;
      }
    })
  })
});
```

### Adapter Semantics

If you were using the REST Adapter before, your app should continue to
work. However, if you built a custom adapter, many of the APIs have
changed.

Some examples:

* An adapter is now responsible for saving relationship changes
* If a record is involved in a relationship change, an adapter is now
  responsible for determining whether any server work needs to be done.
  For example, a relational adapter may not need to do anything to a
  `Post` when a `Comment` was moved into it. A key-value adapter may
  not want to do anything to the `Comment` in the same situation.
* An adapter is now responsible for transforming data hashes it receives
  from the server into attributes and associations (via its serializer)
* An adapter is now fully responsible for transforming records into
  JSON hashes to send to the server (via its serializer)
* The `commit` adapter method has been renamed to `save`. You may
  still need to override `commit` in very custom scenarios. The default
  `commit` method now coalesces relationship changes (via the
  new `shouldCommit` adapter hook) and passes them to `save`. Most
  adapters will never need to override any of these methods.
* Instead of receiving a set of `commitDetails` iterators, the `save`
  method receives a list of all changed records. A new `groupByType`
  convenience method allows you to group the changed records by type.
  The default `save` method does this automatically, which means that
  the existing `createRecords`, `updateRecords`, and `deleteRecords`
  APIs have not changed.

## Revision 4

### Removal of hasOne

Previously, the `DS.hasOne` and `DS.belongsTo` associations were aliased
to one another. Now, `DS.belongsTo` remains but `DS.hasOne` has been
removed. We are planning on having different semantics for `DS.hasOne`
at a later date.

Primarily, the semantic difference between the two are related to which
record should be marked as dirty when the relationship changes. To
ensure that the semantics of your application match the framework,
please ensure that you are using `DS.belongsTo` at this time.

## Revision 3

### JSON Keys Automatically De-camelize

Previously, the key used to lookup an attribute from the JSON hash loaded
into the store was the same as the attribute defined in your `DS.Model`.
For example, if the model had a `firstName` attribute, we would look for
the `firstName` property in the hash provided by the server..

If you wanted to use a different key, you would need to provide an options
hash with the `key` property set:

```javascript
App.Person = DS.Model.extend({
  firstName: DS.attr('string', { key: 'first_name' }),
  lastName: DS.attr('string', { key: 'last_name' }),
  middleName: DS.attr('string', { key: 'middle_name' })
});
```

This obviously got very annoying very fast.

Now, models can have a `namingConvention` object that is responsible for
determining how record keys and hash keys are mapped. The `namingConvention`
object should implement two functions, `keyToJSONKey` and `foreignKey`. You
can create a subclass of `DS.Model` that you use in your application if you
want to share a naming convention between all of your models:

```javascript
App.Model = DS.Model.extend({
  namingConvention: {
    // LOUD NAMING CONVENTION
    // Changes fooKey to FOOKEY
    keyToJSONKey: function(key) {
      return key.toUpperCase();
    },

    // Determines the name of foreign keys in
    // belongsTo relationships
    foreignKey: function(key) {
      return key.toUpperCase()+"_ID";
    }
  }
});
```

By default, attributes are now de-camelized to determine hash keys,
and `_id` is added to the association name to determine foreign keys.

For example, here is a model and what JSON hash it would expect:

```javascript
App.Profile = DS.Model.extend({
  person: DS.belongsTo('App.Person'),

  firstName: DS.attr('string')
});

{
  id: 1,
  person_id: 3,
  first_name: "Steve"
}
```

If you want to revert to previous behavior, you can implement a simple naming convention
object that returns the key passed to it:

```javascript
DS.Model.reopen({
  namingConvention: {
    keyToJSONKey: function(key) {
      return key;
    },

    foreignKey: function(key) {
      return key;
    }
  }
});
```

## Revision 2

### Number Attributes

Previously, the attribute type used for number was `integer`. However,
since it also is the correct attribute type for floats, you should now
use `number`.

```javascript
// instead of
App.Person = DS.Model.extend({
  age: DS.attr('integer')
});

// do
App.Person = DS.Model.extend({
  age: DS.attr('number')
});
```

## Revision 1

### Filter Functions

Previously, the store's `filter()` method took a filtering function that
passed the hash in directly. It now passes a proxy object that
implements a `get()` method.

Instead of accessing properties of the hash directly, please use `get()`
inside your filter functions:

```javascript
// instead of
var coolPeople = Person.filter(function(person) {
  return person.name.test(/Tom/);
});

// do
var coolPeople = Person.filter(function(person) {
  return person.get('name').test(/Tom/);
});
```

### Retrieving JSON Representation in Adapters

Previously, a record's `data` property was a hash that contained the
JSON representation of the record that should be sent to your
persistence layer. Now that records store uncommitted changes in a
separate hash, you should use the new `toJSON()` method to retrieve the
data hash to be sent to the server.

We could have fixed up the `data` property to return the JSON
representation, and used a different property internally, but didn't
because:

* Compatibility with ES5's JSON serialization protocol required the
  implementation of a `toJSON` method.
* Before 1.0, we want to remove unnecessary cruft from the library.
  Since we need `toJSON` anyway for ES5 compatibility, we didn't want to
  keep around a legacy mechanism for doing the same thing.

(post 1.0, we absolutely would have left around the `data` hash)

```javascript
// instead of
$.ajax({
  data: record.get('data')
});

// do
$.ajax({
  data: record.toJSON()
});
```
