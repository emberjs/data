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

## Revision 12

Several changes have been made to serialization conventions for the
JSON and REST adapters.

### Foreign Key IDs for Arrays

In order to be consistent with singular foreign keys, the REST serializer
now serializes arrays of foreign keys with the singular form of the key name
suffixed with `_ids`. Therefore, just as `author_id` represents a single
author, `author_ids` (and not `authors`) now represents an array of authors
associated with a parent record.

Custom `key` mappings can be configured to override these defaults as needed.

### Sideload by Type

When loading data, the previous convention was to expect sideloaded data
to be included alongside a parent record based on the name of its relationship.

For instance, given the following model:

```js
App.Contact  = DS.Model.extend({
  name:         DS.attr('string'),
  phoneNumbers: DS.hasMany('App.PhoneNumber'),
  homeAddress:  DS.belongsTo('App.Address')
  workAddress:  DS.belongsTo('App.Address')
});
```

... the following payload would be deserialized properly:

```js
{
  "contact": {
    "id": 1,
    "name": "Dan",
    "phone_numbers": [1, 2],
    "home_address_id": 3
    "work_address_id": 4
  },
  "phoneNumbers": [
    {
      "id": 1,
      "number": "555-1212"
    },
    {
      "id": 2,
      "number": "555-2222"
    }
  ],
  "homeAddress": [
    {
      "id": 3,
      "zip_code": "03086"
    }
  ],
  "workAddress": [
    {
      "id": 4,
      "zip_code": "94107"
    }
  ]
}
```

Now, `homeAddress` and `workAddress` will be expected to be sideloaded
together as `addresses` because they are the same type. Furthermore, the
default root naming conventions (underscore and lowercase) will now also
be applied to sideloaded root names.

The new, more consistent and concise conventions for sideloading are:

```js
{
  "contact": {
    "id": 1,
    "name": "Dan",
    "phone_number_ids": [1, 2],
    "home_address_id": 3
    "work_address_id": 4
  },
  "phone_numbers": [
    {
      "id": 1,
      "number": "555-1212"
    },
    {
      "id": 2,
      "number": "555-2222"
    }
  ],
  "addresses": [
    {
      "id": 3,
      "zip_code": "03086"
    },
    {
      "id": 4,
      "zip_code": "94107"
    }
  ]
}
```

Custom `sideloadAs` and `key` mappings can still be configured to override
these defaults as required.

## Revision 11

### Payload Extraction

Previously, the serializer was responsible for materializing a single
record. The adapter was responsible for decomposing multi-record
payloads into digestible chunks that the serializer could handle.

For example, the REST adapter supports "sideloading", which allows you
to include related records in a compact way. For example, the JSON
payload for a blog post and its comments may look like this:

```js
{
  "post": {
    "id": 1,
    "title": "Rails is omakase",
    "comments": [1, 2, 3]
  },

  "comments": [{
    "id": 1,
    "body": "But is it _lightweight_ omakase?"
  },
  {
    "id": 2,
    "body": "I for one welcome our new omakase overlords"
  },
  {
    "id": 3,
    "body": "Put me on the fast track to a delicious dinner"
  }]
}
```

Previously, the adapter would tease out each of the individual record
representations here, then pass them, one at a time, to the serializer.

We realized that conceptually it made more sense for the serializer to
be responsible for extracting records from the entire payload.

This became particularly important for us as we were working on the new
embedded feature. Because records may now include other records embedded
inside their JSON representation (arbitrarily deep), the lines between
the entire payload and an individual record representation became
blurred.

If you are sideloading data in your application and you are using 
JSONSerializer (like the DS.RESTAdapter does by default), you will need 
to utilize the DS.Adapter configure method for configuration:

```js
DS.RESTAdapter.configure('App.Post', {
  sideloadAs: 'posts' 
});
```

### New Adapter Acknowledgment API

Previously, if you were writing a custom adapter, you would acknowledge
that you had saved outstanding changes to your persistence layer by
invoking the related method on the store. For example, if the store
asked your adapter to update a given record, you would call
`store.didSaveRecord(record);` when you had completed the operation.

Because we noticed that there was significant boilerplate around this
operation, especially given the changes described above, the
acknowledgment hooks now live on the adapter and not the store. This
allows us to implement default behavior that interacts with both the
serializer and the store on your behalf, making authoring adapters
easier.

For example, instead of this:

```js
updateRecord: function(store, type, record) {
  this.ajax('/person/'+record.get('id'), {
    success: function(json) {
      store.didSaveRecord(record, json);
    }
  });
}
```

You would now call the adapter's own `didSaveRecord`:

```js
updateRecord: function(store, type, record) {
  this.ajax('/person/'+record.get('id'), {
    success: function(json) {
      this.didSaveRecord(store, type, record, json);
    }
  });
}
```

Making this small change automatically gives you support for
sideloaded and embedded records.

Previously, if the store asked your adapter to find a record by calling
its `find` method, you could simply load the record with the given ID
into the store by calling `store.load()`:

```js
find: function(store, type, id) {
  var url = type.url;
  url = url.fmt(id);

  jQuery.getJSON(url, function(data) {
    store.load(type, id, data);
  });
}
```

Now, you should instead call the adapter's own `didFindRecord`
acknowledgment method:

```js
find: function(store, type, id) {
  var url = type.url,
      self = this;

  url = url.fmt(id);

  jQuery.getJSON(url, function(data) {
    self.didFindRecord(store, type, data, id);
  });
}
```

Like with the above improvements, this small change automatically add
support for sideloaded and embedded records when your JSON server
responds to a request for a record.

Similarly, you should call the new adapter hooks `didFindAll`,
`didFindQuery`, and `didFindMany` when acknowledging the associated
operation.

### Normalized Relationship Names

Throughout Ember Data, we were referring to relationships as either
"relationships" or "associations." We have now tightened up our
terminology (and the related APIs) to always refer to them as
relationships.

For example, `DS.Model`'s `eachAssociation` became `eachRelationship`.

### Loading Data

Previously, some features of the store, such as `load()`, assumed a
single adapter.

If you want to load data from your backend without the application
asking for it (for example, through a WebSockets stream), use this API:

```js
store.adapterForType(App.Person).load(store, App.Person, payload);
```

This API will also handle sideloaded and embedded data. We plan to add a
more convenient version of this API in the future.

#### Changes to Dirtying Records

If you previously implemented the developer hooks in your adapter for 
```dirtyRecordsForHasManyChange``` or any of the other dirtyRecords hooks,
you will need to double check how you're utilizing the passed in arguments.

A description of the relationship is now passed in representing both sides
of the relationship.  

For example, if you had this previously:
```js
dirtyRecordsForHasManyChange: function(dirtySet, parent, relationship){
  if (relationship.hasManyName === "people") {
    dirtySet.add(parent);
  }
}
```

You would now use this:
```js
dirtyRecordsForHasManyChange: function(dirtySet, parent, relationship){
  if (relationship.secondRecordName === "people") {
    dirtySet.add(parent);
  }
}
```

#### TL;DR

If you are using the REST adapter, you can now include embedded records
without making any changes.  Additionally, if you are sideloading records,
you will need to make the changes described in the Payload Extraction section.

If you were manually loading data into the store, use the new
`Adapter#load` API instead of `Store#load`.

## Revision 10

In Revision 8, we started the work of making serializers agnostic to the
underlying serialization format.

This was a good start but did not go far enough. Additionally, many
people hated our initial API naming decisions, so some of the changes
in this revision are an attempt to evolve the naming in a more intuitive
direction.

### JSON Serializer

Despite our attempts in Revision 8, there were still some lingering JSON
semantics in `DS.Serializer`. Now, we have extracted all of these into a
new class called `DS.JSONSerializer`, which inherits from
`DS.Serializer`.

`DS.Serializer` is an abstract base class that implements hooks for
serializing records common to all serialization formats, whether they
are JSON, typed arrays, binary representations, or whatever other format
your server engineers dream up.

`DS.JSONSerializer` is a concrete implementation that encodes specific
JSON semantics. If your adapter needs to "speak JSON" and you need to
customize how that happens, you should now subclass `DS.JSONSerializer`
instead of `DS.Serializer`.

Additionally, `DS.RESTAdapter` uses a subclass of `DS.JSONSerializer`
called `DS.RESTSerializer`. The `RESTSerializer` adds relational
semantics to the `JSONSerializer`, encoding one-to-many relationships as
foreign keys on child records.

#### TL;DR

If you are using the REST adapter, no changes are necessary.

If your app was subclassing `DS.Serializer`, change it to subclass
`DS.JSONSerializer`.

If you are serializing to binary representations, hooray! You can use
`DS.Serializer` and you will not need to fight against assumptions about
it being JSON. This is a very advanced use case that most users will not
need to worry about.

### fromData/toData Rename

Feedback about our rename of the `toJSON` method to `toData` and
`fromJSON` to `fromData` was not positive. Instead, we are now changing
these to `serialize` and `deserialize`, respectively. This change
applies to `DS.Model`, `DS.Serializer`, and the serializer's transform
API.

## Revision 9

### Adapter-Specified Record Dirtying

One of the goals of Ember Data is to separate application semantics from
server semantics. For example, you should be able to handle changes to
a back-end API formats with minimal changes to your application's code.
You could even switch to using a browser-resident database like
IndexedDB or WebSQL and have only a single file to change.

Ember Data accomplishes this by isolating server-specific code in the
_adapter_. The adapter is responsible for translating
application-specific semantics into the appropriate actions for the
current backend.

To do this, the store must be able to provide as much information as
possible to the adapter, so that developers can write adapters for
key-value stores, like Riak and MongoDB; JSON APIs powered by relational
databases, like Rails talking to PostgreSQL or MySQL; novel transport
mechanisms, like WebSockets; local databases, like IndexedDB; and
whatever other persistence schemes may be dreamed up in the future.

Previously, the store would gather up as much information as possible as
changes happened in the application. Only when the current transaction
was committed (via `transaction.commit()` or `store.commit()`) would all
of the information about what changed be bundled up and sent to the
adapter to be saved.

Remember that the store needs to keep track of the state of records so
it knows what needs to be saved. In particular, a record loaded into the
store starts off "clean"—this means that, as far as we know, the copy we
have on the client is the same as the copy on the server.

A record becomes "dirty" when we change it in some way from the version
we received from the server.

Obviously, a record becomes dirty if we change an attribute. For
example, if we change a record's `firstName` attribute from `"Peter"` to
`"Louis"`, the record is dirty.

But what happens if the _relationship_ between two records changes?
Which records should be considered dirty?

Consider the case where we have two `App.User` records, `user1` and
`user2`, and an `App.Post` record, `post`, which represents a blog post.
We want to change the author of the post from `user1` to `user2`:

```javascript
post.get('author');
//=> user1
post.set('author', user2);
```

Now, which of these records should we consider dirty? That is, which of
these records needs to be sent to the adapter to be saved? Just the
post? The old author, `user1`? The new author, `user2`? All three?

Your answer to this question depends heavily on how you are encoding
your relationships, which itself depends heavily on the persistence
strategy you're using.

If you're using a key-value store, like IndexedDB or Riak, your instinct
is probably to save one-to-many relationships on the parent. For
example, if you were sending the JSON for `user2` to your server via
XHR, it would probably look something like this:

```javascript
{
  "author": {
    "name": "Tony",
    "posts": [1, 2, 3]
  }
}
```

If, on the other hand, you were using a relational database with
something like Ruby on Rails, your instinct would probably be to encode
the relationship as a _foreign key_ on the child. In other words, when
this relationship changed, you would send `post` to the server via a
JSON representation that looked like this:

```javascript
{
  "post": {
    "title": "Allen Ginsberg on Node.js",
    "body": "I saw the best minds of my generation destroyed by madness, starving hysterical naked, dragging themselves through the negro streets at dawn looking for an angry fix,\
angelheaded hipsters burning for the ancient heavenly connection to the starry dynamo in the machinery of night,\
who poverty and tatters and hollow-eyed and high sat up smoking in the supernatural darkness of cold-water flats floating across the tops of cities contemplating jazz",

    "author_id": 1
  }
}
```

Previously, Ember Data implemented a strategy of picking the "lowest
common denominator." In other words, because we did not know what
information the adapter needed, or how it would encode relationships, we
simply marked **all** records involved in a relationship change (old
parent, new parent, and child) as dirty. If the adapter did not need to
send changes to the server for a particular record, it was the
responsibility of the adapter to immediately release those unneeded records.

This strategy served us well, until we came to the case of **embedded
records** (which we are working on, but have not yet finished). In this
case, choosing the "lowest common denominator" strategy and marking all
records that could _possibly_ be dirty quickly became pathological.

Imagine the case where you are writing a blog app. For legacy reasons,
your JSON API embeds comments inside of posts, which are themselves
embedded inside a root blog object. So, for example, when your app asks
for a particular blog, it receives back a JSON payload that looks like
this:

```javascript
{
  "blog": {
    "title": "Shit HN Says",
    "posts": [{
      "title": "Achieving Roflscale",
      "comments": [{
        "body": "Why not choose a more lightweight solution?",
        "upvotes": 256
      }]
    }]
  }
}
```

Let's say we want to upvote the comment:

```javascript
comment.incrementProperty('upvotes');
```

In this particular case, we actually need to mark the **entire graph as
dirty**. And because the store had no visibility into whether or not the
adapter treated records as embedded, the "lowest common denominator"
rule that we had used before meant that we would *have to mark entire
graphs as dirty if a single attribute changed*.

We knew we would be pilloried if we tried to suggest that as a serious
solution to the problem.

So, after much discussion, we have introduced several new hooks into the
adapter. These hooks allow the store to ask the adapter about dirtying
semantics *as soon as changes happen*. This is a fundamental change from
how the adapter/store relationship worked before.

Previously, the *only* time the store conferred with the adapter was
when committing a transaction (with the exception of `extractId`, which
is used to preprocess data payloads from the adapter).

Now, every time an attribute or relationship changes, it is the
adapter's responsibility to populate the set of records which the store
should consider dirty. 

Here are the hooks available at present:

* `dirtyRecordsForAttributeChange`
* `dirtyRecordsForBelongsToChange`
* `dirtyRecordsForHasManyChange`

Each hook gets passed a `dirtySet` that it should populate with records
to consider dirty, via the `add()` method.

An implementation of the attribute change hook might look like this:

```javascript
dirtyRecordsForAttributeChange: function(dirtySet, record, attributeName, newValue, oldValue) {
  // Only mark the record as dirty if the new value
  // is different from the old value
  if (newValue !== oldValue) {
    dirtySet.add(record);
  }
}
```

If you are implementing an adapter with relational semantics, you can
tell the store to only dirty child records in response to relationship
changes like this:

```javascript
dirtyRecordsForBelongsToChange: function(dirtySet, child) {
  dirtySet.add(child);
}
```

Adapters with key-value semantics would simply implement the same hook
for has-many changes:

```javascript
dirtyRecordsForHasManyChange: function(dirtySet, parent) {
  dirtySet.add(parent);
}
```

As we explore this brave new world together, you can expect similar
"runtime hooks" (as opposed to commit-time hooks) to appear in the
adapter API.

#### TL;DR

Adapters can now tell the store which records become dirty in response
to changes. If you are using the built-in `DS.RESTAdapter`, these
changes do not affect you.

### Removal of Dirty Factors

Previously, your adapter could query a record for the reasons it had
been considered dirty. For example, `record.isDirtyBecause('belongsTo')`
would return `true` if the adapter was dirty because one of its
`belongsTo` relationships had changed.

This was necessary because the adapter received all of the records
associated with a relationship change at once, and had to "reverse
engineer" what had happened and which records it cared about (see above
section for more discussion.)

Now, because adapters are notified about changes as they happen, and
can control which items are marked as dirty, it is no longer necessary
for adapters to be able to introspect records for _why_ they are dirty;
de facto, if they are being given to the adapter, it is because the
adapter told the store it wanted them to be dirty.

Therefore, `DS.Model`'s `isDirtyBecause()` method has been removed. If
you still need this information in your adapter, it will be your
responsibility to do any bookkeeping in the
`dirtyRecordsForAttributeChange` hook described above.

### Single Commit Acknowledgment Hook

Previously, the store took responsibility for tracking *which* things
were dirty about a record. Only after all "dirty factors" had been
acknowledged by the adapter as saved would the store transition the
record back into the "clean" state.

Now, responsibility for transitioning a record is solely the adapter's.
This architecture lays the groundwork for the ability to have multiple
adapters; for example, you can imagine having an IndexedDB-based
write-through cache adapter for offline mode, and a WebSockets-based
adapter for when your user has an internet connection.

Previous "acknowledgement" API methods on the store have been removed,
such as `didCreateRecord()` and `didDeleteRecord()`. Now, the only
acknowledgement an adapter can perform is `didSaveRecord()`, which tells
the store that all changes to the record have been saved.

If saving changes to a record is not an atomic operation in your
adapter, keeping track of which more granular operations have occurred
is now the responsibility of the adapter.

## Revision 8

### Making Data Format-Agnostic

Previously, many areas of Ember Data assumed that data exchanged with
the adapter was represented in JSON form. Many of the serializer APIs
cemented this bias by including JSON in method names.

While we anticipate that most Ember.js applications will continue to use
JSON as the primary mechanism for data interchange with a server, we
also want to support innovation in how data is exchanged.

For example, MongoDB can exchange data as BSON--a binary encoded
serialization of JSON. Or, if you are writing a data-heavy application,
we want you to be free to transmit data to the client in whatever form
is most efficient. Now that mainstream browsers support JavaScript
`Blob` objects and `TypedArray`s, we anticipate this use case will
become more and more common.

To that end, we have made two changes:

1. Any information that the store needs from data provided by the
   adapter is interpreted via the serializer. For example, instead of
   asking for the ID of a data hash via `data.id`, the store will call the
   adapter's `extractId` method. This change should not affect
   applications.
2. Any methods that contained the term `JSON` have been replaced with
   versions that use `Data`. For example,
   `DS.Serializer`'s `toJSON` method has been renamed to `toData`.
   Similarly, the `transformValueFromJSON` method has been renamed to
   `transformValueFromData`. This change should only affect applications
   that use customized serializers, or were calling `toJSON` on records.
   Because only names and not semantics have changed, this should be a
   quick find and replace to bring your app up-to-date.

## Revision 7

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


## Revision 6

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
