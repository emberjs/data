## Ember Data

Ember Data is a library for loading models from a persistence layer (such as
a JSON API), updating those models, then saving the changes. It provides many
of the facilities you'd find in server-side ORMs like ActiveRecord, but is
designed specifically for the unique environment of JavaScript in the browser.

This release is definitely alpha-quality. The basics work, but there are for
sure edge cases that are not yet handled. Please report any bugs or feature
requests, and pull requests are always welcome.

### Is It Good?

Yes.

### Is It "Production Ready™"?

No.

### Roadmap

* Manipulate associations client-side
* Handle error states
* Better built-in attributes

### Creating a Store

Every application has one or more stores. The store will be the repository
that holds loaded models, and is responsible for retrieving models that have
not yet been loaded.

```javascript
App.store = DS.Store.create();
```
    
You can tell the store how to talk to your backend by specifying an *adapter*.
By default, the store will assume a RESTful JSON API. However, you can specify
alternate adapters by setting the `adapter` property:

```javascript
App.store = DS.Store.create({
    adapter: 'DS.localStorageAdapter'
});
```

NOTE: The default RESTful adapter is in progress. For Rails applications, it
will work seamlessly with the `active_model_serializers` gem's conventions. In
the meantime, see the section on rolling your own adapter.

### Defining Models

For every type of data you'd like to represent, create a new subclass of
`DS.Model`:

```javascript
App.Person = DS.Model.extend();
```

You can specify which attributes a model has by using `DS.attr`. An attribute
represents a value that will exist in the underlying JSON representation of
the object, and which you also want to expose through the Ember object.

You can use attributes just like any other property, including as part of a
computed property. These attributes ensure that the values can be retrieved
from the underlying JSON representation and persisted later as needed.

```javascript
App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),

    fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');
    }.property('firstName', 'lastName'),

    birthday: DS.attr('date')
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

Models can be associated with other models. Use the `DS.hasMany()` method
to create a relationship from one model to others:

```javascript
App.Tag = DS.Model.extend({
    name: DS.attr('string')
});

App.Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(App.Tag)
});
```

In this case, associations should be stored as an array of IDs. The JSON
for a Person object might look like this:

```javascript
{
    "id": 1,
    "name": "Tom Dale",
    "tags": [1, 2]
}
```

and the JSON for the Tag objects would be represented like this:

```javascript
[{
    "id": 1,
    "name": "good-looking"
},

{
    "id": 2,
    "name": "not-too-bright"
}]
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
    tags: DS.hasMany(Tag, { embedded: true })
});
```

### Finding a Specific Model Instance

You can retrieve a model by its unique ID by using the `find` method:

```javascript
var model = App.store.find(App.Person, 1);
```

If that specific model has already been loaded, it will be returned
immediately. Otherwise, an empty object will be returned. You can setup
bindings and observers on the properties you're interested in; as soon
as the data returns from the persistence layer, all of the attributes
you specified will be updated automatically.

Besides `find()`, all of the methods described below operate in a similar
fashion. By returning empty objects, you can use the models returned from
the store immediately in your views. They will be updated automatically
as soon as the data is loaded.

### Querying Model Instances

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

Note: If manually retrieving models from a model array, you must use
the `objectAt(index)` method. Since the object is not a JavaScript Array,
using the `[]` notation will not work.

### Finding All Models of a Type

To find all models of a certain type, use the store's `findAll()` method:

```javascript
var models = App.store.findAll(App.Person);
```

All currently loaded models of that type will be immediately returned
in a `ModelArray`. Your adapter will also have an opportunity to load
additional models of that type if necessary.

### Filtering Loaded Models

You can filter all models of a type by calling the store's `filter()`
method with a function that determines whether the model should
be included or not. To avoid materializing model objects needlessly, only
the raw data hash returned from the persistence layer is passed.

To include a model, return `true`. If a model should not be included,
return `false` or `undefined`.

```javascript
var oldPeople = App.store.filter(App.Person, function(data) {
    if (data.age > 80) { return true; }
});
```

### Creating New Models

You can create new model with `create()`:

```javascript
var wycats = App.store.create(App.Person,  { name: "Brohuda" });
```

New models are not saved back to the persistence layer until the
store's `commit()` method is called.

### Updating Models

To update models, simply change a property on them. Updated models
will not be saved until the store's `commit()` method is called, which
allows you to batch changes.

### Deleting Models

To delete a model, call its `deleteModel()` method:

```javascript
var person = App.store.find(App.Person, 1);
person.deleteModel();
```

The model will not be deleted in the persistence layer until the store's
`commit()` method is called. However, deleted models will immediately be
removed from model arrays and associations.

**Note**: It's called `deleteModel` instead of `delete` because Internet Explorer
will complain. Sorry.


### Model Lifecycle

You can be notified when certain events occur in a model's lifecycle by
implementing methods on them:

* `didCreate` - called when the model has been successfully created in the persistence layer
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

You can also determine the state of a model by checking its state properties.

* `isLoaded` - true when the model has finished loading, always true for models created locally.
* `isDirty` - true for created, updated, or deleted models that have not yet been saved
* `isSaving` - true if the model is in the process of being saved
* `isDeleted` - true if the model has been deleted, either locally or on the server
* `isError` - true if the model is in an error state

### Loading Data

You can "pre-load" data into the store, so it's ready for your users
as soon as they need it.

To load an individual model, use the `load()` method:

```javascript
App.store.load(Person, {
    id: 1,
    firstName: "Peter",
    lastName: "Wagenet"
});
```

You can load multiple records using `loadMany()`:

```javascript
App.store.loadMany(Person, [{
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
    adapter: App.adapter
});
```

Next, implement the methods your adapter needs, as described below.

### find()

Implement `find()` to fetch and populate a model with a specific ID. Once the
model has been found, call the store's `load()` method:

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
            //   store.load(type, id, data.person)
            store.load(type, id, data);
        }
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

Implement `findMany()` to fetch and populate all of the models for a given list
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
            //   store.loadMany(type, ids, data.people)
            store.loadMany(type, ids, data);
        }
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
`findQuery()` method will be passed a model array that you should populate with
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
            // If your server returns a root, simply:
            //   modelArray.load(data.people)
            modelArray.load(data);
        });
    })
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
this is your opportunity to load any unloaded models of this type. The
implementation is similar to findMany(); see above for an example.
            
### create()

When `commit()` is called on the store and there are models that need to be
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
    create: function(store, type, model) {
        var url = type.url;

        jQuery.ajax({
            url: url.fmt(model.get('id')),
            data: model.get('data'),
            dataType: 'json',
            type: 'POST',
            
            success: function(data) {
                // data is a hash of key/value pairs representing the model.
                // In general, this hash will contain a new id, which the
                // store will now use to index the model. Future calls to
                // store.find(type, id) will find this model.
                store.didCreateModel(model, data);
            }
        });
    })
});
```

### createMany()

For better efficiency, you can implement a `createMany` method on your adapter,
which should send all of the new models to the server at once.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    createMany: function(store, type, array) {
        jQuery.ajax({
            url: type.collectionUrl,
            data: array.mapProperty('data'),
            dataType: 'json',
            type: 'POST',
            
            success: function(data) {
                // data is an array of hashes in the same order as
                // the original models that were sent.
                store.didCreateModels(type, array, data);
            }
        });
    })
});
```

### update()

Update is implemented the same as `create()`, except after the model has been
saved, you should call the store's `didUpdateModel()` method.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people/%@'
});

DS.Adapter.create({
    update: function(store, type, model) {
        var url = type.url;

        jQuery.ajax({
            url: url.fmt(model.get('id')),
            dataType: 'json',
            type: 'PUT',
            
            success: function(data) {
                // data is a hash of key/value pairs representing the model
                // in its current state on the server.
                store.didUpdateModel(model, data);
            }
        });
    })
});
```

### updateMany()

Again, `updateMany()` is very similar to `createMany()`.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    updateMany: function(store, type, array) {
        jQuery.ajax({
            url: type.collectionUrl,
            data: array.mapProperty('data'),
            dataType: 'json',
            type: 'PUT',
            
            success: function(data) {
                // data is an array of hashes in the same order as
                // the original models that were sent.
                store.didUpdateModels(array);
            }
        });
    })
});
```

### deleteModel()

To delete a model, implement the `deleteModel()` method, and call the store's
`didDeleteModel()` method when completed.

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    url: '/people/%@'
});

DS.Adapter.create({
    deleteModel: function(store, type, model) {
        var url = type.url;

        jQuery.ajax({
            url: url.fmt(model.get('id')),
            dataType: 'json',
            type: 'DELETE',
            
            success: function() {
                store.didDeleteModel(model);
            }
        });
    })
});
```

**Note**: The method is called `deleteModel` instead of `delete` because
Internet Explorer blows up if you have a method called `delete`. Sorry.

### deleteMany()

Are you getting it?

```javascript
App.Person = DS.Model.extend();
App.Person.reopenClass({
    collectionUrl: '/people'
});

DS.Adapter.create({
    deleteMany: function(store, type, array) {
        jQuery.ajax({
            url: type.collectionUrl,
            data: array.mapProperty('data'),
            dataType: 'json',
            type: 'DELETE',
            
            success: function(data) {
                store.didDeleteModels(array);
            }
        });
    })
});
```

### commit()

For maximum turbo-efficiency, you can package all pending changes (creates,
updates, and deletes) into one megapackage of data awesomeness. To do so,
implement `commit()`, which will be called with everything that needs
to be sent to the persistence layer.

Here's what the default adapter's `commit()` method looks like:

```javascript
commit: function(store, commitDetails) {
  commitDetails.updated.eachType(function(type, array) {
    this.updateMany(store, type, array.slice());
  }, this);

  commitDetails.created.eachType(function(type, array) {
    this.createMany(store, type, array.slice());
  }, this);

  commitDetails.deleted.eachType(function(type, array) {
    this.deleteMany(store, type, array.slice());
  }, this);
}
```

### Connecting to Views

Ember Data will always return models or model arrays immediately, even though
the underlying JSON objects have not yet been returned from the server.

In general, this means that you can insert them into the DOM using Ember's
Handlebars template engine, and they will automatically update when your
adapter has populated them.

For example, if you request a `ModelArray`:

```javascript
App.people = App.store.find(App.Person, { firstName: "Tom" });
```

You will get back a `ModelArray` that is currently empty. Ember Data will then
ask your adapter to populate the model Array, which will usually make an Ajax
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

The same is true of models themselves. For instance, you can make a request
for a single model:

```javascript
App.person = App.store.find(Person, 1);
```

You will immediately receive back a new unpopulated `Person` object. You can
refer to it in the view right away:

```html
{{App.person.fullName}}
```

Initially, this will be empty, but when your adapter calls `store.load(hash)`,
it will update with the information provided.

If you'd like to show different content while the model is in the process of
being loaded, you can use the model's `isLoaded` property:

```html
{{#with App.person}}
    {{#if isLoaded}}
        Hello, {{fullName}}!
    {{else}}
        Loading...
    {{/if}}
{{/with}}
```

Note that the same principle applies to model arrays, as well. Like models,
model arrays have an `isLoaded` property that you can use to display different
content.

You can also indicate to users when a model is saving, for example:

```html
{{#with App.person}}
    <h1 {{bindAttr class="isSaving"}}>{{fullName}}</h1>
{{/with}}
```

In this case, you could make the `is-saving` class in your CSS grey out the
content or add a spinner alongside it, for instance.

## Unit Tests

To run unit tests, run `rackup` from the root directory and visit
`http://localhost:9292/tests/index.html?package=ember-data`.

### What next?

Profit.

