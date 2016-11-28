# Ember Data Changelog

### Master

### Release 2.10.0 (November 28, 2016)
- [#4656](https://github.com/emberjs/data/pull/4656) [PERF backport to beta] fix sub-optimal compiler output ([#4655](https://github.com/emberjs/data/pull/4655))
- [#4592](https://github.com/emberjs/data/pull/4592) [DOC] Add documentation for query#update() to refresh query
- [#4510](https://github.com/emberjs/data/pull/4510) Heimdall instrumentation
- [#4546](https://github.com/emberjs/data/pull/4546) Revert "Log an assertion if the response from createRecord does not have an i…"
- [#4553](https://github.com/emberjs/data/pull/4553) [DOCS] Fix store.unloadAll modelName param type
- [#4566](https://github.com/emberjs/data/pull/4566) Properly cleanup store and env in store integration test
- [#4574](https://github.com/emberjs/data/pull/4574) Move heimdalljs to dependencies
- [#4576](https://github.com/emberjs/data/pull/4576) [DOC] Update Readme to reflect new default adapter
- [#4578](https://github.com/emberjs/data/pull/4578) Improved null id assertions

### Release 2.9.0 (October 18, 2016)
- [#4577](https://github.com/emberjs/data/pull/4577) [DOC] fix typo
- [#4529](https://github.com/emberjs/data/pull/4529) isUpdating should be true only if a reload happens
- [#4566](https://github.com/emberjs/data/pull/4566) Properly cleanup store and env in store integration test
- [#4567](https://github.com/emberjs/data/pull/4567) [bugfix beta] Treat status code 0 as an abort
- [#4559](https://github.com/emberjs/data/pull/4559) [BUGFIX beta] Use Ember.guidFor to set InternalModel's guid.
- [#4560](https://github.com/emberjs/data/pull/4560) [BUGFIX beta] Ensure record array length is reset during willDestroy.
- [#4545](https://github.com/emberjs/data/pull/4545) [BUGFIX beta] Make `Model#data` a plain getter.
- [#4541](https://github.com/emberjs/data/pull/4541) [DOC beta] Remove `Ember.ArrayController` from initializer example (#4540)
- [#4540](https://github.com/emberjs/data/pull/4540) Add examples to the build-url-mixin API docs (#4512)
- [#4537](https://github.com/emberjs/data/pull/4537) [BUGFIX beta] Ember Data should not swallow exceptions from the run loop
- [#4546](https://github.com/emberjs/data/pull/4546) Revert "Log an assertion if the response from createRecord does not have an i…"
- [#4536](https://github.com/emberjs/data/pull/4536) [DOC] fix features response typo (#4530)
- [#4490](https://github.com/emberjs/data/pull/4490) [DOCS] No need to use Ember.run in succes and failure of wrapped getJSON
- [#4493](https://github.com/emberjs/data/pull/4493) Addresses #4492
- [#4503](https://github.com/emberjs/data/pull/4503) Update ember-try config to test against alpha.
- [#4515](https://github.com/emberjs/data/pull/4515) Document the allowNull property on the boolean transform
- [#4516](https://github.com/emberjs/data/pull/4516) Update the docs for normalizeModelName so they explain the intent of …
- [#4521](https://github.com/emberjs/data/pull/4521) Remove ContainerProxy
- [#4522](https://github.com/emberjs/data/pull/4522) add license to bower.json

### Release 2.8.1 (September 23, 2016)
- [#4536](https://github.com/emberjs/data/pull/4536) bump to latest ember-cli, run ember init, cleanup post init
- [#4546](https://github.com/emberjs/data/pull/4546) Revert "Log an assertion if the response from createRecord does not have an I…"
- [#4537](https://github.com/emberjs/data/pull/4537) [BUGFIX beta] Ember Data should not swallow exceptions from the run loop
- [#4545](https://github.com/emberjs/data/pull/4545) [BUGFIX beta] Make `Model#data` a plain getter.
- [#4541](https://github.com/emberjs/data/pull/4541) [BUGFIX release] Include initializers for global production build

### Release 2.8.0 (September 8, 2016)

- [#4464](https://github.com/emberjs/data/pull/4464) Add benchmarks directory to npmignore
- [#4425](https://github.com/emberjs/data/pull/4425) [BUGFIX] Pass options to transform for serialization in json-api
- [#4408](https://github.com/emberjs/data/pull/4408) Log an assertion if the response from createRecord does not have an id and the id was not already provided by the client
- [#4246](https://github.com/emberjs/data/pull/4246) [FEATURE ds-rollback-attribute] Add rolling back of a single model attribute
- [#4418](https://github.com/emberjs/data/pull/4418) remove DEPRECATION: Using the global version of DS is deprecated when running tests
- [#4481](https://github.com/emberjs/data/pull/4481) [BUGFIX release] Revert blueprints to use the old import DS format
- [#4433](https://github.com/emberjs/data/pull/4433) Remove JSHint directives from Mocha test blueprints
- [#4435](https://github.com/emberjs/data/pull/4435) [DOC] typo fix for queryRecord (kown -> known)
- [#4431](https://github.com/emberjs/data/pull/4431) Update changelog for 2.6.1 release
- [#4454](https://github.com/emberjs/data/pull/4454) Add since tags for methods added in Ember Data 1.13
- [#4447](https://github.com/emberjs/data/pull/4447) Remove initializer methods from the API docs
- [#4446](https://github.com/emberjs/data/pull/4446) `modelHasAttributeOrRelationshipNamedType` should not show up in the API docs
- [#4444](https://github.com/emberjs/data/pull/4444) Update the API docs for the DS.Adapter class
- [#4448](https://github.com/emberjs/data/pull/4448) [BUGFIX beta] The adapter should call `ajax` instead of the new methods if it has been customized.
- [#4490](https://github.com/emberjs/data/pull/4490) [DOCS] No need to use Ember.run in success and failure of wrapped getJSON
- [#4449](https://github.com/emberjs/data/pull/4449) Add link to PR for ds-check-should-serialize-relationships feature
- [#4489](https://github.com/emberjs/data/pull/4489) [BUGFIX beta] Fix Brittle Promise Usage
- [#4470](https://github.com/emberjs/data/pull/4470) Belongs to not updating when response contains a change with the previous value
- [#4451](https://github.com/emberjs/data/pull/4451) [CLEANUP beta] Remove feature flag for ds-serialize-ids-and-types (shipped in 2.6) #4416
- [#4466](https://github.com/emberjs/data/pull/4466) [BUGFIX beta] Fixes issue with GET requests appending ?{} to url
- [#4484](https://github.com/emberjs/data/pull/4484) [BUGFIX beta] Update API docs to import DS from 'ember-data'
- [#4485](https://github.com/emberjs/data/pull/4485) Update changelog for the Ember Data 2.7.0 release
- [#4499](https://github.com/emberjs/data/pull/4499) [BUGFIX beta] add assertions for reference methods on DS.Model
- [#4503](https://github.com/emberjs/data/pull/4503) Update ember-try config to test against alpha.
- [#4515](https://github.com/emberjs/data/pull/4515) Document the allowNull property on the boolean transform
- [#4516](https://github.com/emberjs/data/pull/4516) Update the docs for normalizeModelName so they explain the intent of the function
- [#4519](https://github.com/emberjs/data/pull/4519) [BUGFIX beta] Prefer includes over contains
- [#4521](https://github.com/emberjs/data/pull/4521) Remove ContainerProxy

### Release 2.7.0 (July 25, 2016)
- [#4482](https://github.com/emberjs/data/pull/4482) Disable ds-improved-ajax for the 2.7 release
- [#4470](https://github.com/emberjs/data/pull/4470) Belongs to not updating when response contains a change with the previous value
- [#4481](https://github.com/emberjs/data/pull/4481) [BUGFIX release] Revert blueprints to use the old import DS format
- [#4484](https://github.com/emberjs/data/pull/4484) [BUGFIX beta] Update API docs to import DS from 'ember-data'
- [#4454](https://github.com/emberjs/data/pull/4454) Add since tags for methods added in Ember Data 1.13
- [#4464](https://github.com/emberjs/data/pull/4464) Add benchmarks directory to npmignore
- [#4466](https://github.com/emberjs/data/pull/4466) [BUGFIX beta] Fixes issue with GET requests appending ?{} to url
- [#4425](https://github.com/emberjs/data/pull/4425) [BUGFIX] Pass options to transform for serialization in json-api
- [#4433](https://github.com/emberjs/data/pull/4433) Remove JSHint directives from Mocha test blueprints
- [#4435](https://github.com/emberjs/data/pull/4435) [DOC] typo fix for queryRecord (kown -> known)
- [#4448](https://github.com/emberjs/data/pull/4448) [BUGFIX beta] The adapter should call `ajax` instead of the new metho…
- [#4320](https://github.com/emberjs/data/pull/4320) Fixup feature flagging infrastructure.
- [#4311](https://github.com/emberjs/data/pull/4311) Use property lookup in applyTransforms
- [#4318](https://github.com/emberjs/data/pull/4318) [FEATURE ds-payload-hooks] Add hooks to map type in payload to modelName
- [#4378](https://github.com/emberjs/data/pull/4378) [DOC] Add link to PR's for every feature
- [#4327](https://github.com/emberjs/data/pull/4327) [DOC] Update CONTRIBUTING.md for feature flags
- [#4389](https://github.com/emberjs/data/pull/4389) call super in addon#init
- [#4337](https://github.com/emberjs/data/pull/4337) [DOC] Update README.md for improve ES6 syntax in example
- [#4348](https://github.com/emberjs/data/pull/4348) [CLEANUP ds-finder-include]
- [#4347](https://github.com/emberjs/data/pull/4347) [CLEANUP ds-references]
- [#4345](https://github.com/emberjs/data/pull/4345) [DOC] fix example syntax
- [#4334](https://github.com/emberjs/data/pull/4334) Port the 2.5.x changelog entires to master
- [#4393](https://github.com/emberjs/data/pull/4393) During normalization, use property lookup instead of hasOwnProp checks
- [#4363](https://github.com/emberjs/data/pull/4363) [DOC] Fix hard-coded "Customizing Adapters" link
- [#4350](https://github.com/emberjs/data/pull/4350) [CLEANUP ds-transform-pass-options]
- [#4374](https://github.com/emberjs/data/pull/4374) Fix #4366: EmbeddedRecordsMixin embeds the record, not the snapshot
- [#4392](https://github.com/emberjs/data/pull/4392) Fix lint errors caused by merging an older pr
- [#4396](https://github.com/emberjs/data/pull/4396) Deprecate date parse
- [#4398](https://github.com/emberjs/data/pull/4398) [FEATURE ds-overhaul-references] Fix inconsistencies with Reference#push
- [#4399](https://github.com/emberjs/data/pull/4399) Add link to PR of ds-payload-type-hooks feature
- [#4403](https://github.com/emberjs/data/pull/4403) [BUGFIX beta] Correctly coalesce URI encoded ids
- [#4405](https://github.com/emberjs/data/pull/4405) [BUGFIX beta] Document the adapterOptions property
- [#4427](https://github.com/emberjs/data/pull/4427) Update changelog for the 2.6.0 release

### Release 2.6.1 (June 15, 2016)
- [#4425](https://github.com/emberjs/data/pull/4425) [BUGFIX] Pass options to transform for serialization in json-api
- [#4389](https://github.com/emberjs/data/pull/4389) call super in addon#init

### Release 2.6.0 (June 8, 2016)
- [#4386](https://github.com/emberjs/data/pull/4386) [BUGFIX release] `isUpdating` flag is set correctly for `store.findAll`
- [#4374](https://github.com/emberjs/data/pull/4374) Fix #4366: EmbeddedRecordsMixin embeds the record, not the snapshot
- [#4379](https://github.com/emberjs/data/pull/4379) [BUGFIX beta] Fix resetting of properties to in-flight values
- [#4380](https://github.com/emberjs/data/pull/4380) [BUGFIX beta] remove trailing whitespace from model blueprint
- [#4300](https://github.com/emberjs/data/pull/4300) [BUGFIX beta] Overhaul queryRecord
- [#4363](https://github.com/emberjs/data/pull/4363) [DOC] Fix hard-coded "Customizing Adapters" link
- [#4320](https://github.com/emberjs/data/pull/4320) Fixup feature flagging infrastructure.
- [#4324](https://github.com/emberjs/data/pull/4324) [DOC beta] Clarify DS.Model#changedAttributes()
- [#4324](https://github.com/emberjs/data/pull/4324) [DOC beta] Clarify DS.Model#changedAttributes()
- [#4327](https://github.com/emberjs/data/pull/4327) [DOC] Update CONTRIBUTING.md for feature flags
- [#4328](https://github.com/emberjs/data/pull/4328) [BUGFIX release] Only setup babel options once.
- [#4330](https://github.com/emberjs/data/pull/4330) [DOC beta] Make clear where `blog` is coming from
- [#4331](https://github.com/emberjs/data/pull/4331) [BUGFIX beta] Overhaul attr/relationships imports in model blueprint
- [#4338](https://github.com/emberjs/data/pull/4338) [DOC beta] Overhaul documentation for reload / background reload
- [#4345](https://github.com/emberjs/data/pull/4345) [DOC] fix example syntax
- [#4184](https://github.com/emberjs/data/pull/4184) blueprints: Use project.dependencies() to determine test framework
- [#3848](https://github.com/emberjs/data/pull/3848) [BUGFIX] EmbeddedRecordMixin should include the type serializing hasMany as ids
- [#4154](https://github.com/emberjs/data/pull/4154) Make sure new record are not pushed twice when parent is saved before.
- [#4023](https://github.com/emberjs/data/pull/4023) Enhance blueprints: only extend from application entity if it exists
- [#4177](https://github.com/emberjs/data/pull/4177) Elaborate on running tests in browser
- [#3586](https://github.com/emberjs/data/pull/3586) [FEATURE ds-extended-errors] Make adapter error extendable and add more error types
- [#3099](https://github.com/emberjs/data/pull/3099) [FEATURE ds-improved-ajax] Finer control over customizing a request
- [#4022](https://github.com/emberjs/data/pull/4022) [FEATURE ds-boolean-transform-allow-null] allow null for boolean
- [#4173](https://github.com/emberjs/data/pull/4173) Create RELEASE.md
- [#4178](https://github.com/emberjs/data/pull/4178) DS.Store type presence checks
- [#3559](https://github.com/emberjs/data/pull/3559) [BUGFIX release] Guard against isDestroyed in ManyArray.flushCanonical
- [#4259](https://github.com/emberjs/data/pull/4259) Warn when the JSONAPISerializer is extended with the EmbeddedRecordsM…
- [#4200](https://github.com/emberjs/data/pull/4200) Avoid errors when ember-cli-shims is not included.
- [#4188](https://github.com/emberjs/data/pull/4188) Update ember-cli to v2.3.0
- [#4191](https://github.com/emberjs/data/pull/4191) Don't resolve model name unless actually needed
- [#4189](https://github.com/emberjs/data/pull/4189) AppVeyor: Use same line endings as original files
- [#4193](https://github.com/emberjs/data/pull/4193) support 1.13 officially
- [#4194](https://github.com/emberjs/data/pull/4194) Use modelNameFromPayloadKey when type is given
- [#4196](https://github.com/emberjs/data/pull/4196) Restructure and elaborate on test which fixes a tricky bug
- [#4187](https://github.com/emberjs/data/pull/4187) Add acceptance tests for the mocha blueprints
- [#4197](https://github.com/emberjs/data/pull/4197) Update changelog for Ember Data 2.4
- [#4274](https://github.com/emberjs/data/pull/4274) [DOC canary] Update extractMeta documentation
- [#4230](https://github.com/emberjs/data/pull/4230) Only show ember-cli-shims errors if actually installed
- [#4214](https://github.com/emberjs/data/pull/4214) Fix AMD dependencies
- [#4223](https://github.com/emberjs/data/pull/4223) Run tests in production
- [#4205](https://github.com/emberjs/data/pull/4205) [BUGFIX release] ensure import paths are resolved \w posix separators
- [#4215](https://github.com/emberjs/data/pull/4215) unify prod/dev add-on build
- [#4225](https://github.com/emberjs/data/pull/4225) Don't do inverse work if inverse is explicitly turned off
- [#4228](https://github.com/emberjs/data/pull/4228) Solves #4186 and fixes `this._super` call within `normalize` method.
- [#4222](https://github.com/emberjs/data/pull/4222) Strip code for DS_WARN_ON_UNKNOWN_KEYS warning in production
- [#4220](https://github.com/emberjs/data/pull/4220) Use single quotes
- [#4204](https://github.com/emberjs/data/pull/4204) Fix RESTAdapter.findRecord without a snapshot
- [#4264](https://github.com/emberjs/data/pull/4264) Moved the adapter errors into the public API space.
- [#4247](https://github.com/emberjs/data/pull/4247) Add test asserting no unnecessary inverse work
- [#4235](https://github.com/emberjs/data/pull/4235) [DOC] Fix store.findAll return type
- [#4243](https://github.com/emberjs/data/pull/4243) moves the ember dep in the package-manager package.json into optionalDependencies
- [#4241](https://github.com/emberjs/data/pull/4241) Fix spacing issue thats causing jscs errors on the beta branch
- [#4240](https://github.com/emberjs/data/pull/4240) Add note on `testInDebug`
- [#4248](https://github.com/emberjs/data/pull/4248) fix prod-build issue
- [#4244](https://github.com/emberjs/data/pull/4244) [DOC] Add section on commit tagging to CONTRIBUTING.md
- [#4245](https://github.com/emberjs/data/pull/4245) Tweaks to docs on error responses
- [#4287](https://github.com/emberjs/data/pull/4287) [FEATURE ds-extended-errors] add DS.ServerError
- [#4270](https://github.com/emberjs/data/pull/4270) Fix incorrect reference to `push` in the `findRecord` docs
- [#4260](https://github.com/emberjs/data/pull/4260) Modified the setup-ember-dev test helper to use `ember-metal/debug`s override hooks
- [#4263](https://github.com/emberjs/data/pull/4263) [FEATURE ds-links-in-record-array] Add links to RecordArray when present on payload
- [#4257](https://github.com/emberjs/data/pull/4257) Update changelog for Ember Data 2.4.3
- [#4268](https://github.com/emberjs/data/pull/4268) JSONSerializer should normalize the links object using the attrs hash
- [#4258](https://github.com/emberjs/data/pull/4258) Deprecate normalizeHash method on the rest serializer
- [#4301](https://github.com/emberjs/data/pull/4301) fix rest-adapter-test typo
- [#4278](https://github.com/emberjs/data/pull/4278) Uses bin/start with friendly error message for npm start.
- [#4276](https://github.com/emberjs/data/pull/4276) [BUGFIX canary] Improve finders assertion messages
- [#4304](https://github.com/emberjs/data/pull/4304) pass DS.SnapshotRecordArray to build-url-mixin buildURL
- [#4280](https://github.com/emberjs/data/pull/4280) Update "blueprint-test-helpers" and "ember-cli"
- [#4307](https://github.com/emberjs/data/pull/4307) [skip ci] fix invalid indentation in codeclimate.yml
- [#4288](https://github.com/emberjs/data/pull/4288) [FEATURE ds-extended-errors] fix usage of isEnabled
- [#4284](https://github.com/emberjs/data/pull/4284) [CLEANUP] Use Array.isArray everywhere instead of Ember.isArray
- [#4281](https://github.com/emberjs/data/pull/4281) Speed up JSONSerializer#applyTransforms
- [#4286](https://github.com/emberjs/data/pull/4286) Use the dot reporter to reduce the noise in travis output
- [#4308](https://github.com/emberjs/data/pull/4308) pass snapshot through to urlForFindHasMany and urlForFindBelongsTo
- [#4316](https://github.com/emberjs/data/pull/4316) Fix `isUpdating` for DS.AdapterPopulatedRecordArray#update()
- [#4317](https://github.com/emberjs/data/pull/4317) [CLEANUP] remove reference to no more used isNewSerializerAPI flag

### Release 2.5.3 (May 17, 2016)
- [#4386](https://github.com/emberjs/data/pull/4386) [BUGFIX release] `isUpdating` flag is set correctly for `store.findAll`

### Release 2.5.2 (April 14, 2016)
- [#4328](https://github.com/emberjs/data/pull/4328) [BUGFIX release] Only setup babel options once.
- [#4333](https://github.com/emberjs/data/pull/4333) [BUGFIX release] use es5 syntax for addon's index.js file

### Release 2.5.1 (April 12, 2016)
- [#4320](https://github.com/emberjs/data/pull/4320) [BUGFIX release] Ensure feature flag stripping works for all builds.

### Release 2.5.0 (April 11, 2016)
- [#4293](https://github.com/emberjs/data/pull/4293) Transition an invalid created record to the deleted saved state when deleted
- [#4304](https://github.com/emberjs/data/pull/4304) pass DS.SnapshotRecordArray to build-url-mixin buildURL
- [#4308](https://github.com/emberjs/data/pull/4308) pass snapshot through to urlForFindHasMany and urlForFindBelongsTo
- [#4314](https://github.com/emberjs/data/pull/4314) [BUGFIX beta] convert single record sideloaded records to plural
- [#4316](https://github.com/emberjs/data/pull/4316) Fix `isUpdating` for DS.AdapterPopulatedRecordArray#update()
- [#4245](https://github.com/emberjs/data/pull/4245) Tweaks to docs on error responses
- [#4268](https://github.com/emberjs/data/pull/4268) JSONSerializer should normalize the links object using the attrs hash
- [#4270](https://github.com/emberjs/data/pull/4270) Fix incorrect reference to `push` in the `findRecord` docs
- [#4271](https://github.com/emberjs/data/pull/4271) [BUGFIX beta] Ensure `null` is returned for Reference#value()
- [#4274](https://github.com/emberjs/data/pull/4274) [DOC canary] Update extractMeta documentation
- [#4295](https://github.com/emberjs/data/pull/4295) [DOC release] Mistaken back tick.
- [#4178](https://github.com/emberjs/data/pull/4178) DS.Store type presence checks
- [#4194](https://github.com/emberjs/data/pull/4194) Use modelNameFromPayloadKey when type is given
- [#4243](https://github.com/emberjs/data/pull/4243) moves the ember dep in the package-manager package.json into optionalDependencies
- [#4248](https://github.com/emberjs/data/pull/4248) fix prod-build issue
- [#4250](https://github.com/emberjs/data/pull/4250) [BUGFIX beta] Use Ember.assign when availability
- [#4256](https://github.com/emberjs/data/pull/4256) [BUGFIX release] Revert pr #3864
- [#4214](https://github.com/emberjs/data/pull/4214) Fix AMD dependencies
- [#4184](https://github.com/emberjs/data/pull/4184) blueprints: Use project.dependencies() to determine test framework
- [#3559](https://github.com/emberjs/data/pull/3559) [BUGFIX release] Guard against isDestroyed in ManyArray.flushCanonical
- [#4154](https://github.com/emberjs/data/pull/4154) Make sure new record are not pushed twice when parent is saved before.
- [#4198](https://github.com/emberjs/data/pull/4198) [DOC beta] Fix error message internal docs
- [#4200](https://github.com/emberjs/data/pull/4200) Avoid errors when ember-cli-shims is not included.
- [#4204](https://github.com/emberjs/data/pull/4204) Fix RESTAdapter.findRecord without a snapshot
- [#4205](https://github.com/emberjs/data/pull/4205) [BUGFIX release] ensure import paths are resolved \w posix separators
- [#4221](https://github.com/emberjs/data/pull/4221) [BUGFIX beta] use assert from debug utils so it is stripped correctly
- [#4235](https://github.com/emberjs/data/pull/4235) [DOC] Fix store.findAll return type
- [#4237](https://github.com/emberjs/data/pull/4237) [DOC beta] Fix typo in inline doc. of normalizeResponse
- [#4119](https://github.com/emberjs/data/pull/4119) Add ember.js and ember-data tags automatically to SO question
- [#4063](https://github.com/emberjs/data/pull/4063) [BUGFIX release] don't load "app" code when loading globals files
- [#4040](https://github.com/emberjs/data/pull/4040) Use test helpers from ember dev
- [#4116](https://github.com/emberjs/data/pull/4116) Add assertions for store#query()
- [#4066](https://github.com/emberjs/data/pull/4066) Use correct version number when used as an addon.
- [#4065](https://github.com/emberjs/data/pull/4065) Bump canary to 2.5.0
- [#4070](https://github.com/emberjs/data/pull/4070) Update blueprints to import modules directly
- [#4111](https://github.com/emberjs/data/pull/4111) [BUGFIX beta] Add ducktyping of `AdapterError`
- [#4084](https://github.com/emberjs/data/pull/4084) [cleanup] Remove unnecessary inline JSHint config
- [#4082](https://github.com/emberjs/data/pull/4082) Move the date import to where it is used intead of the root module
- [#4074](https://github.com/emberjs/data/pull/4074) Update README, now that ember-data is a proper addon
- [#4079](https://github.com/emberjs/data/pull/4079) [CLEANUP] remove unused config/ember-defeatureify.js
- [#4078](https://github.com/emberjs/data/pull/4078) Use `Ember.merge` instead of ember-data's shim
- [#4090](https://github.com/emberjs/data/pull/4090) Make yui doc generate links from the project root instead of the file…
- [#4085](https://github.com/emberjs/data/pull/4085) Update codeclimate.yml
- [#4086](https://github.com/emberjs/data/pull/4086) [FEATURE ds-transform-pass-options] pass options to DS.Transform
- [#4141](https://github.com/emberjs/data/pull/4141) [DOC] Document behavior of object level errors with JSON API
- [#4094](https://github.com/emberjs/data/pull/4094) Update changelog for 2.3.2 release
- [#4092](https://github.com/emberjs/data/pull/4092) Delete TRANSITION.md
- [#4152](https://github.com/emberjs/data/pull/4152) Remove extra definition of InvalidError
- [#4100](https://github.com/emberjs/data/pull/4100) [DOC] Replace reference to DS.Store.find
- [#4102](https://github.com/emberjs/data/pull/4102) [DOC] Fix misleading docs for `DS.RESTAdapter.findBelongsTo`
- [#4110](https://github.com/emberjs/data/pull/4110) [FEATURE ds-pushpayload-return] Change `pushPayload` to return a value.
- [#4097](https://github.com/emberjs/data/pull/4097) Update `.npmignore`
- [#4104](https://github.com/emberjs/data/pull/4104) [DOC] Mark `DS.Store.filter` as private
- [#4101](https://github.com/emberjs/data/pull/4101) [cleanup] Remove unneeded `getComputedPropertyDesc` test helper
- [#4160](https://github.com/emberjs/data/pull/4160) Fixes broken link
- [#4128](https://github.com/emberjs/data/pull/4128) Fix calls to keyForRelationship in embedded records
- [#4117](https://github.com/emberjs/data/pull/4117) Add assertion for polymorphic type for HasManyReference#push
- [#4118](https://github.com/emberjs/data/pull/4118) [ci skip] Sort CHANGELOG by version and not date of release
- [#4164](https://github.com/emberjs/data/pull/4164) [CLEANUP] remove `toString` definitions for models in tests
- [#4147](https://github.com/emberjs/data/pull/4147) Fix key remapping for embedded belongsTo
- [#4135](https://github.com/emberjs/data/pull/4135) import require
- [#4153](https://github.com/emberjs/data/pull/4153) calling reload multiple times on a has many triggers only one request
- [#4155](https://github.com/emberjs/data/pull/4155) remove container related deprecation warnings
- [#4159](https://github.com/emberjs/data/pull/4159) [DOC] Mark store.filter as deprecated in JSDoc.
- [#4167](https://github.com/emberjs/data/pull/4167) Add blueprints from ember-cli-mocha
- [#4168](https://github.com/emberjs/data/pull/4168) TravisCI: Use PhantomJS v2.1.1
- [#4169](https://github.com/emberjs/data/pull/4169) Simplify PhantomJS installation on TravisCI
- [#4171](https://github.com/emberjs/data/pull/4171) [CLEANUP] Remove shim for Backburner.join
- [#4172](https://github.com/emberjs/data/pull/4172) [CLEANUP] Remove shim for Ember.Service
- [#4224](https://github.com/emberjs/data/pull/4224) Enable feature flags for 2.5 beta cycle


### Release 2.4.3 (March 22, 2016)
- [#4243](https://github.com/emberjs/data/pull/4243) moves the ember dep in the package-manager package.json into optionalDependencies
- [#4256](https://github.com/emberjs/data/pull/4256) [BUGFIX release] Revert pr #3864

### Release 2.4.2 (March 19, 2016)
- [#4248](https://github.com/emberjs/data/pull/4248) [BUGFIX release] fix prod-build issue

### Release 2.4.1 (March 18, 2016)
- [#3559](https://github.com/emberjs/data/pull/3559) [BUGFIX release] Guard against isDestroyed in ManyArray.flushCanonical
- [#4154](https://github.com/emberjs/data/pull/4154) Make sure new record are not pushed twice when parent is saved before.
- [#4204](https://github.com/emberjs/data/pull/4204) Fix RESTAdapter.findRecord without a snapshot
- [#4205](https://github.com/emberjs/data/pull/4205) [BUGFIX release] ensure import paths are resolved \w posix separators
- [#4214](https://github.com/emberjs/data/pull/4214) Fix AMD dependencies

### Release 2.4.0 (February 29, 2016)
- [#4125](https://github.com/emberjs/data/pull/4125) [BUGFIX beta] Export more public API's via modules
- [#4135](https://github.com/emberjs/data/pull/4135) import require
- [#4137](https://github.com/emberjs/data/pull/4137) [BUGFIX beta] Allow optional spaces when parsing response headers
- [#4141](https://github.com/emberjs/data/pull/4141) [DOC] Document behavior of object level errors with JSON API
- [#4147](https://github.com/emberjs/data/pull/4147) Fix key remapping for embedded belongsTo
- [#4167](https://github.com/emberjs/data/pull/4167) Add blueprints from ember-cli-mocha
- [#4082](https://github.com/emberjs/data/pull/4082) Move the date import to where it is used intead of the root module
- [#4063](https://github.com/emberjs/data/pull/4063) [BUGFIX release] don't load "app" code when loading globals files
- [#4088](https://github.com/emberjs/data/pull/4088) [BUFGIX release] Fix regression with missing initializers
- [#4066](https://github.com/emberjs/data/pull/4066) Use correct version number when used as an addon.
- [#4072](https://github.com/emberjs/data/pull/4072) [BUGFIX release] Fix bundled source path for gem
- [#4073](https://github.com/emberjs/data/pull/4073) [BUGFIX release] Add missing dist source to gem
- [#4077](https://github.com/emberjs/data/pull/4077) [CLEANUP beta] Change the way metadata in response is stored on record array
- [#4084](https://github.com/emberjs/data/pull/4084) [cleanup] Remove unnecessary inline JSHint config
- [#4090](https://github.com/emberjs/data/pull/4090) Make yui doc generate links from the project root instead of the file…
- [#4091](https://github.com/emberjs/data/pull/4091) [BUGFIX release] Refactor Model.reopen to use mixins
- [#4095](https://github.com/emberjs/data/pull/4095) [BUGFIX release] Remove 'v' prefix from `DS.VERSION`
- [#4108](https://github.com/emberjs/data/pull/4108) [BUGFIX beta] Fix `BuildUrlMixin.urlPrefix` regression when host=/
- [#3999](https://github.com/emberjs/data/pull/3999) Run the Ember Data initializer when Ember Data is loaded as an Ember …
- [#3941](https://github.com/emberjs/data/pull/3941) Mark `adapterFor` and `serializerFor` as public
- [#3813](https://github.com/emberjs/data/pull/3813) ember-data should provide its blueprints
- [#3916](https://github.com/emberjs/data/pull/3916) `Store._find` asserts `adapterPayload` not empty
- [#3940](https://github.com/emberjs/data/pull/3940) Remove JSONSerializer#normalizeId
- [#3303](https://github.com/emberjs/data/pull/3303) Implement RFC 57 - Reference Unification
- [#3864](https://github.com/emberjs/data/pull/3864) Throw a more helpful error message if the response from queryRecord i…
- [#3930](https://github.com/emberjs/data/pull/3930) Friendly Errors
- [#2384](https://github.com/emberjs/data/pull/2384) Directly reloading a hasMany with links should trigger only one request
- [#3853](https://github.com/emberjs/data/pull/3853) fix transitioning into invalid state
- [#3841](https://github.com/emberjs/data/pull/3841) Log a deprecation warning when when Ember Data is loaded with Ember 1.13
- [#3926](https://github.com/emberjs/data/pull/3926) Run `ember watson: methodify` on `addon/` and `test/`
- [#4009](https://github.com/emberjs/data/pull/4009) [FEATURE ds-references] More conistency for RecordReference
- [#3961](https://github.com/emberjs/data/pull/3961) Add a better error message when findRecord returns an array
- [#3949](https://github.com/emberjs/data/pull/3949) Fix incorrect reference in store api docs
- [#3946](https://github.com/emberjs/data/pull/3946) Report better error when `type` is missing from a JSONApi response
- [#3958](https://github.com/emberjs/data/pull/3958) [DOCS fix] fix incorrect argument description...
- [#4014](https://github.com/emberjs/data/pull/4014) Register the version before the DEBUG version are printed when loadin…
- [#3968](https://github.com/emberjs/data/pull/3968) Add failing test on PromiseArray.createRecord when called before hasM…
- [#3965](https://github.com/emberjs/data/pull/3965) [Doc] Specify the status code expected to populate the error object
- [#3964](https://github.com/emberjs/data/pull/3964) Merge normalizeRelationships and setupRelationships methods in store
- [#3967](https://github.com/emberjs/data/pull/3967) Added documentation to modify the hash by reference
- [#3966](https://github.com/emberjs/data/pull/3966) tests for #3707
- [#4016](https://github.com/emberjs/data/pull/4016) Add missing dependencies for the changelog script
- [#3970](https://github.com/emberjs/data/pull/3970) [CLEANUP] move test file to correct location
- [#4017](https://github.com/emberjs/data/pull/4017) [FEATURE ds-references] bring back accidentally removed tests
- [#3985](https://github.com/emberjs/data/pull/3985) Remove extraneous conditional in ajax()
- [#3980](https://github.com/emberjs/data/pull/3980) Add license field to bower.json
- [#3979](https://github.com/emberjs/data/pull/3979) Re-enable feature flags
- [#3974](https://github.com/emberjs/data/pull/3974) Remove duplicate createRecord test
- [#3973](https://github.com/emberjs/data/pull/3973) [CLEANUP] use debug helpers from ember-data/debug
- [#3983](https://github.com/emberjs/data/pull/3983) Fix documentation to use "serializedHasManyName"
- [#3984](https://github.com/emberjs/data/pull/3984) Cleanup .jshintrc since no globals are used anymore
- [#3976](https://github.com/emberjs/data/pull/3976) Allow `include` query parameter with store.findRecord & store.findAll
- [#4000](https://github.com/emberjs/data/pull/4000) Re-enable pushing builds to S3
- [#3996](https://github.com/emberjs/data/pull/3996) Update ember-cli-shims to 0.1.0 to silence ED's own warning
- [#3988](https://github.com/emberjs/data/pull/3988) [PERF] Don't use array methods
- [#3989](https://github.com/emberjs/data/pull/3989) Rely on internalModel.createSnapshot to set adapterOptions
- [#3990](https://github.com/emberjs/data/pull/3990) Update adapter function references in test
- [#3993](https://github.com/emberjs/data/pull/3993) Do not publish .gem files to npm
- [#4025](https://github.com/emberjs/data/pull/4025) Use keyForReliationship for belongsTo and hasMany
- [#4007](https://github.com/emberjs/data/pull/4007) [CLEANUP] Use `isEnabled` instead of `Ember.FEATURES` directly
- [#4006](https://github.com/emberjs/data/pull/4006) [CLEANUP] Separate buildURL tests from pathForType tests
- [#4001](https://github.com/emberjs/data/pull/4001) Add ember-publisher to package.json
- [#4004](https://github.com/emberjs/data/pull/4004) [CLEANUP] remove unused feature-flags.js
- [#4003](https://github.com/emberjs/data/pull/4003) Only run the Ember.onload initializers in globals mode
- [#4005](https://github.com/emberjs/data/pull/4005) don't cache length in for loops
- [#4002](https://github.com/emberjs/data/pull/4002) Fix paths to files which should be uploaded to S3
- [#4049](https://github.com/emberjs/data/pull/4049) Run node tests and optional feature tests on AppVeyor
- [#4015](https://github.com/emberjs/data/pull/4015) [CLEANUP] Don't cache length in for loops
- [#4019](https://github.com/emberjs/data/pull/4019) Use JSON-API adapter and serializer in blueprints
- [#4018](https://github.com/emberjs/data/pull/4018) [CLEANUP] re-use test setup to assert correct call to adapter.ajax
- [#4011](https://github.com/emberjs/data/pull/4011) [CLEANUP] Update and remove obsolete comments
- [#4030](https://github.com/emberjs/data/pull/4030) [CLEANUP] use methods from utils module directly
- [#4029](https://github.com/emberjs/data/pull/4029) Move public modules out of the `-private` folder
- [#4051](https://github.com/emberjs/data/pull/4051) Make setup-container public to allow consuming apps more flexibility with initializer
- [#4037](https://github.com/emberjs/data/pull/4037) Happy New Year!
- [#4035](https://github.com/emberjs/data/pull/4035) Simplify the urlPrefix method to make it easier to understand
- [#4031](https://github.com/emberjs/data/pull/4031) [CLEANUP] Remove special logic for meta.descs in tests
- [#4032](https://github.com/emberjs/data/pull/4032) [CLEANUP] remove obsolete code within Store#willDestroy
- [#4039](https://github.com/emberjs/data/pull/4039) Replace calls to store.find with store.findRecord
- [#4053](https://github.com/emberjs/data/pull/4053) [FEATURE ds-references] Only add function to prototype if enabled
- [#4059](https://github.com/emberjs/data/pull/4059) Update name for feature in FEATURES.md


### Release 2.3.3 (January 21, 2016)
- [#4095](https://github.com/emberjs/data/pull/4095) [BUGFIX release] Remove 'v' prefix from `DS.VERSION`

### Release 2.3.2 (January 18, 2016)
- [#4000](https://github.com/emberjs/data/pull/4000) Re-enable pushing builds to S3
- [#4002](https://github.com/emberjs/data/pull/4002) Fix paths to files which should be uploaded to S3
- [#4072](https://github.com/emberjs/data/pull/4072) [BUGFIX release] Fix bundled source path for gem
- [#4073](https://github.com/emberjs/data/pull/4073) [BUGFIX release] Add missing dist source to gem
- [#4082](https://github.com/emberjs/data/pull/4082) Move the date import to where it is used intead of the root module
- [#4084](https://github.com/emberjs/data/pull/4084) [cleanup] Remove unnecessary inline JSHint config
- [#4088](https://github.com/emberjs/data/pull/4088) [BUFGIX release] Fix regression with missing initializers
- [#4090](https://github.com/emberjs/data/pull/4090) Make yui doc generate links from the project root instead of the file…
- [#4091](https://github.com/emberjs/data/pull/4091) [BUGFIX release] Refactor Model.reopen to use mixins

### Release 2.3.1 (January 12, 2016)
- [#4063](https://github.com/emberjs/data/pull/4063) [BUGFIX release] don't load "app" code when loading globals files
- [#4066](https://github.com/emberjs/data/pull/4066) Use correct version number when used as an addon.

### Release 2.3.0 (January 12, 2016)

Ember Data 2.3 is now published as and Ember CLI addon in addition to a bower package. 
See the [release notes](http://emberjs.com/blog/2016/01/12/ember-data-2-3-released.html#toc_changes-in-ember-data-2-3)
for instruction on how to upgrade your Ember CLI project to take advantage of the Ember Data addon.

- [#4039](https://github.com/emberjs/data/pull/4039) Replace calls to store.find with store.findRecord
- [#4042](https://github.com/emberjs/data/pull/4042) [BUGFIX beta] prevent calls to store.query leaking
- [#4048](https://github.com/emberjs/data/pull/4048) Strip stuff from addon before it is added to app
- [#4050](https://github.com/emberjs/data/pull/4050) [BUGFIX beta] Functional update for adapter populated record arrays
- [#4051](https://github.com/emberjs/data/pull/4051) Make setup-container public to allow consuming apps more flexibility with initializer
- [#4052](https://github.com/emberjs/data/pull/4052) [DOC beta] Hide private classes from YUIDoc
- [#4055](https://github.com/emberjs/data/pull/4055) [BUGFIX beta] pin jquery to 1.11.3 to fix broken build
- [#4057](https://github.com/emberjs/data/pull/4057) [BUGFIX beta] fail builds in ember-cli when ember-cli-shims isn't met
- [#4058](https://github.com/emberjs/data/pull/4058) [BUGFIX beta] Do not expose the array argument on store.query
- [#4060](https://github.com/emberjs/data/pull/4060) Require ember-source 2.x
- [#4018](https://github.com/emberjs/data/pull/4018) [CLEANUP] re-use test setup to assert correct call to adapter.ajax
- [#4019](https://github.com/emberjs/data/pull/4019) Use JSON-API adapter and serializer in blueprints
- [#4021](https://github.com/emberjs/data/pull/4021) [BUGFIX beta] Move ember-inflector to an explicit dependency for the …
- [#4025](https://github.com/emberjs/data/pull/4025) Use keyForReliationship for belongsTo and hasMany
- [#4029](https://github.com/emberjs/data/pull/4029) [BUGFIX beta] Move public modules out of the `-private` folder 
- [#4026](https://github.com/emberjs/data/pull/4026) [BUGFIX beta] ignores keys that are not found in the map
- [#3813](https://github.com/emberjs/data/pull/3813) ember-data should provide its blueprints
- [#3996](https://github.com/emberjs/data/pull/3996) Update ember-cli-shims to 0.1.0 to silence ED's own warning
- [#3999](https://github.com/emberjs/data/pull/3999) Run the Ember Data initializer when Ember Data is loaded as an Ember …
- [#4003](https://github.com/emberjs/data/pull/4003) Only run the Ember.onload initializers in globals mode
- [#4010](https://github.com/emberjs/data/pull/4010) [DOC beta] Mark comments as private
- [#4014](https://github.com/emberjs/data/pull/4014) Register the version before the DEBUG version are printed when loadin…
- [#3995](https://github.com/emberjs/data/pull/3995) [BUGFIX beta] Implement public module API.
- [#3865](https://github.com/emberjs/data/pull/3943) [PERF] Ajax should join an existing run if one exists
- [#3949](https://github.com/emberjs/data/pull/3949) Fix incorrect reference in store api docs
- [#3841](https://github.com/emberjs/data/pull/3841) Log a deprecation warning when when Ember Data is loaded with Ember 1.13
- [#3973](https://github.com/emberjs/data/pull/3973) [CLEANUP] use debug helpers from ember-data/debug
- [#3978](https://github.com/emberjs/data/pull/3978) [BUGFIX beta] bump ember-inflector
- [#3983](https://github.com/emberjs/data/pull/3983) [DOC beta] Fix documentation to use "serializedHasManyName"
- [#3986](https://github.com/emberjs/data/pull/3986) Move private modules into the `-private` directory
- [#3865](https://github.com/emberjs/data/pull/3865) Assert that passed array to set a hasMany consists of records
- [#3820](https://github.com/emberjs/data/pull/3820) [CLEANUP] Remove duplicate test for creating record
- [#3819](https://github.com/emberjs/data/pull/3819) [CLEANUP] Remove duplicate `default export` in snapshot.js
- [#3713](https://github.com/emberjs/data/pull/3713) Document the return value of DS.Adapter#updateRecord
- [#3390](https://github.com/emberjs/data/pull/3390) Update the jsbin link so it has no deprecation warnings
- [#3835](https://github.com/emberjs/data/pull/3835) [BUGFIX] extract polymorphic belongsTo in RESTSerializer
- [#3829](https://github.com/emberjs/data/pull/3829) Remove references to findQuery
- [#3824](https://github.com/emberjs/data/pull/3824) [DOCS] Improve docs for JSONSerializer
- [#3828](https://github.com/emberjs/data/pull/3828) [CLEANUP] Make idiomatic use of `export default`
- [#3821](https://github.com/emberjs/data/pull/3821) [CLEANUP] Remove unecessary wrap of rejection in run-loop
- [#3827](https://github.com/emberjs/data/pull/3827) [DOC] Remove reference to `isDirty` in DS.Model documentation
- [#3839](https://github.com/emberjs/data/pull/3839) Cleanup build
- [#3831](https://github.com/emberjs/data/pull/3831) [CLEANUP] dasherize file name for hasRecordForId test
- [#3830](https://github.com/emberjs/data/pull/3830) Fix tests for non-dasherized lookups
- [#3837](https://github.com/emberjs/data/pull/3837) [BUGFIX] Attribute/relationship named "type" of embedded record is considered before normalization
- [#3832](https://github.com/emberjs/data/pull/3832) Fix API docs for JSONAPISerializer.normalize
- [#3834](https://github.com/emberjs/data/pull/3834) raise errors on deprecation
- [#3843](https://github.com/emberjs/data/pull/3843) Remove unneeded PromiseArray allocation
- [#3844](https://github.com/emberjs/data/pull/3844) Remove conditional statement that is always true
- [#3855](https://github.com/emberjs/data/pull/3855) Deprecate complex objects as an attributes `defaultValue`.
- [#3850](https://github.com/emberjs/data/pull/3850) [DOC] Document snapshotRecordArray param passed to adapter.findAll
- [#3868](https://github.com/emberjs/data/pull/3868) Reset changed attributes when matching data is pushed
- [#3869](https://github.com/emberjs/data/pull/3869) Update the Changelog for 1.13.14
- [#3867](https://github.com/emberjs/data/pull/3867) Allow serializers to normalize response, remove old internal serializers code
- [#3858](https://github.com/emberjs/data/pull/3858) [DOC] remove documentation for `isError` in states
- [#3866](https://github.com/emberjs/data/pull/3866) Allow store.push to accept { data: null }
- [#3860](https://github.com/emberjs/data/pull/3860) [CLEANUP] remove unused private method in AdapterPopulatedRecordArray
- [#3907](https://github.com/emberjs/data/pull/3907) Addonize
- [#3898](https://github.com/emberjs/data/pull/3898) Fix DS.Errors summary and error object example
- [#3889](https://github.com/emberjs/data/pull/3889)  [perf] minor adjustments to `store#push` flow
- [#3928](https://github.com/emberjs/data/pull/3928) update README stating no IE8 support
- [#3915](https://github.com/emberjs/data/pull/3915) Add null implementation of findMany in DS.Adapter
- [#3904](https://github.com/emberjs/data/pull/3904) Cleanup `.codeclimate.yml`
- [#3912](https://github.com/emberjs/data/pull/3912) Use public API for container/registry when possible.
- [#3924](https://github.com/emberjs/data/pull/3924) [CLEANUP] `tests/integration/adapter/find-test.js`
- [#3925](https://github.com/emberjs/data/pull/3925) [CLEANUP] Clean up adapter/find-all-test.js
- [#3927](https://github.com/emberjs/data/pull/3927) restore globals publishing to canary build
- [#3929](https://github.com/emberjs/data/pull/3929) upgrade node to 4 on CI
- [#3931](https://github.com/emberjs/data/pull/3931) update ember-cli to 1.13.12

### Release 2.2.0 (November 17, 2015)
- [#3937](https://github.com/emberjs/data/pull/3937) [BUGFIX beta] Warn instead of asserting when a mapped key doesn't mat…
- [#3868](https://github.com/emberjs/data/pull/3868) Reset changed attributes when matching data is pushed
- [#3875](https://github.com/emberjs/data/pull/3875) [BUGFIX beta] serialize type for embedded, polymorphic belongsTo
- [#3900](https://github.com/emberjs/data/pull/3900) [DOC fix] errors pointers should start with a /
- [#3905](https://github.com/emberjs/data/pull/3905) [BUGFIX release] Update the dependencies for Ember 2.x
- [#3909](https://github.com/emberjs/data/pull/3909) [BUGFIX beta] Correctly handle object level errors in json api
- [#3910](https://github.com/emberjs/data/pull/3910) [BUGFIX release] Normalize attrs keys
- [#3912](https://github.com/emberjs/data/pull/3912) Use public API for container/registry when possible.]
- [#3835](https://github.com/emberjs/data/pull/3835) [BUGFIX] extract polymorphic belongsTo in RESTSerializer
- [#3887](https://github.com/emberjs/data/pull/3887) [BUGFIX release] update ember-inflector to resolve default Inflector …
- [#3888](https://github.com/emberjs/data/pull/3888) [BUGFIX release] import from ember-inflector to use the default instance
- [#3832](https://github.com/emberjs/data/pull/3832) Fix API docs for JSONAPISerializer.normalize
- [#3837](https://github.com/emberjs/data/pull/3837) [BUGFIX] Attribute/relationship named "type" of embedded record is considered before normalization
- [#3846](https://github.com/emberjs/data/pull/3846) [BUGFIX beta] Attribute/relationship named "type" of primary record i…
- [#3847](https://github.com/emberjs/data/pull/3847) [BUGFIX beta] JSONAPI serializer not respecting 'attrs' hash
- [#3857](https://github.com/emberjs/data/pull/3857) [BUGFIX beta] rollbackAttributes() works after multiple failed saves
- [#3859](https://github.com/emberjs/data/pull/3859) [BUGFIX beta] Correctly handle invalid errors without payload or pointer
- [#3861](https://github.com/emberjs/data/pull/3861) [BUGFIX beta] Assert that an array is returned from the normalized re…
- [#3867](https://github.com/emberjs/data/pull/3867) Allow serializers to normalize response, remove old internal serializers code
- [#3697](https://github.com/emberjs/data/pull/3697) Fix typo in CHANGELOG
- [#3215](https://github.com/emberjs/data/pull/3215) remove Map/MapWithDefault polyfills, use Ember's ones
- [#3711](https://github.com/emberjs/data/pull/3711) Explicitly set length after setting a new content property
- [#3714](https://github.com/emberjs/data/pull/3714) Update the location of the custom store in the API doc example
- [#3699](https://github.com/emberjs/data/pull/3699) [refactor] add some tests asserting polymorphic relationships can be …
- [#3751](https://github.com/emberjs/data/pull/3751) Remove normalizePayload, associated docs, and mention of functionality.
- [#3732](https://github.com/emberjs/data/pull/3732) follow up fixes for #3701
- [#3746](https://github.com/emberjs/data/pull/3746) Improve test coverage for store#findRecord()
- [#3722](https://github.com/emberjs/data/pull/3722) Shape and cleanup
- [#3739](https://github.com/emberjs/data/pull/3739) store example should use findRecord()
- [#3734](https://github.com/emberjs/data/pull/3734) Revert "Explicitly set length after setting a new content property"
- [#3783](https://github.com/emberjs/data/pull/3783) Update changelog for 2.0.1 release
- [#3771](https://github.com/emberjs/data/pull/3771) update coalesceFindRequests doc for JSONAPIAdapter
- [#3774](https://github.com/emberjs/data/pull/3774) Fix embedded key serialization bug and refactor key serialization
- [#3773](https://github.com/emberjs/data/pull/3773) Break apart embedded serialize methods in EmbeddedRecordsMixin
- [#3777](https://github.com/emberjs/data/pull/3777) Remove unused test module
- [#3788](https://github.com/emberjs/data/pull/3788) Port pr #3725 to the release 2.0 branch
- [#3795](https://github.com/emberjs/data/pull/3795) Trigger an assertion when calling `findRecord` with falsy (except 0) id
- [#3808](https://github.com/emberjs/data/pull/3808) Update internal-model.js
- [#3814](https://github.com/emberjs/data/pull/3814) [BUGFIX] Do not deserialize when a relationship named `type` exists
- [#3816](https://github.com/emberjs/data/pull/3816) run optional feature tests on AppVeyor
- [#3817](https://github.com/emberjs/data/pull/3817) Update the changelog for Ember Data 2.1.0

### Release 2.1.0 (October 5, 2015)
- [#3811](https://github.com/emberjs/data/pull/3811) Format lists in JSONSerializer docs for rendering
- [#3814](https://github.com/emberjs/data/pull/3814) [BUGFIX] Do not deserialize when a relationship named `type` exists
- [#3781](https://github.com/emberjs/data/pull/3781) [BUGFIX beta] Fix id property in DS.Model once and for all
- [#3783](https://github.com/emberjs/data/pull/3783) Update changelog for 2.0.1 release
- [#3788](https://github.com/emberjs/data/pull/3788) Port pr #3725 to the release 2.0 branch
- [#3793](https://github.com/emberjs/data/pull/3793) Map iteration has `value, key` params 'backwards'
- [#3794](https://github.com/emberjs/data/pull/3794) [DOC release] Update documentation for store
- [#3796](https://github.com/emberjs/data/pull/3796) [DOC release] Update documentation for EmbeddedRecordsMixin.
- [#3764](https://github.com/emberjs/data/pull/3764) [BUGFIX beta] Support JSON API links object
- [15d4360c](https://github.com/emberjs/data/commit/15d4360c1be0906f594718d55660151cd5f26af3) [BUGFIX release] Improve links vs. local data for relationships
- [#3751](https://github.com/emberjs/data/pull/3751) Remove normalizePayload, associated docs, and mention of functionality.
- [#3749](https://github.com/emberjs/data/pull/3749) [DOC beta] Update Object Root docs re: plurals
- [#3763](https://github.com/emberjs/data/pull/3763) [BUGFIX beta] JSONAPISerializer warns for unknown type
- [#3767](https://github.com/emberjs/data/pull/3767) [BUGFIX release] Do not export jsdoc information for store helper fun…
- [#3771](https://github.com/emberjs/data/pull/3771) update coalesceFindRequests doc for JSONAPIAdapter
- [#3739](https://github.com/emberjs/data/pull/3739) store example should use findRecord()
- [#3747](https://github.com/emberjs/data/pull/3747) [BUGFIX beta] JSONSerializer.extractRelationships() issue #3736
- [#3779](https://github.com/emberjs/data/pull/3779) [BUGFIX release] Remove store method deprecations
- [#3778](https://github.com/emberjs/data/pull/3778) [BUGFIX release] Remove deprecation on store.filter
- [#3776](https://github.com/emberjs/data/pull/3776) [BUGFIX release] Remove deprecation for old InvalidErrors format
- [#3765](https://github.com/emberjs/data/pull/3765) [BUGFIX beta] Fix JSONSerializer.serializeHasMany() issue #3760
- [#3782](https://github.com/emberjs/data/pull/3782) [DOC release] Remove private label for findAll, query, queryRecord
- [#3762](https://github.com/emberjs/data/pull/3762) [BUGFIX release] Improve links vs. local data for relationships
- [#3701](https://github.com/emberjs/data/pull/3701) [BUGFIX release] fix regression where dynamically set id is not serialized in a create…
- [#3714](https://github.com/emberjs/data/pull/3714) Update the location of the custom store in the API doc example
- [#3717](https://github.com/emberjs/data/pull/3717) Remove Fixture Adapter
- [#3722](https://github.com/emberjs/data/pull/3722) Shape and cleanup
- [#3732](https://github.com/emberjs/data/pull/3732) follow up fixes for #3701
- [#3641](https://github.com/emberjs/data/pull/3641) Improve InternalModel (2x - 3x faster)
- [#3649](https://github.com/emberjs/data/pull/3649) Empty object
- [#3647](https://github.com/emberjs/data/pull/3647) Adapter.query should be part of the public overrideable interface.

### Release 2.0.1 (September 17, 2015)

- [#3751](https://github.com/emberjs/data/pull/3751) Remove normalizePayload, associated docs, and mention of functionality.
- [#3762](https://github.com/emberjs/data/pull/3762) [BUGFIX release] Improve links vs. local data for relationships
- [#3767](https://github.com/emberjs/data/pull/3767) [BUGFIX release] Do not export jsdoc information for store helper fun…
- [#3771](https://github.com/emberjs/data/pull/3771) update coalesceFindRequests doc for JSONAPIAdapter
- [#3776](https://github.com/emberjs/data/pull/3776) [BUGFIX release] Remove deprecation for old InvalidErrors format
- [#3778](https://github.com/emberjs/data/pull/3778) [BUGFIX release] Remove deprecation on store.filter
- [#3779](https://github.com/emberjs/data/pull/3779) [BUGFIX release] Remove store method deprecations
- [#3782](https://github.com/emberjs/data/pull/3782) [DOC release] Remove private label for findAll, query, queryRecord

### Release 2.0.0 (August 20, 2015)

#### Breaking Changes

##### Unsaved deleted records are no longer removed from hasMany relationships and RecordArrays returned by the store

In Ember Data 1.13 once a record was marked as deleted it was removed from all of the RecordArrays and hasMany arrays it belongTo. This made it difficult to create UIs where a user could flag a record for deletion but still allow the user the ability to un-flag the record until the save request was made.

In Ember Data 2.0 a record will no longer be removed from hasMany relationships or RecordArrays until the delete has been acknowledged by the adapter. Although deleted records will be visible in hasMany relationships they will not be serialized when saving these relationships to the backend.

#### Changes

- [#3665](https://github.com/emberjs/data/pull/3665) [BUGFIX beta] Fix usage of registry for 2.1.0+.
- [#3577](https://github.com/emberjs/data/pull/3577) Use the correct modelClass and serializer to extract a polymorphic ty…
- [#3669](https://github.com/emberjs/data/pull/3669) [DOC beta] Changed references to App.Person & App.Post in RESTAdapter API docs
- [#3636](https://github.com/emberjs/data/pull/3636) Add ember-cli-dependency-checker.
- [#3670](https://github.com/emberjs/data/pull/3670) [DOC beta] Change to decorator-style CPs in RESTAdapter API doc samples
- [#3651](https://github.com/emberjs/data/pull/3651) [DOC release] Update changelog for 1.13.9
- [#3653](https://github.com/emberjs/data/pull/3653) [BUGFIX beta] Update the dependencies for Ember 2.0
- [#3654](https://github.com/emberjs/data/pull/3654) Revert the live filterBy changes in Ember Data beta.1
- [#3656](https://github.com/emberjs/data/pull/3656) Update the changelog for 2.0.0-beta.2
- [#3661](https://github.com/emberjs/data/pull/3661) [DOC beta] Changed @default adapter from RESTAdapter to JSONAPIAdapter
- [#3666](https://github.com/emberjs/data/pull/3666) [BUGFIX beta] Initializer/Instance Initializer Deprecations.
- [#3672](https://github.com/emberjs/data/pull/3672) [DOC beta] Changed remaining CPs to decorator-style in RESTAdapter apidocs sample
- [#3680](https://github.com/emberjs/data/pull/3680) [BUGFIX beta] Prefer the new injection methods.
- [#3681](https://github.com/emberjs/data/pull/3681) [BUGFIX beta] Update required methods for the Serializer class
- [#3651](https://github.com/emberjs/data/pull/3651) [DOC release] Update changelog for 1.13.9
- [#3653](https://github.com/emberjs/data/pull/3653) [BUGFIX beta] Update the dependencies for Ember 2.0
- [#3654](https://github.com/emberjs/data/pull/3654) Revert the live filterBy changes in Ember Data beta.1
- [#3375](https://github.com/emberjs/data/pull/3375) JSONAPISerializer only supports the new Serializer API
- [#3251](https://github.com/emberjs/data/pull/3251) Convert unload test to json api format for `store.push`.. #3223
- [#3345](https://github.com/emberjs/data/pull/3345) [CLEANUP] drop IE8 support
- [#3487](https://github.com/emberjs/data/pull/3487) Default to using the JSONAPIAdapter
- [#3389](https://github.com/emberjs/data/pull/3389) Re-enable beta and canary tests
- [#3383](https://github.com/emberjs/data/pull/3383) update ember-inflector to 1.6.2
- [#3384](https://github.com/emberjs/data/pull/3384) Assert if the RESTSerializers when using the new format calls another
- [#3379](https://github.com/emberjs/data/pull/3379) store.push should support arrays in the JSONAPI data property
- [#3388](https://github.com/emberjs/data/pull/3388) Have looked up ActiveModelSerializer opt into the new Serializer API
- [#3489](https://github.com/emberjs/data/pull/3489) Remove deprecated code from the Ember Data initializer
- [#3396](https://github.com/emberjs/data/pull/3396) make sure deprecate error doesnt get swallowed when using store.push(type, data)
- [#3392](https://github.com/emberjs/data/pull/3392) AMS modelNameFromPayloadKey and serializePolymorphicType cleanup
- [#3394](https://github.com/emberjs/data/pull/3394) [DOC] Deprecate store.pushMany in documentation
- [#3408](https://github.com/emberjs/data/pull/3408) Fix Typos in Documentation for DS.Adapter
- [#3433](https://github.com/emberjs/data/pull/3433) Fix deprecation warnings
- [#3430](https://github.com/emberjs/data/pull/3430) [CLEANUP beta] Remove old Serializer API
- [#3432](https://github.com/emberjs/data/pull/3432) [CLEANUP beta] Use Object.keys/Object.create instead of Ember.keys/Ember.create
- [#3420](https://github.com/emberjs/data/pull/3420) [CLEANUP] Remove ember-new-computed dependency
- [#3410](https://github.com/emberjs/data/pull/3410) Fix minor typo in deprecation warning
- [#3488](https://github.com/emberjs/data/pull/3488) Relationships are async by default in 2.0
- [#3462](https://github.com/emberjs/data/pull/3462) Fix documentation typos in Adapter
- [#3441](https://github.com/emberjs/data/pull/3441) [CLEANUP beta] Remove ManyArray deprecations
- [#3440](https://github.com/emberjs/data/pull/3440) [CLEANUP beta] Remove RESTSerializer deprecations
- [#3439](https://github.com/emberjs/data/pull/3439) [CLEANUP beta] Remove RESTAdapter deprecations
- [#3438](https://github.com/emberjs/data/pull/3438) [CLEANUP beta] Remove BuildURLMixin deprecations
- [#3442](https://github.com/emberjs/data/pull/3442) [CLEANUP beta] Remove Model deprecations
- [#3443](https://github.com/emberjs/data/pull/3443) [CLEANUP beta] Remove Snapshot deprecations
- [#3436](https://github.com/emberjs/data/pull/3436) Fix Ember Data build with fresh install
- [#3457](https://github.com/emberjs/data/pull/3457) [CLEANUP beta] Remove ActiveModelAdapter/Serializer
- [#3458](https://github.com/emberjs/data/pull/3458) [DOC] createRecord relationships close #3421
- [#3490](https://github.com/emberjs/data/pull/3490) Remove deprecated finder methods on the store.
- [#3469](https://github.com/emberjs/data/pull/3469) Update shouldReload* flags for 2.0
- [#3470](https://github.com/emberjs/data/pull/3470) Fix broken link
- [#3473](https://github.com/emberjs/data/pull/3473) [DOC] Fill @property of DS.Model.modelName
- [#3481](https://github.com/emberjs/data/pull/3481) update errors.js docs to mirror new json api error specs
- [#3477](https://github.com/emberjs/data/pull/3477) Add modelClass argument to JSONSerializer.extractId
- [#3539](https://github.com/emberjs/data/pull/3539) Only remove deleted records form record arrays when saved
- [#3496](https://github.com/emberjs/data/pull/3496) Update README.md
- [#3497](https://github.com/emberjs/data/pull/3497) Use `detail` instead of `details` for JSON API error objects
- [#3532](https://github.com/emberjs/data/pull/3532) [CLEANUP beta] Remove Store deprecations
- [#3550](https://github.com/emberjs/data/pull/3550) Fix JSONSerializer to pass through `payload.included`
- [#3534](https://github.com/emberjs/data/pull/3534) Rename error attribute
- [#3544](https://github.com/emberjs/data/pull/3544) Add error message in _pushInternalMessage when unknown type
- [#3531](https://github.com/emberjs/data/pull/3531) Adds some documentation for JSONApiSerializer
- [#3533](https://github.com/emberjs/data/pull/3533) [CLEANUP beta] Remove console.log() call
- [#3567](https://github.com/emberjs/data/pull/3567) Use Ember.$ instead of jQuery for AJAX requests
- [#3570](https://github.com/emberjs/data/pull/3570) Update `Ember.deprecate` and `Ember.warn` calls to include required information

### Release 1.13.16 (February 9, 2016)

- [#4143](https://github.com/emberjs/data/pull/4143) Update Ember
  Inflector and correct Ember Data's usage of it so that users' default
  custom inflections work.

### Release 1.13.15 (November 9, 2015)
- [#3876](https://github.com/emberjs/data/pull/3876) [BACKPORT] [BUGFIX beta] serialize type for embedded, polymorphic belongsTo
- [#3891](https://github.com/emberjs/data/pull/3891) Don't use Ember.create by default

### Release 1.13.14 (October 18, 2015)
- [#3665](https://github.com/emberjs/data/pull/3665) [BUGFIX beta] Fix usage of registry for 2.1.0+.
- [#3825](https://github.com/emberjs/data/pull/3825) [BUGFIX] Restore IE8 compatibility by using Ember.create
- [#3837](https://github.com/emberjs/data/pull/3837) [BUGFIX] Attribute/relationship named "type" of embedded record is considered before normalization
- [#3840](https://github.com/emberjs/data/pull/3840) Backport Fix usage of registry for 2.1.0+ from pr #3665
- [#3846](https://github.com/emberjs/data/pull/3846) [BUGFIX beta] Attribute/relationship named "type" of primary record i…
- [#3847](https://github.com/emberjs/data/pull/3847) [BUGFIX beta] JSONAPI serializer not respecting 'attrs' hash
- [#3857](https://github.com/emberjs/data/pull/3857) [BUGFIX beta] rollbackAttributes() works after multiple failed saves
- [#3859](https://github.com/emberjs/data/pull/3859) [BUGFIX beta] Correctly handle invalid errors without payload or pointer

### Release 1.13.13 (September 17, 2015)
- [#3762](https://github.com/emberjs/data/pull/3762) [BUGFIX release]
  Improve links vs. local data for relationships

### Release 1.13.12 (September 10, 2015)
- [#3689](https://github.com/emberjs/data/pull/3689) Backport
  empty-object performance improvements from 2.1.0-beta1
- [#3690](https://github.com/emberjs/data/pull/3690)
  [BUGFIX release-1-13] Ensure that `service:store` is cleared before
  regsitering.
- [#3725](https://github.com/emberjs/data/pull/3725)
  [BUGFIX release-1-13] Disable polymorphic deserialization when a
  mode…
- [#3753](https://github.com/emberjs/data/pull/3753) Bumped the
  ember-inflector version to 1.9.2.
- [#3754](https://github.com/emberjs/data/pull/3754) Do not run tests
  with Ember 2.0 in the Ember Data 1.13 appveyor builds


### Release 1.13.11 (August 21, 2015)

- [#3685](https://github.com/emberjs/data/pull/3685) Fixing typo that
  causes Ember-Data v1.13.10 to crash with Ember v2.0.
- [#3686](https://github.com/emberjs/data/pull/3686) Fix broken
  rest-serializer test.

### Release 1.13.10 (August 20, 2015)

- [#3577](https://github.com/emberjs/data/pull/3577) Use the correct
  modelClass and serializer to extract a polymorphic
- [#3667](https://github.com/emberjs/data/pull/3667) Don’t crash \w
  Ember 2.0


### Release 1.13.9 (August 13, 2015)

#### Breaking Changes

The live updating `filterBy` on RecordArrays and ManyArrays has been
reverted because it broke existing applications. See
[#3263](https://github.com/emberjs/data/pull/3263).

#### Changes

- [#3633](https://github.com/emberjs/data/pull/3633) Fixed typo.
- [#3639](https://github.com/emberjs/data/pull/3639) Remove todo in API doc
- [#3648](https://github.com/emberjs/data/pull/3648) Revert filter by
- [#3623](https://github.com/emberjs/data/pull/3623) [BUGFIX release] Update ember-inflector to 1.9.0 (This commit was included in 1.13.8 but 1.13.8 was built with an old ember-inflector dependency by mistake.)

### Release 1.13.8 (August 5, 2015)

- [#3608](https://github.com/emberjs/data/pull/3608) [BUGFIX release] Validate JSON API docs returned by normalizeResponse
- [#3591](https://github.com/emberjs/data/pull/3591) `DS.Store#findQuery` overrides `DS.Store#query` docs
- [#3263](https://github.com/emberjs/data/pull/3263) Add `RecordArray#filterBy` which contains a live, filtered subset
- [#3593](https://github.com/emberjs/data/pull/3593) Update bin/changelog with customizations for Ember Data
- [#3601](https://github.com/emberjs/data/pull/3601) [DOC release] Fix missing docs due to /* instead of /**
- [#3610](https://github.com/emberjs/data/pull/3610) [BUGFIX release] Add missing urlForFindQueryRecord to BuildUrlMixin
- [#3615](https://github.com/emberjs/data/pull/3615) [DOC release] Update misleading example for Adapter.queryRecord()
- [#3619](https://github.com/emberjs/data/pull/3619) [DOC release] fix urlForFindRecord documentation
- [#3622](https://github.com/emberjs/data/pull/3622) Fix failing tests from merging PR #3263
- [#3623](https://github.com/emberjs/data/pull/3623) [BUGFIX release] Update ember-inflector to 1.9.0
- [#3624](https://github.com/emberjs/data/pull/3624) Implement filterBy on DS.ManyArray

### Release 1.13.7 (July 27, 2015)

- [#3554](https://github.com/emberjs/data/pull/3554) Add queryRecord method to the RESTAdapter
- [#3553](https://github.com/emberjs/data/pull/3553) Reversed args in Ember.Observer
- [#3531](https://github.com/emberjs/data/pull/3531) Adds some documentation for JSONApiSerializer
- [#3555](https://github.com/emberjs/data/pull/3555) [BUGFIX release] Transition to loaded.saved state after rollback
- [#3558](https://github.com/emberjs/data/pull/3558) [BUGFIX release] Follow JSON-API error object spec
- [#3560](https://github.com/emberjs/data/pull/3560) Deprecate error property
- [#3562](https://github.com/emberjs/data/pull/3562) remove babel warnings around parameters
- [#3563](https://github.com/emberjs/data/pull/3563) [DOC release] Adding documentation for SnapshotRecordArray
- [#3571](https://github.com/emberjs/data/pull/3571) [DOC release] Update README examples
- [#3575](https://github.com/emberjs/data/pull/3575) [BUGFIX release] Update `Ember.deprecate` and `Ember.warn` calls to include required information
- [#3582](https://github.com/emberjs/data/pull/3582) [BUGFIX release] Fix unconsistent behavior in Model.changedAttributes
- [#3590](https://github.com/emberjs/data/pull/3590) Update bin/changelog to deal with cherry-picked commits

### Release 1.13.6 (July 21, 2015)

- [#3564](https://github.com/emberjs/data/pull/3564) [BUGFIX release] backport ActiveModelAdapter changes [@fivetanley](https://github.com/fivetanley)
- [#3569](https://github.com/emberjs/data/pull/3569) [BUGFIX release] squash normalizePayload deprecations [@fivetanley](https://github.com/fivetanley)
- [BUGFIX release] fix some code for IE8 compat in ActiveModelSerializer
- [#3544](https://github.com/emberjs/data/pull/3544)[BUGFIX release] Add error message in _pushInternalMessage when unknown type [@serabe](https://github.com/Serabe)
- [#3550](https://github.com/emberjs/data/pull/3550)[BUGFIX release] JSONSerializer pass through `payload.included`[@tstirrat](https://github.com/tstirrat)
- [#3534](https://github.com/emberjs/data/pull/3534)[DOC release] Rename `error` to `adapterError` [@tchak](https://github.com/tchak)
- [#3550](https://github.com/emberjs/data/pull/3550)[BUGFIX release] JSONSerializer pass through `payload.included` [@tstirrat](https://github.com/tstirrat)

### Release 1.13.5 (July 8, 2015)

- [#3437](https://github.com/emberjs/data/pull/3437) Deprecate normalizePayload and normalizeHash [@wecc](https://github.com/wecc)
- [#3478](https://github.com/emberjs/data/pull/3478) Fix Ember Data build with fresh install [@sly7-7](https://github.com/sly7-7)
- [#3475](https://github.com/emberjs/data/pull/3475) [BUGFIX release] Remove deprecation warning for dev, keep IE 8 compat [@sly7-7](https://github.com/sly7-7)
- [#3452](https://github.com/emberjs/data/pull/3452) [BUGFIX release] handle case where linked relationship data is null [@pangratz](https://github.com/pangratz)
- [#3458](https://github.com/emberjs/data/pull/3458) [DOC] createRecord relationships close #3421 [@givanse](https://github.com/givanse)
- [#3460](https://github.com/emberjs/data/pull/3460) [BUGFIX release] Do not register the service store when it has already been registered [@loadimpact](https://github.com/loadimpact)
- [#3462](https://github.com/emberjs/data/pull/3462) Fix documentation typos in Adapter [@sutherland](https://github.com/sutherland)
- [#3473](https://github.com/emberjs/data/pull/3473) [DOC] Fill @property of DS.Model.modelName [@XrXr](https://github.com/XrXr)
- [#3479](https://github.com/emberjs/data/pull/3479) [DOC release] Fix typo in JSONSerializer.extractAttributes docs [@pdud](https://github.com/pdud)
- [#3482](https://github.com/emberjs/data/pull/3482) [BUGFIX release] Update the version of ember-new-computed to fix an E… [@bmac](https://github.com/bmac)
- [#3481](https://github.com/emberjs/data/pull/3481) update errors.js docs to mirror new json api error specs [@philipp-spiess](https://github.com/philipp-spiess)
- [#3497](https://github.com/emberjs/data/pull/3497) Use `detail` instead of `details` for JSON API error objects [@sebastianseilund](https://github.com/sebastianseilund)
- [#3503](https://github.com/emberjs/data/pull/3503) [DOC release] Fix documentation for DS.InternalModel#_changedKeys() [@hibariya](https://github.com/hibariya)
- [#3505](https://github.com/emberjs/data/pull/3505) [BUGFIX release] Do not assume the serializer is an Ember object. [@bmac](https://github.com/bmac)
- [#3511](https://github.com/emberjs/data/pull/3511) Assert serializers are using the same API [@wecc](https://github.com/wecc)
- [#3468](https://github.com/emberjs/data/pull/3468) [BUGFIX release] shouldReloadRecord and shouldBackgroundReloadRecord … [@bmac](https://github.com/bmac)
- [#3513](https://github.com/emberjs/data/pull/3513) [BUGFIX release] Always look up the serializer using store.serializerFor [@bmac](https://github.com/bmac)
- [#3477](https://github.com/emberjs/data/pull/3477) Add modelClass argument to JSONSerializer.extractId [@pdud](https://github.com/pdud)


### Release 1.13.4 (June 22, 2015)

- [#3398](https://github.com/emberjs/data/pull/3398) [REGRESSION release] Make meta available with new Serializer API [@wecc](https://github.com/wecc)
- [#3400](https://github.com/emberjs/data/pull/3400) [BUGFIX release] Correctly serialize type for hasMany relationships [@wecc](https://github.com/wecc)
- [#3408](https://github.com/emberjs/data/pull/3408) Fix Typos in Documentation for DS.Adapter [@heathharrelson](https://github.com/heathharrelson)
- [#3409](https://github.com/emberjs/data/pull/3409) [BUGFIX release] JSONAPISerializer missing pushPayload [@wecc](https://github.com/wecc)
- [#3410](https://github.com/emberjs/data/pull/3410) Fix minor typo in deprecation warning [@Dhaulagiri](https://github.com/Dhaulagiri)
- [#3413](https://github.com/emberjs/data/pull/3413) [BUGFIX release] Sideloaded records are not pushed when saving [@wecc](https://github.com/wecc)
- [#3397](https://github.com/emberjs/data/pull/3397) [BUGFIX release] Use typeOf instead of isArray in `_normalizeSerializerPayload` [@wecc](https://github.com/wecc)
- [#3396](https://github.com/emberjs/data/pull/3396) make sure deprecate error doesnt get swallowed when using store.push(type, data) [@jcope2013](https://github.com/jcope2013)
- [#3411](https://github.com/emberjs/data/pull/3411) Remove some usages of enumerable utils that made it into the release branch [@bmac](https://github.com/bmac)

### Release 1.13.3 (June 19, 2015)

- [#3375](https://github.com/emberjs/data/pull/3375) JSONAPISerializer only supports the new Serializer API [@wecc](https://github.com/wecc)
- [#3379](https://github.com/emberjs/data/pull/3379) store.push should support arrays in the JSONAPI data property [@bmac](https://github.com/bmac)
- [#3384](https://github.com/emberjs/data/pull/3384) Assert if the RESTSerializers when using the new format calls another [@bmac](https://github.com/bmac)
- [#3388](https://github.com/emberjs/data/pull/3388) Have looked up ActiveModelSerializer opt into the new Serializer API [@wecc](https://github.com/wecc)

### Release 1.13.2 (June 18, 2015)

- [#3370](https://github.com/emberjs/data/pull/3370) Allow overwrite for deprecated adapters [@tricknotes](https://github.com/tricknotes)

### Release 1.13.1 (June 17, 2015)

- [#3369](https://github.com/emberjs/data/pull/3369) Fix deprecation message for store.shouldReloadAll [@pangratz](https://github.com/pangratz)
- [#3374](https://github.com/emberjs/data/pull/3374) fix jquery error handler [@tchak](https://github.com/tchak)

### Release 1.13 (June 16, 2015)

- [#3143](https://github.com/emberjs/data/pull/3143) Refactor the Serializer API [@emberjs](https://github.com/emberjs)
- [#2904](https://github.com/emberjs/data/pull/2904) Implement basic JSON-API adapter [@wecc](https://github.com/wecc)
- [#2584](https://github.com/emberjs/data/pull/2584) Add queryOne method [@thaume](https://github.com/thaume)
- [#3310](https://github.com/emberjs/data/pull/3310) Allow the store to pass adapter options to the adapter [@bmac](https://github.com/bmac)
- [#3194](https://github.com/emberjs/data/pull/3194) Json api errors [@tchak](https://github.com/tchak)
- [#3235](https://github.com/emberjs/data/pull/3235) rename store.findQuery to store.query [@csantero](https://github.com/csantero)
- [#3232](https://github.com/emberjs/data/pull/3232) Add findByRecord and deprecate findById [@HeroicEric](https://github.com/HeroicEric)
- [#3167](https://github.com/emberjs/data/pull/3167) store.all() is not treated as a filteredRecordArray anymore [@pangratz](https://github.com/pangratz)
- [#3218](https://github.com/emberjs/data/pull/3218) Implement extractMeta for new Serializer API [@wecc](https://github.com/wecc)
- [#3226](https://github.com/emberjs/data/pull/3226) Warnings for incorrect options in belongsTo, resolves #3187 [@zoeesilcock](https://github.com/zoeesilcock)
- [#3234](https://github.com/emberjs/data/pull/3234) Make store.findAll(type) public [@HeroicEric](https://github.com/HeroicEric)
- [#3214](https://github.com/emberjs/data/pull/3214) serialize:true takes priority over the OneToMany check for relationships [@sly7-7](https://github.com/sly7-7)
- [#3216](https://github.com/emberjs/data/pull/3216) Record property changes [@bmac](https://github.com/bmac)
- [#3209](https://github.com/emberjs/data/pull/3209) Rename and deprecate finders (store.all -> store.peekAll and store.getById -> store.peekRecord) [@HeroicEric](https://github.com/HeroicEric)
- [#3221](https://github.com/emberjs/data/pull/3221) Metadata for hasmany [@emberjs](https://github.com/emberjs)
- [#3268](https://github.com/emberjs/data/pull/3268) Fix for passing json api objects into push [@emberjs](https://github.com/emberjs)
- [#3241](https://github.com/emberjs/data/pull/3241) Rename store.findByRecord to store.findRecord [@HeroicEric](https://github.com/HeroicEric)
- [#3253](https://github.com/emberjs/data/pull/3253) Treat empty strings in ids the same as null or undefined [@pangratz](https://github.com/pangratz)
- [#3262](https://github.com/emberjs/data/pull/3262) Pass _internalModel into a record when it is created [@bmac](https://github.com/bmac)
- [#3340](https://github.com/emberjs/data/pull/3340) Use 'findRecord' instead of 'find' in doc [@emberjs](https://github.com/emberjs)
- [#3289](https://github.com/emberjs/data/pull/3289) Fix deprecation warning in tests [@bmac](https://github.com/bmac)
- [#3270](https://github.com/emberjs/data/pull/3270) Pass store to inverseFor in removeEmbeddedForeignKey [@wecc](https://github.com/wecc)
- [#3279](https://github.com/emberjs/data/pull/3279) Deprecation if id is Model in deserializeRecordId [@joelalejandro](https://github.com/joelalejandro)
- [#3286](https://github.com/emberjs/data/pull/3286) Deprecate `store:application` and `store:main` in favor of `service:store` [@bmac](https://github.com/bmac)
- [#3311](https://github.com/emberjs/data/pull/3311) Set the currentState when a record is created, not only when the stat… [@bmac](https://github.com/bmac)
- [#3290](https://github.com/emberjs/data/pull/3290) Rename `all` to `peekAll` in a test to fix a deprecation warning. [@bmac](https://github.com/bmac)
- [#3306](https://github.com/emberjs/data/pull/3306) Rename adapter and serializer methods to match the new store methods [@bmac](https://github.com/bmac)
- [#3312](https://github.com/emberjs/data/pull/3312) Deprecate fetch and replace it with store.findRecord(type, id, { reload: true}) [@bmac](https://github.com/bmac)
- [#3292](https://github.com/emberjs/data/pull/3292) Allow for store.push(object) [@emberjs](https://github.com/emberjs)
- [#3305](https://github.com/emberjs/data/pull/3305) Rename Model.rollback() to model.rollbackAttributes() [@HeroicEric](https://github.com/HeroicEric)
- [#3316](https://github.com/emberjs/data/pull/3316) Support custom stores defined on the container as [@bmac](https://github.com/bmac)
- [#3351](https://github.com/emberjs/data/pull/3351) Deprecate isDirty in favor of Model#hasDirtyAttributes [@bmac](https://github.com/bmac)
- [#3329](https://github.com/emberjs/data/pull/3329) Refactor `Errors#errorsByAttributeName` to not use Ember.reduceComputed [@pangratz](https://github.com/pangratz)
- [#3323](https://github.com/emberjs/data/pull/3323) Allow ember-source 2.x [@tricknotes](https://github.com/tricknotes)
- [#3324](https://github.com/emberjs/data/pull/3324) Implement adapter reload hooks from RFC #61 [@bmac](https://github.com/bmac)
- [#3326](https://github.com/emberjs/data/pull/3326) Deprecate store.pushMany in favor of store.push [@mikehollis](https://github.com/mikehollis)
- [#3334](https://github.com/emberjs/data/pull/3334) deprecate ActiveModelAdapter being bundled with core [@emberjs](https://github.com/emberjs)
- [#3362](https://github.com/emberjs/data/pull/3362) Improve deprecation for not using the new Serializer API [@wecc](https://github.com/wecc)
- [#3350](https://github.com/emberjs/data/pull/3350) Deprecate store.push(type, data) [@bmac](https://github.com/bmac)
- [#3344](https://github.com/emberjs/data/pull/3344) Disable beta and canary tests so we can ship Ember Data 1.13 that sti… [@bmac](https://github.com/bmac)
- [#3349](https://github.com/emberjs/data/pull/3349) Register service:store in an initializer instead of an instanceInitia… [@bmac](https://github.com/bmac)
- [#3346](https://github.com/emberjs/data/pull/3346) Remove the JSONAPI serializer refactor feature flag [@bmac](https://github.com/bmac)
- [#3347](https://github.com/emberjs/data/pull/3347) Implement modelNameFromPayloadKey in JSONSerializer [@wecc](https://github.com/wecc)
- [#3361](https://github.com/emberjs/data/pull/3361) Use MapWithDefault forEach instead of Array#forEach [@bmac](https://github.com/bmac)
- [#3364](https://github.com/emberjs/data/pull/3364) deprecate store.filter [@emberjs](https://github.com/emberjs)
- [#3365](https://github.com/emberjs/data/pull/3365) Convert internal representation to JSONApi [@bmac](https://github.com/bmac)
- [#3366](https://github.com/emberjs/data/pull/3366) Log a deprecation warning if users do not specify `async` on a relationship [@bmac](https://github.com/bmac)

### Release 1.0.0-beta.19.2 (June 12, 2015)

- Fix a regression with Ember CLI users who have defined a custom
  store in `app/store.js` - https://github.com/emberjs/data/pull/3316
- Fix a regression where `currentState` was not defined on a record
  until the record a state change occured. https://github.com/emberjs/data/pull/3311

### Release 1.0.0-beta.19.1 (June 9, 2015)

- Fix a regression where a `DS.Model`'s `InternalModel` would not be set
  on init - @bmac https://github.com/emberjs/data/pull/3262
- Pass store to inverseFor in removeEmbeddedForeignKey #3270 - @wecc
  https://github.com/emberjs/data/pull/3270

### Release 1.0.0-beta.19 (June 5, 2015)

#### Breaking Changes

##### Store Service moved to an Instance Initializer

In order to fix deprecations warning induced by Ember 1.12, the store service
is now injected as an instanceInitializer. As a consequence, if you had initializers
depending on the store, you should move them to an instance initializer as well,
and mark it as after: 'ember-data'.

- Removed support for DS.FixtureAdapter. You can use it as an addon, or
  build it using [Ember Giftwrap](https://github.com/ef4/ember-giftwrap).
  https://github.com/emberjs/ember-data-fixture-adapter/tree/master
- Removed support for passing factories to store methods. An example
  would be `store.find(App.Post, '1')`. Use the string form instead:
  `post` instead of `App.Post`. You can also use this [Ember Watson
  command](https://github.com/abuiles/ember-watson#ember-watsonconvert-ember-data-model-lookups)
- [#3074](https://github.com/emberjs/data/pull/3074) remove passing factories to store methods [@fivetanley](https://github.com/fivetanley)
- [#3083](https://github.com/emberjs/data/pull/3083) A new record which is marked as invalid can be rollbacked [@pangratz](https://github.com/pangratz)
- [#3102](https://github.com/emberjs/data/pull/3102) Updated copyright year [@perlun](https://github.com/perlun)
- [#3091](https://github.com/emberjs/data/pull/3091) deprecate support for DS.FixtureAdapter [@emberjs](https://github.com/emberjs)
- [#3097](https://github.com/emberjs/data/pull/3097) fix bower publishing [@emberjs](https://github.com/emberjs)
- [#3094](https://github.com/emberjs/data/pull/3094) Lazily materialize DS.Models for app code, use InternalModel inside ED otherwise [@emberjs](https://github.com/emberjs)
- [#3119](https://github.com/emberjs/data/pull/3119) maxUrlLength -> maxURLLength [@sly7-7](https://github.com/sly7-7)
- [#3110](https://github.com/emberjs/data/pull/3110) Cleanup unused 'materialize' records in model [@tonywok](https://github.com/tonywok)
- [#3182](https://github.com/emberjs/data/pull/3182) initialize lives on the application instance not the Ember namespace [@bmac](https://github.com/bmac)
- [#3126](https://github.com/emberjs/data/pull/3126) Guard for embedded unknown hasMany relationship [@wecc](https://github.com/wecc)
- [#3133](https://github.com/emberjs/data/pull/3133) Create snapshots on save not on flush [@tchak](https://github.com/tchak)
- [#3136](https://github.com/emberjs/data/pull/3136) Lookup the store using store:application instead of store:main [@bmac](https://github.com/bmac)
- [#3139](https://github.com/emberjs/data/pull/3139) Extend adapter instead of reopening it [@BookingSync](https://github.com/BookingSync)
- [#3138](https://github.com/emberjs/data/pull/3138) Custom primaryKey for embedded polymorphic relations work [@pangratz](https://github.com/pangratz)
- [#3174](https://github.com/emberjs/data/pull/3174) Adjust code samples to ember-cli [@Turbo87](https://github.com/Turbo87)
- [#3148](https://github.com/emberjs/data/pull/3148) add Snapshot#serialize method [@yratanov/feature](https://github.com/yratanov/feature)
- [#3170](https://github.com/emberjs/data/pull/3170) Ensure snapshot.belongsTo() and hasMany() do not return deleted records [@ianstarz](https://github.com/ianstarz)
- [#3156](https://github.com/emberjs/data/pull/3156) Remove deprecated push record [@sly7-7](https://github.com/sly7-7)
- [#3169](https://github.com/emberjs/data/pull/3169) rename add/removeRecord to add/removeInternalModel in record array [@sly7-7](https://github.com/sly7-7)
- [#3183](https://github.com/emberjs/data/pull/3183) fix belongs-to when set with a resolved promise [@sly7-7](https://github.com/sly7-7)
- [#3195](https://github.com/emberjs/data/pull/3195) Update comment to make its intention clearer [@bmac](https://github.com/bmac)
- [#3191](https://github.com/emberjs/data/pull/3191) refactor store managed instances [@fivetanley](https://github.com/fivetanley)
- [#3203](https://github.com/emberjs/data/pull/3203) Use string model names in debug adapter [@teddyzeenny](https://github.com/teddyzeenny)
- [#3208](https://github.com/emberjs/data/pull/3208) DirtyState.invalid handle pushedData event [@bmac](https://github.com/bmac)
- [#3211](https://github.com/emberjs/data/pull/3211) lookup JSONSerializer instance through store instead of manual instan… [@emberjs](https://github.com/emberjs)

### Release 1.0.0-beta.18 (May 18, 2015)

- [#3066](https://github.com/emberjs/data/pull/3066) Doc typo: primaryTypeClasss -> primaryTypeClass [@lolmaus](https://github.com/lolmaus)
- [#3058](https://github.com/emberjs/data/pull/3058) Fix changelog script to point to emberjs/data [@tonywok](https://github.com/tonywok)
- [#3034](https://github.com/emberjs/data/pull/3034) **POTENTIALLY BREAKING CHANGE if you override typeForRoot currently** introduce modelNameFromPayloadKey and deprecate typeForRoot [@fivetanley](https://github.com/emberjs)
  - `RESTSerializer#typeForRoot` has been deprecated. You can use
  `RESTSerializeer#modelNameFromPayloadKey` instead.
  - Added `RESTSerializer#payloadKeyFromModelName`. This allows you to
  - `typeKey` on Snapshots and Model classes has been deprecated. Use
    `modelName` instead.
specify the outgoing root key for a JSON payload.
- [#3031](https://github.com/emberjs/data/pull/3031) Added pushedData hook to root.deleted.uncommitted state. [@aexmachina](https://github.com/aexmachina)
- [#3033](https://github.com/emberjs/data/pull/3033) dasherize ALL the things: use dasherized model names everywhere [@fivetanley](https://github.com/emberjs)
- [#3060](https://github.com/emberjs/data/pull/3060) Update changelog with correct-er links [@tonywok](https://github.com/tonywok)
- [#3065](https://github.com/emberjs/data/pull/3065) [DOC] update typo on #changedAttributes [@mateuspv](https://github.com/mateuspv)
- [#3068](https://github.com/emberjs/data/pull/3068) Fix incorrect documentation for RecordArray [@sberan](https://github.com/sberan)
- [#3073](https://github.com/emberjs/data/pull/3073) [DOCS] Added missing param to docs for generateIdForRecord [@joostdevries](https://github.com/joostdevries)
- [#3076](https://github.com/emberjs/data/pull/3076) Rely on active model serializer to handle error logic [@bdvholmes/bug](https://github.com/bdvholmes/bug)

### Release 1.0.0-beta.17 (May 10, 2015)

- [#2898](https://github.com/emberjs/data/pull/2898) Pass requestType to buildURL [@amiel](https://github.com/amiel)
- [#2790](https://github.com/emberjs/data/pull/2790) Embedded records mixin should use the correct serialization key when deserialize configuration is set, Fixes #2556 [@agrobbin](https://github.com/agrobbin)
- [#2933](https://github.com/emberjs/data/pull/2933) Extracts InvalidError into a separate file and makes it a subclass of Ember.Error [@twokul](https://github.com/twokul)
- [#2936](https://github.com/emberjs/data/pull/2936) Introduce relationship.hasData [@wecc](https://github.com/wecc)
- [#2940](https://github.com/emberjs/data/pull/2940) [DOC] Fix for DS.Store#findMany [@hibariya](https://github.com/hibariya)
- [#2939](https://github.com/emberjs/data/pull/2939) Snapshots unknown relationships [@wecc](https://github.com/wecc)
- [#2958](https://github.com/emberjs/data/pull/2958) adapter.serialize receives a snapshot [@rague](https://github.com/rague)
- [#2946](https://github.com/emberjs/data/pull/2946) Handle null/empty type paths in build url mixin [@vinilios](https://github.com/vinilios)
- [#2961](https://github.com/emberjs/data/pull/2961) Use new getter/setter for computed if available [@wecc](https://github.com/wecc)
- [#2956](https://github.com/emberjs/data/pull/2956) Clear meta data when unloading all records for a type. Fixes #2772 [@runspired](https://github.com/runspired)
- [#2953](https://github.com/emberjs/data/pull/2953) Do not assert reserved properties for static properties. [@bmac](https://github.com/bmac)
- [#2959](https://github.com/emberjs/data/pull/2959) Remove value from retrieveFromCurrentState CP [@wecc](https://github.com/wecc)
- [#2999](https://github.com/emberjs/data/pull/2999) Make unloadAll() unload all records, deprecate unloadAll(type) in favor ... [@svox1](https://github.com/svox1)
- [#2992](https://github.com/emberjs/data/pull/2992) Feature detect Ember.Registry rather than relying on version numbers [@emberjs](https://github.com/emberjs)
- [#2983](https://github.com/emberjs/data/pull/2983) Do not prepend a `/` if namespace is absolute. [@rwjblue](https://github.com/rwjblue)
- [#2966](https://github.com/emberjs/data/pull/2966) Break buildURL into multiple requestType methods [@thejameskyle](https://github.com/thejameskyle)
- [#2980](https://github.com/emberjs/data/pull/2980) [DOC] Use block params style {{#each}} [@HeroicEric](https://github.com/HeroicEric)
- [#2965](https://github.com/emberjs/data/pull/2965) Make version check for ember-data strict [@tricknotes](https://github.com/tricknotes)
- [#3035](https://github.com/emberjs/data/pull/3035) Add method argument to key serialization docs [@Dremora](https://github.com/Dremora)
- [#3004](https://github.com/emberjs/data/pull/3004) Fix serialization results in the documentation. [@nathanhammond](https://github.com/nathanhammond)
- [#3037](https://github.com/emberjs/data/pull/3037) Reset Model#isReloading to false when request fails [@pangratz](https://github.com/pangratz)
- [#3022](https://github.com/emberjs/data/pull/3022) Add missing urlForUpdateRecord to BuildURLMixin [@wecc](https://github.com/wecc)
- [#3021](https://github.com/emberjs/data/pull/3021) Remove unnecessary URL check in findHasMany [@wecc](https://github.com/wecc)
- [#3036](https://github.com/emberjs/data/pull/3036) Remove logic for camelCase-ing error keys in ActiveModelAdapter [@pangratz](https://github.com/pangratz)
- [#3030](https://github.com/emberjs/data/pull/3030) ActiveModelAdapter camelizes keys for errors on 422 [@bdvholmes](https://github.com/bdvholmes)
- [#3026](https://github.com/emberjs/data/pull/3026) [BUGFIX] AMS polymorphic type for namespaced models [@artych](https://github.com/artych)
- [#3032](https://github.com/emberjs/data/pull/3032) use typeKey and typeClass instead of using `type` inconsistently [@emberjs](https://github.com/emberjs)
- [#3040](https://github.com/emberjs/data/pull/3040) JSONSerializer#extractErrors respects custom key mappings [@pangratz](https://github.com/pangratz)
- [#3043](https://github.com/emberjs/data/pull/3043) Fix bug where record rejected via `find` stayed in loading state [@pangratz](https://github.com/pangratz)
- [#3046](https://github.com/emberjs/data/pull/3046) Documented the Model's `rolledBack` event [@lolmaus](https://github.com/lolmaus)
- [#3054](https://github.com/emberjs/data/pull/3054) Fix for deleting from ManyArray [@wagenet](https://github.com/wagenet)
- [#3055](https://github.com/emberjs/data/pull/3055) Merge `attrs` from superclasses into their subclasses. [@omghax](https://github.com/omghax)
- [#3056](https://github.com/emberjs/data/pull/3056) Add more assertions for merged attributes from superclass [@pangratz](https://github.com/pangratz)

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
* prefer new EmptyObject() for typeMap backing stores. Cache misses are faster, and won’t collide with prototype pollution
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
