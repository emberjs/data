# Ember Data Changelog

### Master

### Release 1.0.0-beta.16.1 (March 24, 2015)

 * Use ember-inflector 1.5
 * Fix doc for Snapshot.attributes()
 * Special case "application" in the store.serializerFor method
 * Allow the store to lookup the applicationAdapter using adapterFor

### Release 1.0.0-beta.16 (March 23, 2015)

#### Breaking Changes

##### The store now passes snapshots instead of records to adapter methods

In 1.0.0-beta.15 serializers were updated to be passed snapshots instead of
records to prevent side-effects like fetching data when inspecting
relationships. This has now been extended to also include adapters methods.

The following adapter methods are now passed snapshots instead of records:

- `find(store, type, id, snapshot)`
- `findMany(store, type, ids, snapshots)`
- `findHasMany(store, snapshot, url, relationship)`
- `findBelongsTo(store, snapshot, url, relationship)`
- `createRecord(store, type, snapshot)`
- `updateRecord(store, type, snapshot)`
- `deleteRecord(store, type, snapshot)`

The signature of `buildURL(type, id, snapshot)` has also been updated to receive
snapshots instead of records.

This change removes the need for adapters to create snapshots manually using the
private API `record._createSnapshot()` to be able to pass snapshots to
serializers.

Snapshots are backwards-compatible with records (with deprecation warnings) and
it should be pretty straight forward to update current code to the public
Snapshot API:

```js
post.get('id')           => postSnapshot.id
post.get('title')        => postSnapshot.attr('title')
post.get('author')       => postSnapshot.belongsTo('author')
post.get('comments')     => postSnapshot.hasMany('comments')
post.constructor         => postSnapshot.type;
post.constructor.typeKey => postSnapshot.typeKey
```

If you need to access the underlying record of a snapshot you can do so by
accessing `snapshot.record`.

The full API reference of `DS.Snapshot` can be found [here](http://emberjs.com/api/data/classes/DS.Snapshot.html).

#### Changes
  * Do not re-add deleted records to a hasMany relationship
  * Shorten the list of reserved attributes on the model
  * Remove _createSnapshot() from DS.Snapshot documentation examples
  * Pass snapshots to adapters instead of records
  * Refactor the model assert so it will be correctly removed from the prod build.
  * Adapters and Serializers are Store Managed
  * Delete `Ember.required` (it is deprecated).
  * Adding clearer wording for calling super form extract messages
  * Missing parameter for JSDoc
  * Add examples of how to use model.errors in a template
  * Add doc example for defaultValue as a function on DS.attr
  * Update the InvalidError docs to make it more clear about where the server payload gets normalized.
  * Assert if the user tries to redefine a reserved property name.
  * Remove container deprecation warnings in Ember Data tests
  * hasRecordForId should return false if the record is not loaded
  * [BUGFIX] fetching an empty record runs find
  * bump ember-cli to 2.0 & remove sourcemapping comments in production
  * commit record-arrays.js separately so it doesn't clobber the rename
  * Rename local files to use dashes instead of underscores
  * Have snapshots respect the order of items in hasMany relationships
  * remove ManyArray from record_arrays
  * update docs about `store` in serializer
  * fetch() -> fetchById() in docs
  * Run findHasMany inside an ED runloop
  * Cleanup debug adapter test: Watching Records
  * Fixed didDelete event/callback not fired in uncommited state
  * Add main entry point for package.json.
  * register the store as a service
  * Warn when expected coalesced records are not found in the response
  * Warn if calling attr, belongsTo or hasMany on model
  * move Model to use default export instead of named export
  * Move buildURL and related methods to a mixin
  * Correct modelFor model not found errors
  * Declare `store` property on DS.Model
  * improve error message for belongsTo
  * Move _adapterRun onto the DS.Store object
  * Move utility functions out of DS.Store, and into their own modules for reuse across ember-data
  * CLean up implicit relationships on record unload
  * Add assertion for `store` property on DS.Model subclasses
  * Adds support for using mixins in polymorphic relationships
  * [DOC]: Clarify when didCreate is fired
  * (Docs) ManyArray is no longer a RecordArray
  * Fix: root.deleted.invalid state


### Release 1.0.0-beta.15 (February 14, 2015)

#### Breaking Changes

##### serializer.serialize() now receives a Snapshot instead of a record instance
A snapshot represents the frozen state of a record at a particular
moment in time. Its initial purpose is to be passed to serializers
instead of the real record. This allows the serializer to examine the
current state of that record in the moment without triggering
side-effects, like loading relationships.

The serializer has a different API from a record for accessing
properties so you will know you are working with a snapshot. Using
`snapshot.get` is still supported for compatibility however it will
log a deprecated warning to encourage you to use the new apis.

To access attributes you should now use the `attr` function.

```js
// Ember Data 1.0.0-beta.14.1
post.get('title');
// Ember Data 1.0.0-beta.15
postSnapshot.attr('title');
```

To access a belongsTo relationship you should use `.belongsTo()` method.

```js
// Ember Data 1.0.0-beta.14.1
post.get('author');
// Ember Data 1.0.0-beta.15
postSnapshot.belongsTo('author');
```

To access a hasMany relationship you should use `.hasMany()` method.

```js
// Ember Data 1.0.0-beta.14.1
post.get('comments');
// Ember Data 1.0.0-beta.15
postSnapshot.hasMany('comments');
```

##### RecordArray.pushRecord and ManyArray.addRecord/removeRecord are deprecated

If you would like to add a new record to a `RecordArray` or a
`ManyArray` you should now use the `addObject` and `removeObject`
methods.

#### Changes

  * use package.json for ember addon
  * Initial implementation of the Snapshot API
  * Allow errors on arbitrary properties, not just defined attributes or relationships
  * Fix bug preventing hasMany relationships from correctly tracking simultaneous adds and removes.
  * remove unused code.
  * Deprecate store.dematerializeRecord()
  * Use store.unloadRecord() in favor of store.dematerializeRecord()
  * Correctly trigger arrayContentDidChange when updating hasMany relationships
  * Warn if the user specifies a reflexive relationship without explicitly defining the inverse
  * bump ember-inflector dependency for HTMLBars compat
  * Add adapter.hasMany unique IDs test
  * Replace calls to `container` with `registry`
  * Dematerialize rejected _find() if record isEmpty
  * Add a Serializer base class
  * Make ManyArray.save() and RecordArray.save() return themselves
  * Added save() to ManyArray
  * idiomatic super usage.
  * Created `store.fetchById` and `store.fetchAll`.
  * Update the generateIdForRecord docs to show it gets passed an Object not a record instance.
  * Sort query params in ajax calls.
  * Cleanup JSONSerializer#extract example
  * Split Relationship Tests into Separate Files
  * [DOCS]Update about defining application's store
  * add documentation for the Store's find method
  * Do not double include the host when it uses a protocol relative url.
  * Deprecate RecordArray.pushRecord()
  * Wrap the errorThrown in an Error object if it's a string.
  * Use forEach instead of private api for accessing Map values
  * Disable unknown keys warning by default
  * remove type check for addCanonicalRecord in belongsto relationship
  * Add support for embedded polymorphic belongsTo
  * observers only fire for properties that changed
  * Don't refilter .all() and .find() if only properties changed
  * fixes to load beta 14/14.1 sourcemaps in ember-cli
  * fix version for dropped <= Ember 1.7 support
  * generateIdForRecord gets type & object properties passed to it
  * Clarify store.find via findAll docs
  * Deprecate addRecord/removeRecord for ManyArray

### Ember Data 1.0.0-beta.14.1 (December 31, 2014)

#### Changes

  * Replace `<%= versionStamp %>` with actual version stamp. Thanks
    @tricknotes!
  * Fix sourcemap loading in Ember CLI and Rails.

### Ember Data 1.0.0-beta.14 (December 25, 2014)

#### Breaking Changes

##### `store.update()` has been deprecated

Calling `store.update()` has been deprecated in favor of `store.push()` now
handling partial payloads:

```javascript
var post = store.push('post', {
  id: 1,
  title: 'Ember.js is fantastic',
  author: 'Tomster'
});

post.get('title'); // => 'Ember.js is fantastic'
post.get('author'); // => 'Tomster'

store.push('post', { id: 1, author: 'Tom Dale' });

post.get('title'); // => 'Ember.js is fantastic'
post.get('author'); // => 'Tom Dale'
```

This also mean that properties missing in the payload will no longer be reset,
but stay the same.

If you need to reset values to null, you should have your server explicitly
send back null values in the payload:

```javascript
{
  "person": {
    "firstName": null,
    "lastName": null
    "role": "Computer Science Pioneer"
  }
}
```

If you cannot change your API and you desire this behavior, you can create a
serializer and do the logic yourself:

```javascript
// app/serializers/person.js
// or App.PersonSerializer if you aren't using Ember CLI
export default DS.RESTSerializer.extend({
  normalize: function(type, hash, prop) {
    hash = this._super(type, hash, prop);
    if (!hash.hasOwnProperty('firstName')){
      hash.firstName = null;
    }
    if (!hash.hasOwnProperty('lastName')){
      hash.lastName = null;
    }
    return hash;
  }
});
```

Or if you want to restore the old behavior for all of your models:

```javascript
// app/serializers/application.js
// or App.ApplicationSerializer
export default DS.RESTSerializer.extend({
  normalize: function(type, hash, prop) {
    hash = this._super(type, hash, prop);
    type.eachAttribute(function(key) {
      if (!hash.hasOwnProperty(key)) {
        hash[key] = null;
      }
    }, this);
    return hash;
  }
});
```

##### `store.metaForType()` has been deprecated

`store.metaForType()` has been deprecated because of it's ambiguous naming.
Please use `store.metadataFor()` to get metadata and `store.setMetadataFor()`
to set metadata.


##### `ManyArray`s are no longer `RecordArray`s
[ManyArray](http://emberjs.com/api/data/classes/DS.ManyArray.html),
the object Ember Data uses to represent `DS.hasMany` relationships has
been changed so it no longer extends from `RecordArray`. This means if
you were relying on the RecordArray's `content` property to access the
underlying array you will now need to use the `.toArray()` method.

```javascript
// Ember Data 1.0.0-beta.12
record.get('myHasManyRelationship').get('content').map(...);

// Ember Data 1.0.0-beta.14
record.get('myHasManyRelationship').toArray().map(...);
```

Additionally if you were using the `RecordArray`'s `.addRecord()` and
`.removeRecord()` methods you will now need to use the `.addObject()`
/ `.removeObject()` array methods.


#### Changes

* Fix references to buildURL in documentation
* fix canary build for recent Ember.Container refactors
* [DOC] Stop using deprecated `each` helper syntax
* Work around type check issues with MODEL_FACTORY_INJECTIONS.
* [DOC] Add page for `DS.PromiseManyArray`
* [DOC] Fix markup for AcriveModelAdapter
* Add Ember.ENV.DS_NO_WARN_ON_UNUSED_KEYS option
* Fixed model rollback in the case where an attribute is not assigned so that it rolls back to unassigned instead of cached value. Added a supporting unit test.
* Fix array change notification in many arrays
* Use Ember.create and Ember.EnumerableUtils for relationships
* Backport pushing non async relationship as a link
* Backport relationship.proto.clear bugfix
* Schedule relationship normalization and split paths for canonical/client relationship updates
* fix DS.Errors#errorsFor documentation
* add test about model's attributes dirtiness
* Include build instructions in the readme
* Clarify that `store.fetch` documentation.
* Document and explicitely test specifying relationships type is optional
* Warn when pushing in a relationship as a link and its not an async relationship
* Removed unused notify on 'data' property
* fix Relationship.proto.clear bug
* Remove metaForType()/metadataFor() ambiguousness
* [Bugfix] promiseHasMany.reload() should return another promiseHasMany
* [Feature thrownError] tag errorThrown from jQuery onto the jqXHR like ic-ajax does.
* Cache relationships meta in production
* Deprecate store.update()
* hasMany relationships are no longer `RecordArray`, but `ManyArray`. To access the underlying array use `relationship.toArray()` instead of `relationship.get('content')`.

### Ember Data 1.0.0-beta.12 (November 25, 2014)


##### Internet Explorer 8 Requires Ember 1.8

A bug in Ember 1.7's `Ember.create` method (which is a polyfill for
`Object.create`) combined with a bug in es5-shim's `Object.create` prevent us
from giving Ember Data users a good alternative to use. Internally, Ember Data
uses `Object.create` for efficient caches. Ember 1.8 ships a working
`Object.create` polyfill on `Ember.create` so if you are using Internet
Explorer 8 and Ember Data in production, you should upgrade to Ember 1.8 as
soon as you can.

If you are using browsers that provide `Object.create`, you do not need to do
any additional work here. This includes mobile browsers, evergreen browsers
(Chrome, Opera, Firefox), Safari, and IE9+.

##### Ember 1.7 Support Will Be Completely Dropped in Beta.13

Ember Data relies heavily on JavaScript language-level shims (such as the
`Object.create` issue mentioned above) and other useful internals that Ember
provides. Rather than creating our own detection algorithms and more polyfills
for broken code in Ember 1.7, we are deciding to drop 1.7 support in the next
release of Ember Data. We do so in order to not increase the final size of
Ember Data's build. You should upgrade to Ember 1.8 as soon as you can.

##### Observing `data` For Changes Has Been Removed

Although `model.get('data')` has been private in Ember Data for a long time, we
have noticed users may subscribe to changes on `data` for any change to the
model's attributes. This means that the following code:

```javascript
var Post = DS.Model.extend({
  doSomethingWhenDataChanges: function(){
    // do the work
  }.property('data')
});
```

**no longer works**. Instead, you should just watch each attribute like you
would with any `Ember.Object`:

```javascript
var Post = DS.Model.extend({
  name: DS.attr(),
  date: DS.attr(),
  doSomethingWhenDataChanges: function(){
    // do the work
  }.property('name', 'date')
});
```

* Add Test Coverage for `ember-data/transforms`
* prefer Ember.create to Object.create
* Update the store.all docs to make it clearer that it only returns in-memory records.
* Allow async belongsTo to return null
* Add test for repeated failed model saves state
* Improve store.filter() docs
* Add more info about the store.fetch method
* Add tests for store#fetch
* Use store to call the find method
* Add fetch method to the store
* fix error propogating up through RSVP handler in tests
* update Ember.assert calls to check type
* Remove attr() data dependency
* Expand the package configuration filename glob declaration in `Brocfile.js` into the affected filenames, as the `broccoli-string-replace` plugin doesn't support globbing
* Clear inverseRecord for deleted belongsTo properly
* Warn when pushing unknown payload keys into the store
* RESTAdapter's buildURL from delete can ask for record's relations. closes #534
* Ensure production builds do not use require internally.
* [DOCS] InvalidError docs missing quote
* Use the model rollback and not state machine for created records rollback
* Relationship rollback from created state
* Don't allow empty strings as id in push/update
* Improve warns() test helper to better handle multiple calls
* `PromiseManyArray` proxies `Ember.Evented` methods to its `content`
* Extract function to proxy `PromiseManyArray`'s method to `content`
* createRecord on PromiseManyArray returns the new record instead of a Promise
* Add `createRecord` to PromiseArray so it proxies to ManyArray
* Nicer errors when pushing belongsTo/hasMany with invalid values
* Fixing an issue when grouping requests could result in URL longer than configured length.
* Refactored InvalidError handling into a serializer concern.
* [DOC] Fix usage of DS.Model.fields
* [DOC] Fix to apply js doc style to DS.ManyArray
* [DOC] Update usage of AMS
* [DOC] Fix typos in `ajaxSuccess`
* Added assertion for updateLink

### Ember Data 1.0.0-beta.11 _(October 13, 2014)_

* Rollback after delete record failure
* warn instead of throw when resolving keys to model
* added note about coalescing and custom URLs
* pass ids through encodeURIComponent when turning them into urls
* Always remove the inverse record (if exists) from a belongsTo relationship fixes #2331
* polyfill Ember.Map behavior
* use new Em.Map function signatures
* Refactor relationships with links
* Implemented rollbacking of implicit relationships
* Add support for rollback of relationships from deleted state
* Unwrap promises when setting a belongsTo
* Update tests on filters returning reloaded objects
* Update recordArrays when record has reloaded
* Refactor inverseFor cache
* Makes it possible to custom define inverses on only one side
* HasMany relationships now reload correctly
* Add a test for calling reload directly on the promiseProxy
* Add a test for reload on sync hasMany relationships
* Added a reload to the ManyArray
* [DOC fix] Remove misleading {inverse: null}
* Added implicit relationships
* Improve comments for the inverseFor method
* Serialize belongsTo where id===null as null
* [DOCS] Cleanup "USING EMBEDDED RECORDS" API readability
* preload the belongsTo to be available synchronously
* Add a test for an async belongsTo with buildURL
* removed private unused properties in ManyArray
* Small typo in #normalize documentation
* Do not clear own relationships when deleting records

### Ember Data 1.0.0-beta.10 _(September 9, 2014)_

**NOTE:** A bug was introduced in this version where the saving of a model with async hasMany property will send an empty list to the server in the payload, so is discouraged to use this version if you have such relationships on your application. For more details https://github.com/emberjs/data/issues/2339

* Bring back relationship parameter for findHasMany & findBelongsTo
* add es5-shim/sham requirement to README
* Add-on uses blueprint `addBowerPackageToProject()` hook to add ed as bower dep instead of including a pre-built version
* ember add-on vendor tree is relative to this file, so needs to go back a dir
* tests and typo fix for ajaxSuccess/ajaxError
* Add ajaxSuccess hook to the RESTAdapter
* Added ember-addon support via npm
* Update recordArrays whenever there are changes to relationships
* Refactor relationship handling code
* Add support for embedded polymorphic hasMany
* improve error message for push
* [BUGFIX] fixture adapter copies defined fixtures
* remove unused variables and enforce in jshint
* Updated docs to warn against use of async:true with EmbeddedRecodsMixin
* Removed a duplicate explanation of preload
* small perf, this map was unfortunately adding 5ms -> 8ms overhead for pushMany of N=1000. Removing it removed the overhead entirely.
* modelFor was used constantly, the extra normalization and string splitting was causing measurable slowdown.
* Don't use the DOM in the store tests
* Added an example of how to use the preload arg
* Added documentation for preload parameter
* [Documentation] typo in `find` documentation

### Ember Data 1.0.0-beta.9 _(August 18, 2014)_

**Important:** IE8 and other environments which don't support `Object.create`
correctly will need a shim for Object.create.

* bring in ember-inflector 1.1.0
* [DOCS] Add ids to RESTAdapter JSON payload examples
* [Doc] Fix typo, your, not you in DS.Store#update method comments
* [DOC] Add plural example for REST adapter.
* Substitute serialize:no to serialize:false in EmbeddedRecordsMixin
* Add support for JSONSerializer.attrs.key.serialize for `hasMany` and `belongsTo` relationships
* Refactor hasMany code for comments and clarity
* Batch hasMany requests with many id's to avoid max URL length issues
* Expose embedded options
* Changing an async belongsTo association does not load unfetched record.
* [Bugfix] relationship changes shouldn’t cause async fetches
* loosen constraint of adapter method return values
* Move EmbeddedRecordsMixin to core from activemodel
* Correct various yuidoc warnings to clean up some console noise when build the api docs
* factor out promise usage
* Do not serialize fixtures when deleting
* Refactor JSON serializer to use _getMappedKey
* Don't normalize the key if not present in the hash
* Add serializeIntoHash to the JSON Serializer
* prefer Object.create(null) for typeMap backing stores. Cache misses are faster, and won’t collide with prototype pollution
* since the recordArrayManager already maintains the uniq index, we can use that to simply push the record onto the record array without needing the safety of addRecords dupe guard. This prevents another O(n) operation
* the string splitting in transitionTo is wasteful and for large payloads can be surprisingly costly. As they never actually change, we should simply cache and forget about them.
* Coalesce find requests, add support for preloading data
* allow attributes to be excluded via the attrs hash
* DS.DateTransform now serializes to ISO8601 format by default. Adds millisecond precision to serializing dates
* Added id and requestType back to extract* hooks
* Moved several normalize helper methods to the JSONSerializer - Move `normalizeAttributes` to the `JSONSerializer` (mirrors `serializeAttributes`) - Move `normalizeRelationships` to the `JSONSerializer` - Move `normalizePayload` to the `JSONSerializer`
* Throw an error if a user attempts to add a `data` property to a subclass of DS.Model
* Add a store.normalize() method to make it easy to normalize record data for store.push()
* Add a test for embedded belongsTo with a custom primaryKey
* Refactored EmbeddedRecordsMixin to push records instead of sideload
* PERF: O(n) -> O(1) record within recordArray check
* Add guard before deleting partial[attribute]
* Fixes embedded hasMany primary key lookup.
* Allow `attr` mapping in `belongsTo` & `hasMany` attributes;
* Favour declared mapping over keyForAttribute, if defined;
* improve debug ergonomics (as I debug)
* rest_adapter: Remove unused `set` definition
* Added documentation for ajaxError with DS.Errors.
* updated '_links' to just 'links'
* Better error for missing inverse on hasMany/belongsTo
* adapt usage example for TemperatureTransform
* [Bugfix] Decouple DS.EmbeddedRecordsMixin from DS.ActiveModelSerializer

### Ember Data 1.0.0-beta.8 _(May 28, 2014)_

* Each RecordArray gets a copy of the models's metada object instead of sharing the same meta object. Enables several paginated arrays to coexist without clobbering each other
* Drop the `type` argument from `normalizePayload` calls. This argument was not consistently passed. Overridding the `extract` functions on the serializer is a suggested alternative if you require the model type.
* Introduce `DS._setupContainer()` for use in testing
* Deprecate the 5 Ember initializers, use just one named "ember-data"
* DS.EmbeddedRecordsMixin methods for serializing relationships call super if needed
* moved normalizeId to JSONSerializer
* JSONSerializer should use the attrs hash when extracting records Also breaks the _super chain in normalize to preserve ordering in the RESTSerializer
* Remove unnessary loop in extracting single using DS.EmbeddedRecordsMixin
* Do not presume returned data arrays support .pushObjects
* [BUGFIX] store.fetchMany should always return a promise.
* Use keyForRelationship in JSONSerializer's serializeHasMany method
* Makes sure extractArray is normalizing each record in the array instead of trying to normalize the whole payload as an object.
* Do not cache model factories on meta, or on other model CPs
* Removed unused resolver from ManyArray.fetch
* normalizePayload only gets the payload
* [BUGFIX] Normalize typeKeys to always be camelCase
* Update the docs on pushPayload to clarify how model is used
* Put the initialization docs back with the initializers
* [DOC] Fix jsdoc for `Serializer#extractSingle`
* filteredRecordArray derived from filterFn + query, should retain its query (just as adapterPopulated does)
* Setting a filter function on a filteredRecordArray should only cause 1 re-filter per run-loop
* [Bugfix] when a record which exists in an adapterPopulatedRecordArray is destroyed, it is also now removed from the array
* [BUGFIX] Add missing support for belongsTo in DS.EmbeddedRecordsMixin
* Add support for serializing hasMany as ids
* incase jQuery.ajax returns a null or undefined jqXHR
* Fixes a typo in the documentation of the serializeAttribute method of json_serializer.js
* [DOC] `bower install` is part of `npm install`, removing it from README
* [DOC] Fix docs for method signature of extractSingle, extractArray
* Import InvalidError instead of looking at global DS
* allow saving records from invalid state
* [DOC beta] Clarify adapter settings with ActiveModel::Serializers
* Add examples to the DS.Errors api docs.
* Extend from Controller for ApplicationController.
* Update error messages from push and update
* Bring back deprecated initializers
* Refactor Ember initializer to use DS._setupContainer
* Fix incorrect documentation for isError.
* Explicitly define a bower install directory
* Import 'defaultRules', fixes missing Inflector.defaultRules
* Add an example of sending cookie information in the header and updated confusing reopen example.
* Expands isDeleted documentation
* Clarify adapter header documentation
* Documents invalid use of `attr` for attribute of `id`
* Store#pushPayload should use the type's serializer for normalizing
* Remove internal reliance on Ember.lookup.DS in favor of requireModule().
* Remove reliance on global DS
* Deprecate App.Store in favor of App.ApplicationStore.
* Remove `window` references in favor of `Ember.lookup`.
* Document the difference between Store push() vs. createRecord() ect.
* Document the store#update method.
* Make sure data adapter tests pass for Ember <= 1.4
* Update data adapter test with new Ember version
* change documentation from hash to payload
* Use the ApplicationAdapter property instead of creating a custom Store just to create a custom adapter.
* Use string model lookup instead of class lookup
* Improve store docs to use container lookup not concrete class
* Do not call adapter.deleteRecord for a record that is already saved and deleted
* Remove DS.AttributeChange
* Fix rollback on invalid record after set

### Ember Data 1.0.0-beta.7 _(February 19, 2014)_

* Release 1.0.0-beta.7
* Document required structure for DS.InvalidError
* Update ember version to 1.4.0
* lock server while compiling assets
* [DOC] Fix extractArray
* Don't pass the resolver where it's not needed
* force jshint on failure
* explicitly set a handlebars dependency to a version known to work.
* Remove Dead Code from RESTAdapter's Test
* Ensure the SHA is included in the VERSION.
* Destroying the store now:
* Revert "remove unneeded and misleading "async" test helpers"
* Break Down JSONSerializer#serializeBelongsTo Test
* remove unneeded and misleading "async" test helpers
* Wait on all the findMany promises to resolve before resolving the store#fetchMany promise.
* A records initial currentState can be on the prototype. Not need in doing the extra set on each init
* create promise labels outside of already visually complex code-paths
* reduce reusing argument variables, as it reduces clarity and makes debugging harder.
* hasMany relationship property are essentially readOnly, lets mark them as such.
* Improved assertion if an non-ember-data model has snuck in this far.
* Update instructions for running tests.
* Maintain consistency of internal changed attributes hash.
* Remove 0.13 era architecture file.
* Remove Ruby remnants.
* Add `grunt docs` task.
* Use local versions of grunt and bower for Travis.
* Do not generate a gzip report from uglify:dist.
* Add current revision back to build output.
* keep a local version of grunt-cli (dev only)
* Fix `grunt server` automated testing upon file change.
* Ensure builds are generated before publishing.
* Add build publishing to builds.emberjs.com.
* Fix the links to DS.Model and DS.Transform in the DS Namespace method docs
* Enable multi-channel testing.
* Allow testing against multiple versions of Ember & jQuery.
* Remove restriction for jQuery version in bower.json
* Object.create does not exist in old IE.
* Fix bug where an undefined id would trigger a `findAll`
* Avoid instance of aliasMethod due to problems with Chrome debugger
* Use latest stable Ember.js
* Cleanup. - Ember.computed takes the DK as a first argument, no need to all property on it again - misc formatting as I go.
* Upgrade QUnit to v1.13.0
* Use defeatureify to strip debug statements from output.
* Prefer Promise.cast over resolve.
* Use the new naming for active_model_adapter integration tests.
* Ensure that bower is installed.
* mark more model properties as readOnly
* allow connect port to be configurable
* misc cleanup
* once is already saved off at the top of the file
* add `grunt server`, and ensure the server(dev) version builds tests, so you can run tests
* postinstall bower install
* lazy create errors object on models
* Remove incorrect return documentation on store#pushPayload
* Pass arguments to `options.defaultValue` if a function.
* Revert "DateTransform serializes as a number instead of string. The deserializer was already considering this case. Adds millisecond precision to DateTransform"
* Should install grunt-cli globally.
* Now ember-data is built by `grunt buildPackages`
* Fix ember-data version
* Add missing task `grunt test`
* Export `Store` as default from ./system/store
* Use `expectDeprecation` helper in lookup tests
* Import `Store` instead of referencing it via `DS.Store`
* Register already imported transforms instead of `DS.XXX`
* Add `bower_components` to .gitignore
* Remove ruby-land tasks from Travis.
* Remove remnants of Ruby-land.
* Post release version bump.
* add grunt and bower install to .travis.yml
* update README with grunt workflow
* readd ContainerProxy to DS namespace
* fix build, import more test helper definitions from ember-dev
* fix banner generation a bit
* Do not trigger didSetProperty if value is unchanged.
* add watch option, fix some test oddities
* move some requires around
* move grunt tasks into folders
* ES6!

### Ember Data 1.0.0-beta.6 _(January 25, 2014)_

* DateTransform serializes as a number instead of string. The deserializer was already considering this case. Adds millisecond precision to DateTransform
* Remove unused helper.
* Updates DS.Model.rollback documentation
* Fix a typo in DS.filter doc
* Prefix built-in serializers and adapters with a dash.
* Spelling corrections in docs.
* Fix spelling in JSONSerializer class docs.
* Don't assume typeKey is always camelized.
* Deprecate former underscored names.
* Fix documentation for DS.Model.isNew
* [BUGFIX] Possible undefined errors in response via ActiveModelAdapter
* [BUGFIX] missing return statement in RecordArray#update
* Fixes a small typo in DS.Store deleteRecord docs
* Setting a property to undefined on a new record should not transition the record to root.deleted.saved
* Don't assume that factory.typeKey is always camelized.
* Normalize typeNames when comparing against typeKey.
* Force underscore after decamelizing typeKey.
* Set default Rakefile task to :test
* Remove underscores and rename
* The store's adapter property requires a string
* Rename dataAdapter to data-adapter
* Calls rake test[all] using bundle exec since CI was failing
* fixed behaviour of store.all() in combination with store.unloadAll() which caused elements to stay in the RecordArray, even if they should have been removed. ref #1611
* another quick fix, which should reduce run-loop pressure.
* Don't bother with Ember.run.once, as we can detect an impending flush by inspecting the size of the local queue of _deferredTriggers

### Ember Data 1.0.0-beta.5 _(January 11, 2014)_

* Normalize key in modelFor when a factory is not given.
* `store.filter` should always return a FilteredRecordArray.
* attrs with options should allow for key option.
* Fix windows builds.
* Add DS.Errors object
* Handle case of single object pushPayload.
* Create RecordArrays from recordArrayManager.
* Documentation

### Ember Data 1.0.0-beta.4 _(December 19, 2013)_

* Use the adapter host for host-relative URLs in `findHasMany`.
* Fix `asyncBelongsTo` resolution.
* Add `destroyRecord` to delete and save a record at once.
* Make it easier to override just the Ajax options.
* Normalize hasMany polymorphic types for `DS.ActiveModelSerializer`.
* Add basic embedded record support to `DS.ActiveModelSerializer`.
* `DS.Store#modelFor` now assigns a store even when a factory supplied.
* Fixes adding unsaved records to hasMany relationships after they are normalized from saved payload.
* Correctly define window/global `DS` namespace in IE7/8.
* Test against all Ember channels.
* Allow `recordIsLoaded` to be called with a string for the type.
* Removing deleted records from RecordArrays is now async.
* Normalize `links` in `DS.RESTSerializer.normalize`.
* Label promises.
* Many documentation fixes.

### Ember Data 1.0.0-beta.3 _(September 28, 2013)_

* Add `normalizePayload` to `RESTAdapter` for payload normalization that is the same
across all requests.
* Add `record.toJSON()`
* Normalize relationships on payloads returned from saves.
* Rename `rootForType` to `pathForType` in `RESTAdapter`
* Add `serializeIntoHash` in `RESTAdapter` to enable alternate root keys
* Print Ember Data version in the debug output when Ember boots
* Add `typeFromRoot`
* Allow retries of records that were not found
* Add `pushPayload` for pushing out of band records that still go through the
appropriate normalization logic.
* Add an API for registering custom pluralization rules (see
4df69d14ef2677977f520986070a2fdc45664008)
* Add `unloadAll` on store
* Infer the type of hasMany and belongsTo relationships by inflecting the key
* Polymorphic relationship improvements
* ActiveModel Adapter for working with Rails-like servers, not included by default
in the Ember Data build but available separately.
* `store.metadataFor(type)` to get metadata provided by `findAll`.
* `RecordArray#save`
* `store.getById` returns null if a record isn't found
* Fix a number of rollback-related cases
* Fix async belongsTo
* A number of `links`-related fixes
* Ensure that `didLoad` fires when a record is created for the first time
* Support primary and sideloaded data of the same type to be returned from array
lookups (via `posts` and `_posts`).
* IE8 fixes
* Add `record.changedAttributes()`
* Properly handle absolute and relative links in the `RESTAdapter`
* Records become clean again if their properties are set back to the original values

### Ember Data 1.0.0-beta.2 _(September 04, 2013)_

* Add support for `host` and `namespace` in the RESTAdapter
* Always use shorthand (`post`, not `App.Post`) in models
* Always use shorthand (`custom` not `App.CustomAdapter`) when looking up adapters
* Support `store.all('post')`
* Add back support for `record.rollback()`
* Transforms should be registered via `App.DateTransform` (for `date`)
* Add back support for `since` token for find all fetches
* Add `keyForAttribute` and `keyForRelationship` hooks in the serializer
* Support for serializing many-to-none and many-to-many relationships in RESTSerializer
* Several fixes for DS.hasMany async
* RESTAdapter `buildURL` takes a string, not type
* RESTAdapter now has `rootForType` to convert a type into the root
* `store.update` to update some, but not all attributes
* Thanks to Paul Chavard, Toran Billups, Bradley Priest, Kasper Tidemann, Yann Mainier,
Dali Zheng, Jeremy Green, Robert Jackson, Joe Bartels, Alexandre de Oliveria,
Floren Jaby, Gordon Hempton, Ivan Vanderbyl, Johannes Würbach, Márcio Júnior,
Nick Ragaz, Ricardo Mendes, Ryunosuke SATO, Sylvain Mina, and ssured

### Ember Data 1.0.0-beta.1 _(September 01, 2013)_

* Added `DS.DebugAdapter` which extends `Ember.DataAdapter`
* Explain how to deal with embedded records
* Start on a transition guide
* Make willCommit while in flight a noop
* Update examples
* Move normalization and extraction to serializer
* `deleteRecord` when already deleted is a noop
* Explain "originally passed as an Array of IDs"
* Shortens unnecessary verbiage
* Add Promise Proxies
* Add back serializers
* More consistency for serializerFor
* Rename `NewJSONSerializer` to `JSONSerializer`
* Don't invalidate `data` if there's no new data
* Use the inflector instead of dumb pluralization
* `store.create({adapter:'name'})` uses the container
* Remove `resolveOn`
* Thread more promises through the adapter
* Fix invokeLifecycleCallbacks on still dirty record
* Initialize adapter in the store
* Support merging scenarios
* Start implementing merge semantics
* Remove references to references
* Remove unnecessary usage of references
* Remove leftover serializer code
* Add support for singular names in REST payloads
* Move extraction layers to adapter
* Added support for URL lookups
* Inject the default DS.Store if none is provided
* Add `findAll`, `findMany` and `findQuery` to RESTAdapter
* Add `findAll` plus request-type-specific extracts
* Make serializer respect primaryKey/attrs
* REST Adapter payload stuff
* Ember.Inflector: `Ember.String#pluralize` and `Ember.String#singularize`
* Remove `handlePromise` indirection.
* Queries are now using promises properly
* Share code between sync and async `hasMany`
* Unload test passing
* Adapter Interop test passing (plus findByIds)
* Get reloading passing
* Got record persistence test passing
* Records are no longer thenables
* Require application.Store to be defined - Fixes #1084
* Relationship changes operate on records
* Don't assign DS to window unless window exists - Fixes #681
* Client ID generation passing
* Eagerly generate the jQuery expando on window
* Allowing inverse relationships to be nullable.
* `fetchRecord` replaced `findById` here
* Eliminate lazy materialization from `belongsTo`
* Start consolidating API around records
* Make the data materialized again
* Add `debugInfo` to `DS.Model`
* Add `store.push` and `store.recordFor`
* Remove redundant `[]` from `Ember.A()` calls
* Bump ember-source
* Flatten model's `data` structure into single hash
* Fix deprecation warning
* Add serializerFor API to `DS.Store`
* Removed duplicate method declaration
* `save` method is not private
* Prevent resolution of jQuery's self fulfilling jqXHR thenable Since it resolves on another turn, it will cause needless and unwrappable auto-runs
* Rewrite the state machine to improve performance
* Add individual record to the buildURL signature.
* Update jQuery version for `rake test[all]`
* Remove unnecessary inspector for `object`
* Remove option to specify router
* Declared `ajaxHeaders`.
* Specify additional headers for RESTAdapter.
* Update supported ruby version
* Use `Ember.EnumerableUtils.map`
* Use `Ember.EnumerableUtils.indexOf`
* Use `Ember.EnumerableUtils.forEach`
* Modify code indent
* Bump ember-source to 1.0.0-rc.6
* Include the version number in the javascript.
* This expression makes my brain hurt, lets atleast expand this to two lines. (We need some sort of macro system to improve these assertions.
* Improve variable naming consistency
* Remove nested run loop.
* Allow metadata value to be zero
* Remove redundant serialized variable. :/
* Better serializeId implementation that takes empty strings into consideration and fixed a logic error in `isNaN(id)` check
* Id serialization correctly returns null for null or undefined id values rather than 0
* Remove bundled jQuery
* First pass at uncatchable assertions
* English, do you speak it?
* Remove unused variables
* Remove unused helper
* Remove unnecessary comment
* Remove unused tasks
* Support `Ember::Data::VERSION`
* Assert post is dirty
* Replace references to jQuery with Ember.$
* RESTAdapter: reject with xhr only
* Fix: record must be invalid on 422
* Add failing integration test to expose bug #1005
* Remove revision reference.
* Check against `null` and `undefined`


### Ember Data 0.13 _(May 28, 2013)_

* Initial Release
