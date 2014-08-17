# Ember Data Changelog

### Master

### Ember Data 1.0.0-beta.9 _(August 18, 2014)_

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
* Revert "Merge pull request #1652 from abuiles/camelize-in-pathForType"
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
