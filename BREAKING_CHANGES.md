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
