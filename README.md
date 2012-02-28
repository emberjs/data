## Ember Data

Ember Data is a library for loading models from a persistence layer (such as
a JSON API), updating those models, then saving the changes. It provides many
of the facilities you'd find in server-side ORMs like ActiveRecord, but is
designed specifically for the unique environment of JavaScript in the browser.

This release is definitely alpha-quality. The basics work, but there are for
sure edge cases that are not yet handled. Please report any bugs or feature
requests, and pull requests are always welcome.

#### Is It Good?

Yes.

#### Is It "Production Ready™"?

No. Breaking changes, indexed by date, are listed in
[`BREAKING_CHANGES.md`](https://github.com/emberjs/data/blob/master/BREAKING_CHANGES.md).

#### Roadmap

* Manipulate associations client-side
* Handle error states
* Better built-in attributes
* Editing "forked" records and rolling back transactions
* Out-of-the-box support for Rails apps that follow the `active_model_serializers` gem's conventions.
* Handle partially-loaded records

### Creating a Store

Every application has one or more stores. The store will be the repository
that holds loaded models, and is responsible for retrieving models that have
not yet been loaded.

```javascript
App.store = DS.Store.create({
  revision: 2
});
```

> NOTE: The revision property is used by `ember-data` to notify you of
> breaking changes to the public API before 1.0. For new applications,
> just set the revision to this number. See
> [BREAKING CHANGES](https://github.com/emberjs/data/blob/master/BREAKING_CHANGES.md)
> for more information.
    
You can tell the store how to talk to your backend by specifying an *adapter*.
Ember Data comes with a RESTful JSON API adapter. You can specify this adapter
by setting the `adapter` property:

```javascript
App.store = DS.Store.create({
  revision: 2,
  adapter: DS.RESTAdapter.create({ bulkCommit: false })
});
```

The REST adapter will send bulk commits to your server by default. If your
REST API does not support bulk operations, you can turn them off by specifying the
`bulkCommit` option (as illustrated above.)

The RESTful adapter is still in progress. For Rails applications, we plan to make
it work seamlessly with the `active_model_serializers` gem's conventions. In
the meantime, see the section on rolling your own adapter.

### Defining Models

For every type of data you'd like to represent, create a new subclass of
`DS.Model`:

```javascript
App.Person = DS.Model.extend();
```

You can specify which attributes a model has by using `DS.attr`. An attribute
represents a value that will exist in the underlying JSON representation of
the object which you'd also want to expose through the Ember object.

You can use attributes just like any other property, including as part of a
computed property. These attributes ensure that the values can be retrieved
from the underlying JSON representation and persisted later as needed.

```javascript
App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    birthday: DS.attr('date'),

    fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');
    }.property('firstName', 'lastName')
});
```

Valid attribute types are `string`, `integer`, `boolean`, and `date`. You
can also register custom attribute types. For example, here's a `boolString`
attribute type that converts booleans into the string `"Y"` or `"N"`:

```javascript
DS.attr.transforms.boolString: {
    from: function(serialized) {
        if (serialized === 'Y') {
            return true;
        }
        
        return false;
    },

    to: function(deserialized) {
        if (deserialized) {
            return "Y";
        }
        return "N";
    }
}
```

Built-in attribute types are currently very primitive. Please help us
flesh them out with patches and unit tests!

By default, the store uses a model's `id` attribute as its primary key.
You can specify a different key by setting the `primaryKey` property:

```javascript
DS.Model.extend({
    primaryKey: 'guid'
});
```

### Associations

Models can be associated with other models. Ember Data includes several
built-in types to help you define how your models relate to each other.

#### Has One

A `hasOne` association declares that a model is associated with exactly
one other model. For example, imagine we're writing a blog application that
allows authors to post entries. Each author has a profile associated with
their account that is displayed when visitors want to learn more about them.

```javascript
App.Profile = DS.Model.extend({
  about: DS.attr('string'),
  postCount: DS.attr('number')
});

App.Author = DS.Model.extend({
  profile: DS.hasOne('App.Profile'),
  name: DS.attr('string')
});
```

Now, when we have an `Author` record, we can easily find its related `Profile`:

```javascript
var author = App.store.find(App.Author, 1);
author.get('name'); // "Timothy Leary"
author.get('profile'); // App.Profile
author.getPath('profile.postCount'); // 1969
```

#### Belongs To

Similar to `hasOne`, `belongsTo` sets up a one-to-one relationship from one model
to another. Let's revise the example above so that, in addition to being able
to find an author's profile, we can find the author associated with a profile:

```javascript
App.Profile = DS.Model.extend({
  about: DS.attr('string'),
  postCount: DS.attr('number'),
  author: DS.belongsTo('App.Author')
});

App.Author = DS.Model.extend({
  profile: DS.hasOne('App.Profile'),
  name: DS.attr('string')
});
```

So, when should you use `hasOne` and when should you use `belongsTo`? The difference
is where the information about the relationship is stored at the persistence layer.

The record with the `belongsTo` relationship will save changes to the association
on itself. Conversely, the record with the `hasOne` relationship asks the persistence
layer what record belongs to it. If the relationship changes, only the record with
the `belongsTo` relationship must be saved.

#### Has Many

Use the `hasMany()` method to describe a relationship where multiple models belong
to a single model. In our blog engine example, a single blog post may have multiple
comments:

```javascript
App.Comment = DS.Model.extend({
    content: DS.attr('string'),
    post: DS.belongsTo('App.Post')
});

App.Post = DS.Model.extend({
    content: DS.attr('string'),
    comments: DS.hasMany('App.Comment')
});
```

### Representing Associations

#### One-to-One

The default REST adapter supports several different variations for
representing associations to best fit the needs of your application.
We'll examine each of the different types of associations in turn.

Let us first discuss a typical one-to-one relationship. We'll use the
example of the `Profile` and `Author` from above. In that example, we
have a `Profile` that belongs to an `Author`, and an `Author` that has
one `Profile`. The simplest way to represent these two records' JSON
structure is as follows:

```javascript
// Author
{
  "id": 1,
  "name": "Tom Dale"
}

// Profile
{
  "id": 1,
  "about": "Tom Dale is a software engineer that drinks too much beer.",
  "postCount": 1984,
  "author_id": 1
}
```

Note that in the above example, the JSON for our `Author` does not contain
any information about how to find its related `Profile`. If you were to
request the profile, like this:

```javascript
author.get('profile');
```

…the REST adapter would send a request to the URL
`/profiles?author_id=1`. (Asking the `Profile` for its `Author` would
not generate an additional request, because the ID of the associated
`Author` is built-in to the response.)

As a performance optimization, the REST API can return the ID of the
`Profile` in the `Author` JSON:

```javascript
// Author with included Profile id
{
  "id": 1,
  "name": "Tom Dale",
  "profile_id": 1
}
```

Now, if you ask for the author's profile, one of two things will happen.
If the `Profile` with that ID has already been loaded at any point
during the execution of the app, it will be returned immediately without
any additional requests. Otherwise, the REST adapter will make a request
to `/profile/1` to load that specific profile.

In some cases, if you know that you will always being using both records
in an association, you may want to minimize the number of HTTP requests
by including both records in the same JSON.

One option is to embed the association directly in the parent record.
For example, we could represent the entirety of the association above
like this:

```javascript
{
  "authors": [{
    "id": 1,
    "name": "Tom Dale",
    "profile": {
      "id": 1,
      about: "Tom Dale is a software engineer that drinks too much beer.",
      postCount: 1984,
      author_id: 1
    }
  }]
}
```

Another option is to use the format described above (with the ID embedded),
then "sideloading" the records. For example, we could represent the
entirety of the association above like this:

```javascript
{
  "authors": [{
    "id": 1,
    "name": "Tom Dale",
    "profile_id": 1
  }],

  "profiles": [{
    "id": 1,
    about: "Tom Dale is a software engineer that drinks too much beer.",
    postCount: 1984,
    author_id: 1
  }]
}
```

However, imagine the JSON returned from the server for a Person looked like this:

```javascript
{
  "id": 1,
  "name": "Tom Dale",
  "tags": [{
    "id": 1,
    "name": "good-looking"
  },

  {
    "id": 2,
    "name": "not-too-bright"
  }]
}
```

In this case, instead of the association being an array of ids, it is an
array of *embedded* objects. To have the store understand these correctly,
set the `embedded` option to true:

```javascript
App.Person = DS.Model.extend({
    tags: DS.hasMany('App.Tag', { embedded: true })
});
```

It is also possible to change the data attribute that an association is mapped
to. Suppose the JSON for a person looked like this:

```javascript
{
    "id": 2,
    "name": "Carsten Nielsen",
    "tag_ids": [1, 2]
}
```

In this case, you would specify the key in the association like this:

```javascript
App.Person = DS.Model.extend({
    tags: DS.hasMany('App.Tag', { key: 'tag_ids' })
});
```

### Finding a Specific Record Instance

You can retrieve a record by its unique ID by using the `find` method:

```javascript
var model = App.store.find(App.Person, 1);
```

If that specific record has already been loaded, it will be returned
immediately. Otherwise, an empty object will be returned. You can setup
bindings and observers on the properties you're interested in; as soon
as the data returns from the persistence layer, all of the attributes
you specified will be updated automatically.

Besides `find()`, all of the methods described below operate in a similar
fashion.

### Querying Record Instances

You can make a server query by passing an Object as the second parameter to
find. In this case, you will get back a `ModelArray` object.

```javascript
App.people = App.store.find(App.Person, { page: 1 });
```

At first, this `people` array will have no elements. Later, we will see how
your adapter will populate the `people`. Because the `people` array is an
Ember Array, you can immediately insert it into the DOM. When it becomes
populated later, Ember's bindings will automatically update the DOM.

```html
<ul>
{{#each App.people}}
  <li>{{fullName}}</li>
{{/each}}
</ul>
```

This will allow you to ask the store for an Array of information, and keep your
view code completely agnostic to how the Array becomes populated.

Note: If manually retrieving records from a `ModelArray`, you must use
the `objectAt(index)` method. Since the object is not a JavaScript Array,
using the `[]` notation will not work.

### Finding All Records of a Model Type

To find all records of a certain type, use the store's `findAll()` method:

```javascript
var people = App.store.findAll(App.Person);
```

All currently loaded records of that type will be immediately returned
in a `ModelArray`. Your adapter will also have an opportunity to load
additional records of that type if necessary.

Whenever a new record is loaded into the store for the type in question,
the `ModelArray` returned by `findAll` will update to reflect the new
data. This means that you can pass it to a `#each` in an Ember template
and it will stay up to date as new data is loaded.

### Filtering Loaded Records

You can filter all records of a model type by calling the store's `filter()`
method with a function that determines whether the record should
be included or not. To avoid materializing record objects needlessly, only
the raw data hash returned from the persistence layer is passed.

To include a record, return `true`. If a record should not be included,
return `false` or `undefined`.

```javascript
var oldPeople = App.store.filter(App.Person, function(data) {
    if (data.age > 80) { return true; }
});
```

### Creating New Records

You can create new record based on a particular model definition with `createRecord()`:

```javascript
var wycats = App.store.createRecord(App.Person,  { name: "Brohuda" });
```

New records are not saved back to the persistence layer until the
store's `commit()` method is called.

### Updating Records

To update records, simply change a property on them. Updated records
will not be saved until the store's `commit()` method is called, which
allows you to batch changes.

### Deleting Records

To delete a record, call its `deleteRecord()` method:

```javascript
var person = App.store.find(App.Person, 1);
person.deleteRecord();
```

The record will not be deleted in the persistence layer until the store's
`commit()` method is called. However, deleted records will immediately be
removed from its `ModelArray` and associations.

### Record Lifecycle

You can be notified when certain events occur in a record's lifecycle by
implementing methods on them:

* `didCreate` - called when the record has been successfully created in the persistence layer
* `didUpdate` - called when changes have been successfully saved to the persistence layer
* `didLoad` - called when data has finished loading from the persistence layer

For example:

```javascript
App.Person = DS.Model.extend({
    didLoad: function() {
        alert(this.get('firstName') + " finished loading.");
    }
});
```

You can also determine the state of a record by checking its state properties.

* `isLoaded` - true when the record has finished loading, always true for models created locally.
* `isDirty` - true for created, updated, or deleted records that have not yet been saved
* `isSaving` - true if the record is in the process of being saved
* `isDeleted` - true if the record has been deleted, either locally or on the server
* `isError` - true if the record is in an error state

### Loading Data

You can "pre-load" data into the store, so it's ready for your users
as soon as they need it.

To load an individual record, use the `load()` method:

```javascript
App.store.load(App.Person, {
    id: 1,
    firstName: "Peter",
    lastName: "Wagenet"
});
```

You can load multiple records using `loadMany()`:

```javascript
App.store.loadMany(App.Person, [{
    id: 2,
    firstName: "Erik",
    lastName: "Brynjolsofosonsosnson"
},

{
    id: 3,
    firstName: "Yehuda",
    lastName: "Katz"
}]);
```

## Adapter API

An adapter is an object that receives requests from a store and translates
them into the appropriate action to take against your persistence layer. The
persistence layer is usually an HTTP API, but may be anything, such as the
browser's local storage.

### Creating an Adapter

First, create a new instance of `DS.Adapter`:

```javascript
App.adapter = DS.Adapter.create();
```

To tell your store which adapter to use, set its `adapter` property:

```javascript
App.store = DS.Store.create({
  revision: 2,
  adapter: App.adapter
});
```

Next, implement the methods your adapter needs, as described below.

### find()

Implement `find()` to fetch and populate a record with a specific ID. Once the
record has been found, call the store's `load()` method:

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people/%@'
});

DS.Adapter.create({
    find: function(store, type, id) {
        var url = type.url;
        url = url.fmt(id);

        jQuery.getJSON(url, function(data) {
            // data is a Hash of key/value pairs. If your server returns a
            // root, simply do something like:
            // store.load(type, id, data.person)
            store.load(type, id, data);
        });
    }
});
```

The store will call your adapter's `find()` method when you call
`store.find(type, id)`.

**Note** that for the rest of this documentation, we will use the `url` property in
our adapter. This is *not* the only way to write an adapter. For instance, you
could simply put a case statement in each method and do something different per
type. Or you could expose different information on your types that you use in
the adapter. We are simply using `url` to illustrate how an adapter is written.

### findMany()

Implement `findMany()` to fetch and populate all of the records for a given list
of IDs. The default `findMany()` will repeatedly invoke `find()`, but this may
be extremely inefficient. If you can, your server should support a way to find
many items by a list of IDs.

Once you are ready to populate the store with the data for the requested IDs,
use the loadMany method:

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people?ids=%@'
});

DS.Adapter.create({
    findMany: function(store, type, ids) {
        var url = type.url;
        url = url.fmt(ids.join(','));
        
        jQuery.getJSON(url, function(data) {
            // data is an Array of Hashes in the same order as the original
            // Array of IDs. If your server returns a root, simply do something
            // like:
            // store.loadMany(type, ids, data.people)
            store.loadMany(type, ids, data);
        });
    }
});
```

#### Implementing findMany in Rails

It is extremely easy to implement an endpoint that will find many items in
Ruby on Rails. Simply define the `index` action in a standard resourceful
controller to understand an `:ids` parameter.

```ruby
class PostsController < ApplicationController
  def index
    if ids = params[:ids]
      @posts = Post.where(:id => ids)
    else
      @posts = Post.scoped
    end

    respond_with @posts
  end
end
```

### findQuery()

Called when the store's `find()` method is called with a query. Your adapter's
`findQuery()` method will be passed a `ModelArray` that you should populate with
the results returned by the server.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    findQuery: function(store, type, query, modelArray) {
        var url = type.collectionUrl;
        
        jQuery.getJSON(url, query, function(data) {
            // data is expected to be an Array of Hashes, in an order
            // determined by the server. This order may be specified in
            // the query, and will be reflected in the view.
            //
            // If your server returns a root, simply do something like:
            // modelArray.load(data.people)
            modelArray.load(data);
        });
    }
});
```

You can do whatever you want with the query in your adapter, but most commonly,
you will just send it along to the server as the `data` portion of an Ajax
request.

Your server will then be responsible for returning an Array of JSON data. When
you load the data into the `modelArray`, the elements of that Array will be
loaded into the store at the same time.

### findAll()

Invoked when `findAll()` is called on the store. If you do nothing, only
models that have already been loaded will be included in the results. Otherwise,
this is your opportunity to load any unloaded records of this type. The
implementation is similar to findMany(); see above for an example.
            
### createRecord()

When `commit()` is called on the store and there are records that need to be
created on the server, the store will call the adapter's `create()` method.

Once the store calls the adapter's `create` method, it will be put into a
`saving` state, and further attempts to edit the model will result in an
error.

Implementing a `create` method is straight forward:

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people/%@'
});

DS.Adapter.create({
    createRecord: function(store, type, model) {
        var url = type.url;

        jQuery.ajax({
            url: url.fmt(model.get('id')),
            data: model.get('data'),
            dataType: 'json',
            type: 'POST',
            
            success: function(data) {
                // data is a hash of key/value pairs representing the record.
                // In general, this hash will contain a new id, which the
                // store will now use to index the record. Future calls to
                // store.find(type, id) will find this record.
                store.didCreateRecord(model, data);
            }
        });
    })
});
```

### createRecords()

For better efficiency, you can implement a `createRecords` method on your adapter,
which should send all of the new models to the server at once.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    createRecords: function(store, type, array) {
        jQuery.ajax({
            url: type.collectionUrl,
            data: array.mapProperty('data'),
            dataType: 'json',
            type: 'POST',
            
            success: function(data) {
                // data is an array of hashes in the same order as
                // the original records that were sent.
                store.didCreateRecords(type, array, data);
            }
        });
    })
});
```

### updateRecord()

Update is implemented the same as `createRecord()`, except after the record has been
saved, you should call the store's `didUpdateRecord()` method.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people/%@'
});

DS.Adapter.create({
    updateRecord: function(store, type, model) {
        var url = type.url;

        jQuery.ajax({
            url: url.fmt(model.get('id')),
            dataType: 'json',
            type: 'PUT',
            
            success: function(data) {
                // data is a hash of key/value pairs representing the record
                // in its current state on the server.
                store.didUpdateRecord(model, data);
            }
        });
    })
});
```

### updateRecords()

Again, `updateRecords()` is very similar to `createRecords()`.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    updateRecords: function(store, type, array) {
        jQuery.ajax({
            url: type.collectionUrl,
            data: array.mapProperty('data'),
            dataType: 'json',
            type: 'PUT',
            
            success: function(data) {
                // data is an array of hashes in the same order as
                // the original records that were sent.
                store.didUpdateRecords(array);
            }
        });
    })
});
```

### deleteRecord()

To delete a record, implement the `deleteRecord()` method, and call the store's
`didDeleteRecord()` method when completed.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people/%@'
});

DS.Adapter.create({
    deleteRecord: function(store, type, model) {
        var url = type.url;

        jQuery.ajax({
            url: url.fmt(model.get('id')),
            dataType: 'json',
            type: 'DELETE',
            
            success: function() {
                store.didDeleteRecord(model);
            }
        });
    })
});
```

### deleteRecords()

Are you getting it?

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    deleteRecords: function(store, type, array) {
        jQuery.ajax({
            url: type.collectionUrl,
            data: array.mapProperty('data'),
            dataType: 'json',
            type: 'DELETE',
            
            success: function(data) {
                store.didDeleteRecords(array);
            }
        });
    })
});
```

### commit()

For maximum turbo-efficiency, you can package all pending changes (creates,
updates, and deletes) into one mega package of data awesomeness. To do so,
implement `commit()`, which will be called with everything that needs
to be sent to the persistence layer.

Here's what the default adapter's `commit()` method looks like:

```javascript
commit: function(store, commitDetails) {
  commitDetails.updated.eachType(function(type, array) {
    this.updateRecords(store, type, array.slice());
  }, this);

  commitDetails.created.eachType(function(type, array) {
    this.createRecords(store, type, array.slice());
  }, this);

  commitDetails.deleted.eachType(function(type, array) {
    this.deleteRecords(store, type, array.slice());
  }, this);
}
```

### Connecting to Views

Ember Data will always return records or arrays of records of a certain type 
immediately, even though the underlying JSON objects have not yet been returned 
from the server.

In general, this means that you can insert them into the DOM using Ember's
Handlebars template engine, and they will automatically update when your
adapter has populated them.

For example, if you request a `ModelArray`:

```javascript
App.people = App.store.find(App.Person, { firstName: "Tom" });
```

You will get back a `ModelArray` that is currently empty. Ember Data will then
ask your adapter to populate the `ModelArray` with records, which will usually make an Ajax
request. Howver, you can immediately refer to it in your templates:

```html
<ul>
{{#each App.people}}
    <li>{{fullName}}</li>
{{/each}}
</ul>
```

Once the Adapter calls `modelArray.load(array)`, the DOM will automatically
populate with the new information.

The same is true of records themselves. For instance, you can make a request
for a single record:

```javascript
App.person = App.store.find(App.Person, 1);
```

You will immediately receive back a new unpopulated `Person` object. You can
refer to it in the view right away:

```html
{{App.person.fullName}}
```

Initially, this will be empty, but when your adapter calls `store.load(hash)`,
it will update with the information provided.

If you'd like to show different content while a record is in the process of
being loaded, you can use the record's `isLoaded` property:

```html
{{#with App.person}}
    {{#if isLoaded}}
        Hello, {{fullName}}!
    {{else}}
        Loading...
    {{/if}}
{{/with}}
```

Note that the same principle applies to `ModelArray`s, as well. Like records, a
`ModelArray` has an `isLoaded` property that you can use to display different
content.

You can also indicate to users when a record is saving, for example:

```html
{{#with App.person}}
    <h1 {{bindAttr class="isSaving"}}>{{fullName}}</h1>
{{/with}}
```

In this case, you could make the `is-saving` class in your CSS grey out the
content or add a spinner alongside it, for instance.

## Unit Tests

To run unit tests, run `bundle exec rackup` from the root directory and visit
`http://localhost:9292/tests/index.html?package=ember-data`.

### What next?

Profit.
