/**
  @module @ember-data/store
 */
import { getOwner } from '@ember/application';
import { A } from '@ember/array';
import { assert, deprecate, inspect, warn } from '@ember/debug';
import { computed, defineProperty, get, set } from '@ember/object';
import { _backburner as emberBackburner } from '@ember/runloop';
import type { Backburner } from '@ember/runloop/-private/backburner';
import Service from '@ember/service';
import { registerWaiter, unregisterWaiter } from '@ember/test';
import { isNone, isPresent, typeOf } from '@ember/utils';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

import require from 'require';
import { all, default as RSVP, defer, Promise, resolve } from 'rsvp';

import {
  CUSTOM_MODEL_CLASS,
  RECORD_DATA_ERRORS,
  RECORD_DATA_STATE,
  REQUEST_SERVICE,
} from '@ember-data/canary-features';
import {
  HAS_ADAPTER_PACKAGE,
  HAS_EMBER_DATA_PACKAGE,
  HAS_RECORD_DATA_PACKAGE,
  HAS_SERIALIZER_PACKAGE,
} from '@ember-data/private-build-infra';
import {
  DEPRECATE_DEFAULT_ADAPTER,
  DEPRECATE_DEFAULT_SERIALIZER,
  DEPRECATE_LEGACY_TEST_REGISTRATIONS,
} from '@ember-data/private-build-infra/deprecations';
import type {
  BelongsToRelationship,
  ManyRelationship,
  RecordData as RecordDataClass,
} from '@ember-data/record-data/-private';
import type { RelationshipState } from '@ember-data/record-data/-private/graph/-state';

import type { IdentifierCache } from '../identifiers/cache';
import { identifierCacheFor } from '../identifiers/cache';
import type { DSModel } from '../ts-interfaces/ds-model';
import type {
  CollectionResourceDocument,
  EmptyResourceDocument,
  ExistingResourceObject,
  JsonApiDocument,
  ResourceIdentifierObject,
  SingleResourceDocument,
} from '../ts-interfaces/ember-data-json-api';
import type {
  RecordIdentifier,
  StableExistingRecordIdentifier,
  StableRecordIdentifier,
} from '../ts-interfaces/identifier';
import type { PromiseProxy } from '../ts-interfaces/promise-proxies';
import type { RecordData } from '../ts-interfaces/record-data';
import type { JsonApiRelationship } from '../ts-interfaces/record-data-json-api';
import type { RecordDataRecordWrapper } from '../ts-interfaces/record-data-record-wrapper';
import type { AttributesSchema } from '../ts-interfaces/record-data-schemas';
import type { RecordInstance } from '../ts-interfaces/record-instance';
import type { SchemaDefinitionService } from '../ts-interfaces/schema-definition-service';
import type { FindOptions } from '../ts-interfaces/store';
import type { Dict } from '../ts-interfaces/utils';
import constructResource from '../utils/construct-resource';
import promiseRecord from '../utils/promise-record';
import edBackburner from './backburner';
import coerceId, { ensureStringId } from './coerce-id';
import { errorsArrayToHash } from './errors-utils';
import FetchManager, { SaveOp } from './fetch-manager';
import type InternalModel from './model/internal-model';
import {
  assertRecordsPassedToHasMany,
  extractRecordDataFromRecord,
  extractRecordDatasFromRecords,
} from './model/internal-model';
import type ShimModelClass from './model/shim-model-class';
import { getShimClass } from './model/shim-model-class';
import normalizeModelName from './normalize-model-name';
import { promiseArray, promiseObject } from './promise-proxies';
import RecordArrayManager from './record-array-manager';
import { setRecordDataFor } from './record-data-for';
import NotificationManager from './record-notification-manager';
import type { BelongsToReference, HasManyReference } from './references';
import { RecordReference } from './references';
import type RequestCache from './request-cache';
import type { default as Snapshot, PrivateSnapshot } from './snapshot';
import { _bind, _guard, _objectIsAlive, guardDestroyedStore } from './store/common';
import { _find, _findAll, _findBelongsTo, _findHasMany, _findMany, _query, _queryRecord } from './store/finders';
import {
  internalModelFactoryFor,
  peekRecordIdentifier,
  recordIdentifierFor,
  setRecordIdentifier,
} from './store/internal-model-factory';
import RecordDataStoreWrapper from './store/record-data-store-wrapper';
import { normalizeResponseHelper } from './store/serializer-response';

type RecordDataConstruct = typeof RecordDataClass;
let _RecordData: RecordDataConstruct | undefined;

const { ENV } = Ember;
type AsyncTrackingToken = Readonly<{ label: string; trace: Error | string }>;
type PromiseArray<T> = Promise<T[]>;
type PendingFetchItem = {
  internalModel: InternalModel;
  resolver: RSVP.Deferred<InternalModel>;
  options: any;
  trace?: Error;
};
type PendingSaveItem = {
  snapshot: Snapshot;
  resolver: RSVP.Deferred<void>;
};

const RECORD_REFERENCES = new WeakMap<StableRecordIdentifier, RecordReference>();

function freeze<T>(obj: T): T {
  if (typeof Object.freeze === 'function') {
    return Object.freeze(obj);
  }

  return obj;
}

function deprecateTestRegistration(factoryType: 'adapter', factoryName: '-json-api'): void;
function deprecateTestRegistration(factoryType: 'serializer', factoryName: '-json-api' | '-rest' | '-default'): void;
function deprecateTestRegistration(
  factoryType: 'serializer' | 'adapter',
  factoryName: '-json-api' | '-rest' | '-default'
): void {
  deprecate(
    `You looked up the ${factoryType} "${factoryName}" but it was not found. Likely this means you are using a legacy ember-qunit moduleFor helper. Add "needs: ['${factoryType}:${factoryName}']", "integration: true", or refactor to modern syntax to resolve this deprecation.`,
    false,
    {
      id: 'ember-data:-legacy-test-registrations',
      until: '3.17',
      for: '@ember-data/store',
      since: {
        available: '3.15',
        enabled: '3.15',
      },
    }
  );
}
/**
  The store contains all of the data for records loaded from the server.
  It is also responsible for creating instances of `Model` that wrap
  the individual data for a record, so that they can be bound to in your
  Handlebars templates.

  Define your application's store like this:

  ```app/services/store.js
  import Store from '@ember-data/store';

  export default class MyStore extends Store {}
  ```

  Most Ember.js applications will only have a single `Store` that is
  automatically created by their `Ember.Application`.

  You can retrieve models from the store in several ways. To retrieve a record
  for a specific id, use `Store`'s `findRecord()` method:

  ```javascript
  store.findRecord('person', 123).then(function (person) {
  });
  ```

  By default, the store will talk to your backend using a standard
  REST mechanism. You can customize how the store talks to your
  backend by specifying a custom adapter:

  ```app/adapters/application.js
  import Adapter from '@ember-data/adapter';

  export default class ApplicationAdapter extends Adapter {
  }
  ```

  You can learn more about writing a custom adapter by reading the `Adapter`
  documentation.

  ### Store createRecord() vs. push() vs. pushPayload()

  The store provides multiple ways to create new record objects. They have
  some subtle differences in their use which are detailed below:

  [createRecord](../methods/createRecord?anchor=createRecord) is used for creating new
  records on the client side. This will return a new record in the
  `created.uncommitted` state. In order to persist this record to the
  backend, you will need to call `record.save()`.

  [push](../methods/push?anchor=push) is used to notify Ember Data's store of new or
  updated records that exist in the backend. This will return a record
  in the `loaded.saved` state. The primary use-case for `store#push` is
  to notify Ember Data about record updates (full or partial) that happen
  outside of the normal adapter methods (for example
  [SSE](http://dev.w3.org/html5/eventsource/) or [Web
  Sockets](http://www.w3.org/TR/2009/WD-websockets-20091222/)).

  [pushPayload](../methods/pushPayload?anchor=pushPayload) is a convenience wrapper for
  `store#push` that will deserialize payloads if the
  Serializer implements a `pushPayload` method.

  Note: When creating a new record using any of the above methods
  Ember Data will update `RecordArray`s such as those returned by
  `store#peekAll()` or `store#findAll()`. This means any
  data bindings or computed properties that depend on the RecordArray
  will automatically be synced to include the new or updated record
  values.

  @main @ember-data/store
  @class Store
  @public
  @extends Ember.Service
*/
interface CoreStore {
  adapter: string;
}

abstract class CoreStore extends Service {
  /**
   * EmberData specific backburner instance
   * @property _backburner
   * @private
   */
  public _backburner: Backburner = edBackburner;
  public recordArrayManager: RecordArrayManager = new RecordArrayManager({ store: this });

  declare _notificationManager: NotificationManager;
  private _adapterCache = Object.create(null);
  private _serializerCache = Object.create(null);
  public _storeWrapper = new RecordDataStoreWrapper(this);

  /*
    Ember Data uses several specialized micro-queues for organizing
    and coalescing similar async work.

    These queues are currently controlled by a flush scheduled into
    ember-data's custom backburner instance.
    */
  // used for coalescing record save requests
  private _pendingSave: PendingSaveItem[] = [];
  // used for coalescing internal model updates
  private _updatedInternalModels: InternalModel[] = [];

  // used to keep track of all the find requests that need to be coalesced
  private _pendingFetch = new Map<string, PendingFetchItem[]>();

  declare _fetchManager: FetchManager;
  declare _schemaDefinitionService: SchemaDefinitionService;

  // DEBUG-only properties
  declare _trackedAsyncRequests: AsyncTrackingToken[];
  shouldAssertMethodCallsOnDestroyedStore: boolean = true;
  shouldTrackAsyncRequests: boolean = false;
  generateStackTracesForTrackedRequests: boolean = false;
  declare _trackAsyncRequestStart: (str: string) => void;
  declare _trackAsyncRequestEnd: (token: AsyncTrackingToken) => void;
  declare __asyncWaiter: () => boolean;

  /**
    The default adapter to use to communicate to a backend server or
    other persistence layer. This will be overridden by an application
    adapter if present.

    If you want to specify `app/adapters/custom.js` as a string, do:

    ```js
    import Store from '@ember-data/store';

    export default Store.extend({
      constructor() {
        super(...arguments);
        this.adapter = 'custom';
      }
    }
    ```

    @property adapter
    @public
    @default '-json-api'
    @type {String}
  */

  /**
  This property returns the adapter, after resolving a possible
  string key.

  If the supplied `adapter` was a class, or a String property
  path resolved to a class, this property will instantiate the
  class.

  This property is cacheable, so the same instance of a specified
  adapter class should be used for the lifetime of the store.

  @property defaultAdapter
  @private
  @return Adapter
*/

  /**
    @method init
    @private
  */
  constructor() {
    super(...arguments);

    if (REQUEST_SERVICE) {
      this._fetchManager = new FetchManager(this);
    }
    if (CUSTOM_MODEL_CLASS) {
      this._notificationManager = new NotificationManager(this);
      this.__recordDataFor = this.__recordDataFor.bind(this);
    }

    if (DEBUG) {
      if (HAS_EMBER_DATA_PACKAGE && HAS_SERIALIZER_PACKAGE) {
        // support for legacy moduleFor style unit tests
        // that did not include transforms in "needs"
        // or which were not set to integration:true
        // that were relying on ember-test-helpers
        // doing an auto-registration of the transform
        // or us doing one
        const Mapping = {
          date: 'DateTransform',
          boolean: 'BooleanTransform',
          number: 'NumberTransform',
          string: 'StringTransform',
        };
        type MapKeys = keyof typeof Mapping;
        const keys = Object.keys(Mapping) as MapKeys[];
        let shouldWarn = false;

        let owner = getOwner(this);
        keys.forEach((attributeType) => {
          const transformFactory = owner.factoryFor(`transform:${attributeType}`);

          if (!transformFactory) {
            // we don't deprecate this because the moduleFor style tests with the closed
            // resolver will be deprecated on their own. When that deprecation completes
            // we can drop this.
            const Transform = require(`@ember-data/serializer/-private`)[Mapping[attributeType]];
            owner.register(`transform:${attributeType}`, Transform);
            shouldWarn = true;
          }
        });

        if (shouldWarn) {
          deprecate(
            `You are relying on the automatic registration of the transforms "date", "number", "boolean", and "string". Likely this means you are using a legacy ember-qunit moduleFor helper. Add "needs: ['transform:date', 'transform:boolean', 'transform:number', 'transform:string']", "integration: true", or refactor to modern syntax to resolve this deprecation.`,
            false,
            {
              id: 'ember-data:-legacy-test-registrations',
              until: '3.17',
              for: '@ember-data/store',
              since: {
                available: '3.15',
                enabled: '3.15',
              },
            }
          );
        }
      }

      this.shouldAssertMethodCallsOnDestroyedStore = this.shouldAssertMethodCallsOnDestroyedStore || false;
      if (this.shouldTrackAsyncRequests === undefined) {
        this.shouldTrackAsyncRequests = false;
      }
      if (this.generateStackTracesForTrackedRequests === undefined) {
        this.generateStackTracesForTrackedRequests = false;
      }

      this._trackedAsyncRequests = [];
      this._trackAsyncRequestStart = (label) => {
        let trace =
          'set `store.generateStackTracesForTrackedRequests = true;` to get a detailed trace for where this request originated';

        if (this.generateStackTracesForTrackedRequests) {
          try {
            throw new Error(`EmberData TrackedRequest: ${label}`);
          } catch (e) {
            trace = e;
          }
        }

        let token = freeze({
          label,
          trace,
        });

        this._trackedAsyncRequests.push(token);
        return token;
      };
      this._trackAsyncRequestEnd = (token) => {
        let index = this._trackedAsyncRequests.indexOf(token);

        if (index === -1) {
          throw new Error(
            `Attempted to end tracking for the following request but it was not being tracked:\n${token}`
          );
        }

        this._trackedAsyncRequests.splice(index, 1);
      };

      this.__asyncWaiter = () => {
        let shouldTrack = this.shouldTrackAsyncRequests;
        let tracked = this._trackedAsyncRequests;
        let isSettled = tracked.length === 0;

        return shouldTrack !== true || isSettled;
      };

      registerWaiter(this.__asyncWaiter);
    }
  }

  getRequestStateService(): RequestCache {
    if (REQUEST_SERVICE) {
      return this._fetchManager.requestCache;
    }
    assert('RequestService is not available unless the feature flag is on and running on a canary build', false);
  }

  /**
   * Provides access to the IdentifierCache instance
   * for this store.
   *
   * The IdentifierCache can be used to generate or
   * retrieve a stable unique identifier for any resource.
   *
   * @property {IdentifierCache} identifierCache
   * @public
   */
  get identifierCache(): IdentifierCache {
    return identifierCacheFor(this);
  }

  _instantiateRecord(
    internalModel: InternalModel,
    modelName: string,
    recordData: RecordData,
    identifier: StableRecordIdentifier,
    properties?: { [key: string]: any }
  ) {
    if (CUSTOM_MODEL_CLASS) {
      // assert here
      if (properties !== undefined) {
        assert(
          `You passed '${properties}' as properties for record creation instead of an object.`,
          typeof properties === 'object' && properties !== null
        );

        if ('id' in properties) {
          internalModel.setId(properties.id);
        }

        // convert relationship Records to RecordDatas before passing to RecordData
        let defs = this._relationshipsDefinitionFor(modelName);

        if (defs !== null) {
          let keys = Object.keys(properties);
          let relationshipValue;

          for (let i = 0; i < keys.length; i++) {
            let prop = keys[i];
            let def = defs[prop];

            if (def !== undefined) {
              if (def.kind === 'hasMany') {
                if (DEBUG) {
                  assertRecordsPassedToHasMany(properties[prop]);
                }
                relationshipValue = extractRecordDatasFromRecords(properties[prop]);
              } else {
                relationshipValue = extractRecordDataFromRecord(properties[prop]);
              }

              properties[prop] = relationshipValue;
            }
          }
        }
      }

      // TODO guard against initRecordOptions no being there
      let createOptions = recordData._initRecordCreateOptions(properties);
      //TODO Igor pass a wrapper instead of RD
      let record = this.instantiateRecord(identifier, createOptions, this.__recordDataFor, this._notificationManager);
      setRecordIdentifier(record, identifier);
      //recordToInternalModelMap.set(record, internalModel);
      return record;
    }

    assert('should not be here, custom model class ff error', false);
  }

  abstract instantiateRecord(
    identifier: StableRecordIdentifier,
    createRecordArgs: { [key: string]: unknown }, // args passed in to store.createRecord() and processed by recordData to be set on creation
    recordDataFor: (identifier: RecordIdentifier) => RecordDataRecordWrapper,
    notificationManager: NotificationManager
  ): RecordInstance;

  abstract teardownRecord(record: RecordInstance): void;

  _internalDeleteRecord(internalModel: InternalModel) {
    internalModel.deleteRecord();
  }

  // FeatureFlagged in the DSModelStore claas
  _attributesDefinitionFor(modelName: string, identifier?: StableRecordIdentifier): AttributesSchema {
    if (identifier) {
      return this.getSchemaDefinitionService().attributesDefinitionFor(identifier);
    } else {
      return this.getSchemaDefinitionService().attributesDefinitionFor(modelName);
    }
  }

  _relationshipsDefinitionFor(modelName: string, identifier?: StableRecordIdentifier) {
    if (identifier) {
      return this.getSchemaDefinitionService().relationshipsDefinitionFor(identifier);
    } else {
      return this.getSchemaDefinitionService().relationshipsDefinitionFor(modelName);
    }
  }

  registerSchemaDefinitionService(schema: SchemaDefinitionService) {
    this._schemaDefinitionService = schema;
  }

  getSchemaDefinitionService(): SchemaDefinitionService {
    if (CUSTOM_MODEL_CLASS) {
      return this._schemaDefinitionService;
    }
    assert('need to enable CUSTOM_MODEL_CLASS feature flag in order to access SchemaDefinitionService');
  }

  // TODO Double check this return value is correct
  _relationshipMetaFor(modelName: string, id: string | null, key: string) {
    return this._relationshipsDefinitionFor(modelName)[key];
  }

  /**
    Returns the schema for a particular `modelName`.

    When used with Model from @ember-data/model the return is the model class,
    but this is not guaranteed.

    The class of a model might be useful if you want to get a list of all the
    relationship names of the model, see
    [`relationshipNames`](/ember-data/release/classes/Model?anchor=relationshipNames)
    for example.

    @method modelFor
    @public
    @param {String} modelName
    @return {subclass of Model | ShimModelClass}
    */
  modelFor(modelName: string): ShimModelClass {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, 'modelFor');
    }

    return getShimClass(this, modelName);
  }

  // Feature Flagged in DSModelStore
  /**
    Returns whether a ModelClass exists for a given modelName
    This exists for legacy support for the RESTSerializer,
    which due to how it must guess whether a key is a model
    must query for whether a match exists.

    We should investigate an RFC to make this public or removing
    this requirement.

    @method _hasModelFor
    @private
  */
  _hasModelFor(modelName: string): boolean {
    assert(`You need to pass a model name to the store's hasModelFor method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    return this.getSchemaDefinitionService().doesTypeExist(modelName);
  }

  // .....................
  // . CREATE NEW RECORD .
  // .....................

  /**
    Create a new record in the current store. The properties passed
    to this method are set on the newly created record.

    To create a new instance of a `Post`:

    ```js
    store.createRecord('post', {
      title: 'Ember is awesome!'
    });
    ```

    To create a new instance of a `Post` that has a relationship with a `User` record:

    ```js
    let user = this.store.peekRecord('user', 1);
    store.createRecord('post', {
      title: 'Ember is awesome!',
      user: user
    });
    ```

    @method createRecord
    @public
    @param {String} modelName
    @param {Object} inputProperties a hash of properties to set on the
      newly created record.
    @return {Model} record
  */
  createRecord(modelName, inputProperties) {
    if (DEBUG) {
      assertDestroyingStore(this, 'createRecord');
    }
    assert(`You need to pass a model name to the store's createRecord method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    // This is wrapped in a `run.join` so that in test environments users do not need to manually wrap
    //   calls to `createRecord`. The run loop usage here is because we batch the joining and updating
    //   of record-arrays via ember's run loop, not our own.
    //
    //   to remove this, we would need to move to a new `async` API.
    return emberBackburner.join(() => {
      return this._backburner.join(() => {
        let normalizedModelName = normalizeModelName(modelName);
        let properties = { ...inputProperties };

        // If the passed properties do not include a primary key,
        // give the adapter an opportunity to generate one. Typically,
        // client-side ID generators will use something like uuid.js
        // to avoid conflicts.

        if (isNone(properties.id)) {
          properties.id = this._generateId(normalizedModelName, properties);
        }

        // Coerce ID to a string
        properties.id = coerceId(properties.id);

        const factory = internalModelFactoryFor(this);
        const internalModel = factory.build({ type: normalizedModelName, id: properties.id });

        internalModel.send('loadedData');
        // TODO this exists just to proxy `isNew` to RecordData which is weird
        internalModel.didCreateRecord();

        return internalModel.getRecord(properties);
      });
    });
  }

  /**
    If possible, this method asks the adapter to generate an ID for
    a newly created record.

    @method _generateId
    @private
    @param {String} modelName
    @param {Object} properties from the new record
    @return {String} if the adapter can generate one, an ID
  */
  _generateId(modelName, properties) {
    let adapter = this.adapterFor(modelName);

    if (adapter && adapter.generateIdForRecord) {
      return adapter.generateIdForRecord(this, modelName, properties);
    }

    return null;
  }

  // .................
  // . DELETE RECORD .
  // .................

  /**
    For symmetry, a record can be deleted via the store.

    Example

    ```javascript
    let post = store.createRecord('post', {
      title: 'Ember is awesome!'
    });

    store.deleteRecord(post);
    ```

    @method deleteRecord
    @public
    @param {Model} record
  */
  deleteRecord(record) {
    if (DEBUG) {
      assertDestroyingStore(this, 'deleteRecord');
    }
    this._backburner.join(() => {
      if (CUSTOM_MODEL_CLASS) {
        let identifier = peekRecordIdentifier(record);
        if (identifier) {
          let internalModel = internalModelFactoryFor(this).peek(identifier);
          if (internalModel) {
            internalModel.deleteRecord();
          }
        } else {
          deprecate(
            `You passed a non ember-data managed record ${record} to store.deleteRecord. Ember Data store is not meant to manage non store records. This is not supported and will be removed`,
            false,
            {
              id: 'ember-data:delete-record-non-store',
              until: '4.0',
              for: '@ember-data/store',
              since: {
                available: '3.28',
                enabled: '3.28',
              },
            }
          );
          record.deleteRecord();
        }
      } else {
        record.deleteRecord();
      }
    });
  }

  /**
    For symmetry, a record can be unloaded via the store.
    This will cause the record to be destroyed and freed up for garbage collection.

    Example

    ```javascript
    store.findRecord('post', 1).then(function(post) {
      store.unloadRecord(post);
    });
    ```

    @method unloadRecord
    @public
    @param {Model} record
  */
  unloadRecord(record) {
    if (DEBUG) {
      assertDestroyingStore(this, 'unloadRecord');
    }
    if (CUSTOM_MODEL_CLASS) {
      let identifier = peekRecordIdentifier(record);
      if (identifier) {
        let internalModel = internalModelFactoryFor(this).peek(identifier);
        if (internalModel) {
          internalModel.unloadRecord();
        }
      } else {
        deprecate(
          `You passed a non ember-data managed record ${record} to store.unloadRecord. Ember Data store is not meant to manage non store records. This is not supported and will be removed`,
          false,
          {
            id: 'ember-data:unload-record-non-store',
            until: '4.0',
            for: '@ember-data/store',
            since: {
              available: '3.28',
              enabled: '3.28',
            },
          }
        );
        record.unloadRecord();
      }
    } else {
      record.unloadRecord();
    }
  }

  // ................
  // . FIND RECORDS .
  // ................

  /**
    @method find
    @param {String} modelName
    @param {String|Integer} id
    @param {Object} options
    @return {Promise} promise
    @private
  */
  find(modelName, id, options) {
    if (DEBUG) {
      assertDestroyingStore(this, 'find');
    }
    // The default `model` hook in Route calls `find(modelName, id)`,
    // that's why we have to keep this method around even though `findRecord` is
    // the public way to get a record by modelName and id.
    assert(
      `Using store.find(type) has been removed. Use store.findAll(modelName) to retrieve all records for a given type.`,
      arguments.length !== 1
    );
    assert(
      `Calling store.find(modelName, id, { preload: preload }) is no longer supported. Use store.findRecord(modelName, id, { preload: preload }) instead.`,
      !options
    );
    assert(`You need to pass the model name and id to the store's find method`, arguments.length === 2);
    assert(
      `You cannot pass '${id}' as id to the store's find method`,
      typeof id === 'string' || typeof id === 'number'
    );
    assert(
      `Calling store.find() with a query object is no longer supported. Use store.query() instead.`,
      typeof id !== 'object'
    );
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    return this.findRecord(modelName, id);
  }

  /**
    This method returns a record for a given identifier or type and id combination.

    The `findRecord` method will always resolve its promise with the same
    object for a given identifier or type and `id`.

    The `findRecord` method will always return a **promise** that will be
    resolved with the record.

    **Example 1**

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id }) {
        return this.store.findRecord('post', post_id);
      }
    }
    ```

    **Example 2**

    `findRecord` can be called with a single identifier argument instead of the combination
    of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
    the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id: id }) {
        return this.store.findRecord({ type: 'post', id });
      }
    }
    ```

    **Example 3**

    If you have previously received an lid via an Identifier for this record, and the record
    has already been assigned an id, you can find the record again using just the lid.

    ```app/routes/post.js
    store.findRecord({ lid });
    ```

    If the record is not yet available, the store will ask the adapter's `findRecord`
    method to retrieve and supply the necessary data. If the record is already present
    in the store, it depends on the reload behavior _when_ the returned promise
    resolves.

    ### Preloading

    You can optionally `preload` specific attributes and relationships that you know of
    by passing them via the passed `options`.

    For example, if your Ember route looks like `/posts/1/comments/2` and your API route
    for the comment also looks like `/posts/1/comments/2` if you want to fetch the comment
    without also fetching the post you can pass in the post to the `findRecord` call:

    ```app/routes/post-comments.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id, comment_id: id }) {
        return this.store.findRecord({ type: 'comment', id, { preload: { post: post_id }} });
      }
    }
    ```

    In your adapter you can then access this id without triggering a network request via the
    snapshot:

    ```app/adapters/application.js
    import EmberObject from '@ember/object';

    export default class Adapter extends EmberObject {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'comment')
          let postId = snapshot.belongsTo('post', { id: true });

          return fetch(`./posts/${postId}/comments/${id}`)
            .then(response => response.json())
        }
      }
    }
    ```

    This could also be achieved by supplying the post id to the adapter via the adapterOptions
    property on the options hash.

    ```app/routes/post-comments.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model({ post_id, comment_id: id }) {
        return this.store.findRecord({ type: 'comment', id, { adapterOptions: { post: post_id }} });
      }
    }
    ```

    ```app/adapters/application.js
    import EmberObject from '@ember/object';

    export default class Adapter extends EmberObject {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'comment')
          let postId = snapshot.adapterOptions.post;

          return fetch(`./posts/${postId}/comments/${id}`)
            .then(response => response.json())
        }
      }
    }
    ```

    If you have access to the post model you can also pass the model itself to preload:

    ```javascript
    let post = await store.findRecord('post', 1);
    let comment = await store.findRecord('comment', 2, { post: myPostModel });
    ```

    ### Reloading

    The reload behavior is configured either via the passed `options` hash or
    the result of the adapter's `shouldReloadRecord`.

    If `{ reload: true }` is passed or `adapter.shouldReloadRecord` evaluates
    to `true`, then the returned promise resolves once the adapter returns
    data, regardless if the requested record is already in the store:

    ```js
    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    // adapter#findRecord resolves with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]
    store.findRecord('post', 1, { reload: true }).then(function(post) {
      post.get('revision'); // 2
    });
    ```

    If no reload is indicated via the above mentioned ways, then the promise
    immediately resolves with the cached version in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadRecord` evaluates to `true`,
    then a background reload is started, which updates the records' data, once
    it is available:

    ```js
    // app/adapters/post.js
    import ApplicationAdapter from "./application";

    export default class PostAdapter extends ApplicationAdapter {
      shouldReloadRecord(store, snapshot) {
        return false;
      },

      shouldBackgroundReloadRecord(store, snapshot) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 1,
        type: 'post',
        revision: 1
      }
    });

    let blogPost = store.findRecord('post', 1).then(function(post) {
      post.get('revision'); // 1
    });

    // later, once adapter#findRecord resolved with
    // [
    //   {
    //     id: 1,
    //     type: 'post',
    //     revision: 2
    //   }
    // ]

    blogPost.get('revision'); // 2
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findRecord`.

    ```app/routes/post/edit.js
    import Route from '@ember/routing/route';

    export default class PostEditRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { backgroundReload: false });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to your adapter via the snapshot

    ```app/routes/post/edit.js
    import Route from '@ember/routing/route';

    export default class PostEditRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, {
          adapterOptions: { subscribe: false }
        });
      }
    }
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default class PostAdapter extends MyCustomAdapter {
      findRecord(store, type, id, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    }
    ```

    See [peekRecord](../methods/peekRecord?anchor=peekRecord) to get the cached version of a record.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](/ember-data/release/classes/JSONAPIAdapter)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findRecord()` or `findAll()` to automatically retrieve additional records related to
    the one you request by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve a specific post we can have the server also return that post's
    comments in the same request:

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { include: 'comments' });
      }
    }
    ```

    ```app/adapters/application.js
    import EmberObject from '@ember/object';

    export default class Adapter extends EmberObject {

      findRecord(store, schema, id, snapshot) {
        let type = schema.modelName;

        if (type === 'post')
          let includes = snapshot.adapterOptions.include;

          return fetch(`./posts/${postId}?include=${includes}`)
            .then(response => response.json())
        }
      }
    }
    ```

    In this case, the post's comments would then be available in your template as
    `model.comments`.

    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the post's
    comments and the authors of those comments the request would look like this:

    ```app/routes/post.js
    import Route from '@ember/routing/route';

    export default class PostRoute extends Route {
      model(params) {
        return this.store.findRecord('post', params.post_id, { include: 'comments,comments.author' });
      }
    }
    ```

    ### Retrieving Specific Fields by Type

    If your server endpoint supports the use of a ['fields' query parameter](https://jsonapi.org/format/#fetching-sparse-fieldsets),
    you can use pass those fields through to your server.  At this point in time, this requires a few manual steps on your part.

    1. Implement `buildQuery` in your adapter.

    ```app/adapters/application.js
    buildQuery(snapshot) {
      let query = super.buildQuery(...arguments);

      let { fields } = snapshot.adapterOptions;

      if (fields) {
        query.fields = fields;
      }

      return query;
    }
    ```

    2. Then pass through the applicable fields to your `findRecord` request.

    Given a `post` model with attributes body, title, publishDate and meta, you can retrieve a filtered list of attributes.

    ```app/routes/post.js
    import Route from '@ember/routing/route';
    export default Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id, { adapterOptions: { fields: { post: 'body,title' } });
      }
    });
    ```

    Moreover, you can filter attributes on related models as well. If a `post` has a `belongsTo` relationship to a user,
    just include the relationship key and attributes.

    ```app/routes/post.js
    import Route from '@ember/routing/route';
    export default Route.extend({
      model(params) {
        return this.store.findRecord('post', params.post_id, { adapterOptions: { fields: { post: 'body,title', user: 'name,email' } });
      }
    });
    ```

    @since 1.13.0
    @method findRecord
    @public
    @param {String|object} modelName - either a string representing the modelName or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
    @param {(String|Integer|Object)} id - optional object with options for the request only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved
    @param {Object} [options] - if the first param is a string this will be the optional options for the request. See examples for available options.
    @return {Promise} promise
  */
  findRecord(resource: string, id: string | number, options?: FindOptions): PromiseProxy<DSModel>;
  findRecord(resource: ResourceIdentifierObject, id?: FindOptions): PromiseProxy<DSModel>;
  findRecord(
    resource: string | ResourceIdentifierObject,
    id?: string | number | FindOptions,
    options?: FindOptions
  ): PromiseProxy<DSModel> {
    if (DEBUG) {
      assertDestroyingStore(this, 'findRecord');
    }

    assert(
      `You need to pass a modelName or resource identifier as the first argument to the store's findRecord method`,
      isPresent(resource)
    );
    if (isMaybeIdentifier(resource)) {
      options = id as FindOptions | undefined;
    } else {
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${resource}`,
        typeof resource === 'string'
      );
      const type = normalizeModelName(resource);
      const normalizedId = ensureStringId(id as string | number);
      resource = constructResource(type, normalizedId);
    }

    const internalModel = internalModelFactoryFor(this).lookup(resource);
    options = options || {};

    if (!internalModel.currentState.isLoaded) {
      return this._findByInternalModel(internalModel, options);
    }

    let fetchedInternalModel = this._findRecord(internalModel, options);

    return promiseRecord(fetchedInternalModel, `DS: Store#findRecord ${internalModel.identifier}`);
  }

  _findRecord(internalModel: InternalModel, options: FindOptions) {
    // Refetch if the reload option is passed
    if (options.reload) {
      return this._scheduleFetch(internalModel, options);
    }

    let snapshot = internalModel.createSnapshot(options);
    let adapter = this.adapterFor(internalModel.modelName);

    // Refetch the record if the adapter thinks the record is stale
    if (
      typeof options.reload === 'undefined' &&
      adapter.shouldReloadRecord &&
      adapter.shouldReloadRecord(this, snapshot)
    ) {
      return this._scheduleFetch(internalModel, options);
    }

    if (options.backgroundReload === false) {
      return Promise.resolve(internalModel);
    }

    // Trigger the background refetch if backgroundReload option is passed
    if (
      options.backgroundReload ||
      !adapter.shouldBackgroundReloadRecord ||
      adapter.shouldBackgroundReloadRecord(this, snapshot)
    ) {
      this._scheduleFetch(internalModel, options);
    }

    // Return the cached record
    return Promise.resolve(internalModel);
  }

  _findByInternalModel(internalModel: InternalModel, options: FindOptions = {}) {
    if (options.preload) {
      this._backburner.join(() => {
        internalModel.preloadData(options.preload);
      });
    }

    let fetchedInternalModel = this._findEmptyInternalModel(internalModel, options);

    return promiseRecord(
      fetchedInternalModel,
      `DS: Store#findRecord ${internalModel.modelName} with id: ${internalModel.id}`
    );
  }

  _findEmptyInternalModel(internalModel: InternalModel, options: FindOptions) {
    if (internalModel.currentState.isEmpty) {
      return this._scheduleFetch(internalModel, options);
    }

    //TODO double check about reloading
    if (!REQUEST_SERVICE) {
      if (internalModel.currentState.isLoading) {
        return internalModel._promiseProxy;
      }
    } else {
      if (internalModel.currentState.isLoading) {
        let pendingRequest = this._fetchManager.getPendingFetch(internalModel.identifier, options);
        if (pendingRequest) {
          return pendingRequest.then(() => Promise.resolve(internalModel));
        }
        return this._scheduleFetch(internalModel, options);
      }
    }

    return Promise.resolve(internalModel);
  }

  /**
    This method makes a series of requests to the adapter's `find` method
    and returns a promise that resolves once they are all loaded.

    @private
    @method findByIds
    @param {String} modelName
    @param {Array} ids
    @return {Promise} promise
  */
  findByIds(modelName, ids) {
    if (DEBUG) {
      assertDestroyingStore(this, 'findByIds');
    }
    assert(`You need to pass a model name to the store's findByIds method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let promises = new Array(ids.length);

    let normalizedModelName = normalizeModelName(modelName);

    for (let i = 0; i < ids.length; i++) {
      promises[i] = this.findRecord(normalizedModelName, ids[i]);
    }

    return promiseArray(all(promises).then(A, null, `DS: Store#findByIds of ${normalizedModelName} complete`));
  }

  /**
    This method is called by `findRecord` if it discovers that a particular
    type/id pair hasn't been loaded yet to kick off a request to the
    adapter.

    @method _fetchRecord
    @private
    @param {InternalModel} internalModel model
    @return {Promise} promise
   */
  _fetchRecord(internalModel: InternalModel, options): Promise<InternalModel> {
    let modelName = internalModel.modelName;
    let adapter = this.adapterFor(modelName);

    assert(`You tried to find a record but you have no adapter (for ${modelName})`, adapter);
    assert(
      `You tried to find a record but your adapter (for ${modelName}) does not implement 'findRecord'`,
      typeof adapter.findRecord === 'function'
    );

    return _find(adapter, this, internalModel.modelClass, internalModel.id, internalModel, options);
  }

  _scheduleFetchMany(internalModels, options) {
    let fetches = new Array(internalModels.length);

    for (let i = 0; i < internalModels.length; i++) {
      fetches[i] = this._scheduleFetch(internalModels[i], options);
    }

    return Promise.all(fetches);
  }

  _scheduleFetchThroughFetchManager(internalModel: InternalModel, options = {}): RSVP.Promise<InternalModel> {
    let generateStackTrace = this.generateStackTracesForTrackedRequests;
    // TODO  remove this once we don't rely on state machine
    internalModel.send('loadingData');
    let identifier = internalModel.identifier;

    assertIdentifierHasId(identifier);

    let promise = this._fetchManager.scheduleFetch(identifier, options, generateStackTrace);
    return promise.then(
      (payload) => {
        // ensure that regardless of id returned we assign to the correct record
        if (payload.data && !Array.isArray(payload.data)) {
          payload.data.lid = identifier.lid;
        }

        // Returning this._push here, breaks typing but not any tests, investigate potential missing tests
        let potentiallyNewIm = this._push(payload);
        if (potentiallyNewIm && !Array.isArray(potentiallyNewIm)) {
          return potentiallyNewIm;
        } else {
          return internalModel;
        }
      },
      (error) => {
        // TODO  remove this once we don't rely on state machine
        internalModel.send('notFound');
        if (internalModel.currentState.isEmpty) {
          internalModel.unloadRecord();
        }
        throw error;
      }
    );
  }

  _scheduleFetch(internalModel: InternalModel, options): RSVP.Promise<InternalModel> {
    if (REQUEST_SERVICE) {
      return this._scheduleFetchThroughFetchManager(internalModel, options);
    } else {
      if (internalModel._promiseProxy) {
        return internalModel._promiseProxy;
      }

      assertIdentifierHasId(internalModel.identifier);

      let { id, modelName } = internalModel;
      let resolver = defer<InternalModel>(`Fetching ${modelName}' with id: ${id}`);
      let pendingFetchItem: PendingFetchItem = {
        internalModel,
        resolver,
        options,
      };

      if (DEBUG) {
        if (this.generateStackTracesForTrackedRequests === true) {
          let trace;

          try {
            throw new Error(`Trace Origin for scheduled fetch for ${modelName}:${id}.`);
          } catch (e) {
            trace = e;
          }

          // enable folks to discover the origin of this findRecord call when
          // debugging. Ideally we would have a tracked queue for requests with
          // labels or local IDs that could be used to merge this trace with
          // the trace made available when we detect an async leak
          pendingFetchItem.trace = trace;
        }
      }

      let promise = resolver.promise;

      internalModel.send('loadingData', promise);
      if (this._pendingFetch.size === 0) {
        emberBackburner.schedule('actions', this, this.flushAllPendingFetches);
      }

      let fetches = this._pendingFetch;
      let pending = fetches.get(modelName);

      if (pending === undefined) {
        pending = [];
        fetches.set(modelName, pending);
      }

      pending.push(pendingFetchItem);

      return promise;
    }
  }

  flushAllPendingFetches() {
    if (REQUEST_SERVICE) {
      return;
      //assert here
    } else {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }

      this._pendingFetch.forEach(this._flushPendingFetchForType, this);
      this._pendingFetch.clear();
    }
  }

  _flushPendingFetchForType(pendingFetchItems: PendingFetchItem[], modelName: string) {
    let store = this;
    let adapter = store.adapterFor(modelName);
    let shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
    let totalItems = pendingFetchItems.length;
    let internalModels = new Array(totalItems);
    let seeking = Object.create(null);

    let optionsMap = new WeakMap();

    for (let i = 0; i < totalItems; i++) {
      let pendingItem = pendingFetchItems[i];
      let internalModel = pendingItem.internalModel;
      internalModels[i] = internalModel;
      optionsMap.set(internalModel, pendingItem.options);
      // We can remove this "not null" cast once we have enough typing
      // to know we are only dealing with ExistingResourceIdentifierObjects
      seeking[internalModel.id!] = pendingItem;
    }

    function _fetchRecord(recordResolverPair) {
      let recordFetch = store._fetchRecord(recordResolverPair.internalModel, recordResolverPair.options);

      recordResolverPair.resolver.resolve(recordFetch);
    }

    function handleFoundRecords(foundInternalModels: InternalModel[], expectedInternalModels: InternalModel[]) {
      // resolve found records
      let found = Object.create(null);
      for (let i = 0, l = foundInternalModels.length; i < l; i++) {
        let internalModel = foundInternalModels[i];

        // We can remove this "not null" cast once we have enough typing
        // to know we are only dealing with ExistingResourceIdentifierObjects
        let pair = seeking[internalModel.id!];
        found[internalModel.id!] = internalModel;

        if (pair) {
          let resolver = pair.resolver;
          resolver.resolve(internalModel);
        }
      }

      // reject missing records
      let missingInternalModels: InternalModel[] = [];

      for (let i = 0, l = expectedInternalModels.length; i < l; i++) {
        let internalModel = expectedInternalModels[i];

        // We can remove this "not null" cast once we have enough typing
        // to know we are only dealing with ExistingResourceIdentifierObjects
        if (!found[internalModel.id!]) {
          missingInternalModels.push(internalModel);
        }
      }

      if (missingInternalModels.length) {
        warn(
          'Ember Data expected to find records with the following ids in the adapter response but they were missing: [ "' +
            missingInternalModels.map((r) => r.id).join('", "') +
            '" ]',
          false,
          {
            id: 'ds.store.missing-records-from-adapter',
          }
        );
        rejectInternalModels(missingInternalModels);
      }
    }

    function rejectInternalModels(internalModels: InternalModel[], error?: Error) {
      for (let i = 0, l = internalModels.length; i < l; i++) {
        let internalModel = internalModels[i];

        // We can remove this "not null" cast once we have enough typing
        // to know we are only dealing with ExistingResourceIdentifierObjects
        let pair = seeking[internalModel.id!];

        if (pair) {
          pair.resolver.reject(
            error ||
              new Error(
                `Expected: '${internalModel}' to be present in the adapter provided payload, but it was not found.`
              )
          );
        }
      }
    }

    if (shouldCoalesce) {
      // TODO: Improve records => snapshots => records => snapshots
      //
      // We want to provide records to all store methods and snapshots to all
      // adapter methods. To make sure we're doing that we're providing an array
      // of snapshots to adapter.groupRecordsForFindMany(), which in turn will
      // return grouped snapshots instead of grouped records.
      //
      // But since the _findMany() finder is a store method we need to get the
      // records from the grouped snapshots even though the _findMany() finder
      // will once again convert the records to snapshots for adapter.findMany()
      let snapshots = new Array(totalItems);
      for (let i = 0; i < totalItems; i++) {
        let internalModel = internalModels[i];
        snapshots[i] = internalModel.createSnapshot(optionsMap.get(internalModel));
      }

      let groups;
      if (adapter.groupRecordsForFindMany) {
        groups = adapter.groupRecordsForFindMany(this, snapshots);
      } else {
        groups = [snapshots];
      }

      for (let i = 0, l = groups.length; i < l; i++) {
        let group = groups[i];
        let totalInGroup = groups[i].length;
        let ids = new Array(totalInGroup);
        let groupedInternalModels = new Array(totalInGroup);

        for (let j = 0; j < totalInGroup; j++) {
          let internalModel = group[j]._internalModel;

          groupedInternalModels[j] = internalModel;
          ids[j] = internalModel.id;
        }

        if (totalInGroup > 1) {
          (function (groupedInternalModels) {
            _findMany(adapter, store, modelName, ids, groupedInternalModels, optionsMap)
              .then(function (foundInternalModels) {
                handleFoundRecords(foundInternalModels, groupedInternalModels);
              })
              .catch(function (error) {
                rejectInternalModels(groupedInternalModels, error);
              });
          })(groupedInternalModels);
        } else if (ids.length === 1) {
          let pair = seeking[groupedInternalModels[0].id];
          _fetchRecord(pair);
        } else {
          assert("You cannot return an empty array from adapter's method groupRecordsForFindMany");
        }
      }
    } else {
      for (let i = 0; i < totalItems; i++) {
        _fetchRecord(pendingFetchItems[i]);
      }
    }
  }

  /**
    Get the reference for the specified record.

    Example

    ```javascript
    let userRef = store.getReference('user', 1);

    // check if the user is loaded
    let isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    let user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === 'id') {
    let id = userRef.id();
    }

    // load user (via store.find)
    userRef.load().then(...)

    // or trigger a reload
    userRef.reload().then(...)

    // provide data for reference
    userRef.push({ id: 1, username: '@user' }).then(function(user) {
      userRef.value() === user;
    });
    ```

    @method getReference
    @public
    @param {String|object} resource - modelName (string) or Identifier (object)
    @param {String|Integer} id
    @since 2.5.0
    @return {RecordReference}
  */
  getReference(resource: string | ResourceIdentifierObject, id: string | number): RecordReference {
    if (DEBUG) {
      assertDestroyingStore(this, 'getReference');
    }

    let resourceIdentifier;
    if (arguments.length === 1 && isMaybeIdentifier(resource)) {
      resourceIdentifier = resource;
    } else {
      const type = normalizeModelName(resource as string);
      const normalizedId = ensureStringId(id);
      resourceIdentifier = constructResource(type, normalizedId);
    }

    assert(
      'getReference expected to receive either a resource identifier or type and id as arguments',
      isMaybeIdentifier(resourceIdentifier)
    );

    let identifier: StableRecordIdentifier = identifierCacheFor(this).getOrCreateRecordIdentifier(resourceIdentifier);
    if (identifier) {
      if (RECORD_REFERENCES.has(identifier)) {
        return RECORD_REFERENCES.get(identifier);
      }

      let reference = new RecordReference(this, identifier);
      RECORD_REFERENCES.set(identifier, reference);
      return reference;
    }
  }

  /**
    Get a record by a given type and ID without triggering a fetch.

    This method will synchronously return the record if it is available in the store,
    otherwise it will return `null`. A record is available if it has been fetched earlier, or
    pushed manually into the store.

    See [findRecord](../methods/findRecord?anchor=findRecord) if you would like to request this record from the backend.

    _Note: This is a synchronous method and does not return a promise._

    **Example 1**

    ```js
    let post = store.peekRecord('post', 1);

    post.id; // 1
    ```

    `peekRecord` can be called with a single identifier argument instead of the combination
    of `type` (modelName) and `id` as separate arguments. You may recognize this combo as
    the typical pairing from [JSON:API](https://jsonapi.org/format/#document-resource-object-identification)

    **Example 2**

    ```js
    let post = store.peekRecord({ type: 'post', id });
    post.id; // 1
    ```

    If you have previously received an lid from an Identifier for this record, you can lookup the record again using
    just the lid.

    **Example 3**

    ```js
    let post = store.peekRecord({ lid });
    post.id; // 1
    ```


    @since 1.13.0
    @method peekRecord
    @public
    @param {String|object} modelName - either a string representing the modelName or a ResourceIdentifier object containing both the type (a string) and the id (a string) for the record or an lid (a string) of an existing record
    @param {String|Integer} id - optional only if the first param is a ResourceIdentifier, else the string id of the record to be retrieved.
    @return {Model|null} record
  */
  peekRecord(identifier: string, id: string | number): RecordInstance | null;
  peekRecord(identifier: ResourceIdentifierObject): RecordInstance | null;
  peekRecord(identifier: ResourceIdentifierObject | string, id?: string | number): RecordInstance | null {
    if (arguments.length === 1 && isMaybeIdentifier(identifier)) {
      let stableIdentifier = identifierCacheFor(this).peekRecordIdentifier(identifier);
      if (stableIdentifier) {
        return internalModelFactoryFor(this).peek(stableIdentifier)?.getRecord() || null;
      }
      return null;
    }

    if (DEBUG) {
      assertDestroyingStore(this, 'peekRecord');
    }

    assert(`You need to pass a model name to the store's peekRecord method`, isPresent(identifier));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${identifier}`,
      typeof identifier === 'string'
    );

    const type = normalizeModelName(identifier);
    const normalizedId = ensureStringId(id);

    if (this.hasRecordForId(type, normalizedId)) {
      const resource = constructResource(type, normalizedId);
      return internalModelFactoryFor(this).lookup(resource).getRecord();
    } else {
      return null;
    }
  }

  /**
    This method is called by the record's `reload` method.

    This method calls the adapter's `find` method, which returns a promise. When
    **that** promise resolves, `_reloadRecord` will resolve the promise returned
    by the record's `reload`.

    @method _reloadRecord
    @private
    @param {Model} internalModel
    @param options optional to include adapterOptions
    @return {Promise} promise
  */
  _reloadRecord(internalModel, options): RSVP.Promise<InternalModel> {
    if (REQUEST_SERVICE) {
      options.isReloading = true;
    }
    let { id, modelName } = internalModel;
    let adapter = this.adapterFor(modelName);

    assert(`You cannot reload a record without an ID`, id);
    assert(`You tried to reload a record but you have no adapter (for ${modelName})`, adapter);
    assert(
      `You tried to reload a record but your adapter does not implement 'findRecord'`,
      typeof adapter.findRecord === 'function' || typeof adapter.find === 'function'
    );

    return this._scheduleFetch(internalModel, options);
  }

  /**
   This method returns true if a record for a given modelName and id is already
   loaded in the store. Use this function to know beforehand if a findRecord()
   will result in a request or that it will be a cache hit.

   Example

   ```javascript
   store.hasRecordForId('post', 1); // false
   store.findRecord('post', 1).then(function() {
     store.hasRecordForId('post', 1); // true
   });
   ```

    @method hasRecordForId
    @public
    @param {String} modelName
    @param {(String|Integer)} id
    @return {Boolean}
  */
  hasRecordForId(modelName: string, id: string | number): boolean {
    if (DEBUG) {
      assertDestroyingStore(this, 'hasRecordForId');
    }
    assert(`You need to pass a model name to the store's hasRecordForId method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    const type = normalizeModelName(modelName);
    const trueId = ensureStringId(id);
    const resource = { type, id: trueId };

    const identifier = identifierCacheFor(this).peekRecordIdentifier(resource);
    const internalModel = identifier && internalModelFactoryFor(this).peek(identifier);

    return !!internalModel && internalModel.currentState.isLoaded;
  }

  /**
    Returns id record for a given type and ID. If one isn't already loaded,
    it builds a new record and leaves it in the `empty` state.

    @method recordForId
    @private
    @param {String} modelName
    @param {(String|Integer)} id
    @return {Model} record
  */
  recordForId(modelName: string, id: string | number): RecordInstance {
    if (DEBUG) {
      assertDestroyingStore(this, 'recordForId');
    }
    assert(`You need to pass a model name to the store's recordForId method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    const resource = constructResource(modelName, ensureStringId(id));

    return internalModelFactoryFor(this).lookup(resource).getRecord();
  }

  /**
    @method findMany
    @private
    @param {Array} internalModels
    @return {Promise} promise
  */
  findMany(internalModels, options) {
    if (DEBUG) {
      assertDestroyingStore(this, 'findMany');
    }
    let finds = new Array(internalModels.length);

    for (let i = 0; i < internalModels.length; i++) {
      finds[i] = this._findEmptyInternalModel(internalModels[i], options);
    }

    return Promise.all(finds);
  }

  /**
    If a relationship was originally populated by the adapter as a link
    (as opposed to a list of IDs), this method is called when the
    relationship is fetched.

    The link (which is usually a URL) is passed through unchanged, so the
    adapter can make whatever request it wants.

    The usual use-case is for the server to register a URL as a link, and
    then use that URL in the future to make a request for the relationship.

    @method findHasMany
    @private
    @param {InternalModel} internalModel
    @param {any} link
    @param {(Relationship)} relationship
    @return {Promise} promise
  */
  findHasMany(internalModel, link, relationship, options) {
    if (DEBUG) {
      assertDestroyingStore(this, 'findHasMany');
    }
    let adapter = this.adapterFor(internalModel.modelName);

    assert(
      `You tried to load a hasMany relationship but you have no adapter (for ${internalModel.modelName})`,
      adapter
    );
    assert(
      `You tried to load a hasMany relationship from a specified 'link' in the original payload but your adapter does not implement 'findHasMany'`,
      typeof adapter.findHasMany === 'function'
    );

    return _findHasMany(adapter, this, internalModel, link, relationship, options);
  }

  _findHasManyByJsonApiResource(
    resource,
    parentInternalModel: InternalModel,
    relationship: ManyRelationship | BelongsToRelationship,
    options: any
  ): RSVP.Promise<unknown> {
    if (HAS_RECORD_DATA_PACKAGE) {
      if (!resource) {
        return resolve([]);
      }
      const { definition, state } = relationship;
      let adapter = this.adapterFor(definition.type);

      let { isStale, hasDematerializedInverse, hasReceivedData, isEmpty, shouldForceReload } = state;
      const allInverseRecordsAreLoaded = areAllInverseRecordsLoaded(this, resource);

      let shouldFindViaLink =
        resource.links &&
        resource.links.related &&
        (typeof adapter.findHasMany === 'function' || typeof resource.data === 'undefined') &&
        (shouldForceReload || hasDematerializedInverse || isStale || (!allInverseRecordsAreLoaded && !isEmpty));

      // fetch via link
      if (shouldFindViaLink) {
        // findHasMany, although not public, does not need to care about our upgrade relationship definitions
        // and can stick with the public definition API for now.
        const relationshipMeta = this._storeWrapper.relationshipsDefinitionFor(definition.inverseType)[definition.key];
        return this.findHasMany(parentInternalModel, resource.links.related, relationshipMeta, options);
      }

      let preferLocalCache = hasReceivedData && !isEmpty;

      let hasLocalPartialData =
        hasDematerializedInverse || (isEmpty && Array.isArray(resource.data) && resource.data.length > 0);

      // fetch using data, pulling from local cache if possible
      if (!shouldForceReload && !isStale && (preferLocalCache || hasLocalPartialData)) {
        let internalModels = resource.data.map((json) => this._internalModelForResource(json));

        return this.findMany(internalModels, options);
      }

      let hasData = hasReceivedData && !isEmpty;

      // fetch by data
      if (hasData || hasLocalPartialData) {
        let internalModels = resource.data.map((json) => this._internalModelForResource(json));

        return this._scheduleFetchMany(internalModels, options);
      }

      // we were explicitly told we have no data and no links.
      //   TODO if the relationshipIsStale, should we hit the adapter anyway?
      return resolve([]);
    }
    assert(`hasMany only works with the @ember-data/record-data package`);
  }

  /**
    @method findBelongsTo
    @private
    @param {InternalModel} internalModel
    @param {any} link
    @param {Relationship} relationship
    @return {Promise} promise
  */
  findBelongsTo(internalModel, link, relationship, options) {
    if (DEBUG) {
      assertDestroyingStore(this, 'findBelongsTo');
    }
    let adapter = this.adapterFor(internalModel.modelName);

    assert(
      `You tried to load a belongsTo relationship but you have no adapter (for ${internalModel.modelName})`,
      adapter
    );
    assert(
      `You tried to load a belongsTo relationship from a specified 'link' in the original payload but your adapter does not implement 'findBelongsTo'`,
      typeof adapter.findBelongsTo === 'function'
    );

    return _findBelongsTo(adapter, this, internalModel, link, relationship, options);
  }

  _fetchBelongsToLinkFromResource(resource, parentInternalModel, relationshipMeta, options) {
    if (!resource || !resource.links || !resource.links.related) {
      // should we warn here, not sure cause its an internal method
      return resolve(null);
    }
    return this.findBelongsTo(parentInternalModel, resource.links.related, relationshipMeta, options).then(
      (internalModel) => {
        return internalModel ? internalModel.getRecord() : null;
      }
    );
  }

  _findBelongsToByJsonApiResource(resource, parentInternalModel, relationshipMeta, options) {
    if (!resource) {
      return resolve(null);
    }

    const internalModel = resource.data ? this._internalModelForResource(resource.data) : null;
    let { isStale, hasDematerializedInverse, hasReceivedData, isEmpty, shouldForceReload } = resource._relationship
      .state as RelationshipState;
    const allInverseRecordsAreLoaded = areAllInverseRecordsLoaded(this, resource);

    let shouldFindViaLink =
      resource.links &&
      resource.links.related &&
      (shouldForceReload || hasDematerializedInverse || isStale || (!allInverseRecordsAreLoaded && !isEmpty));

    if (internalModel) {
      // short circuit if we are already loading
      if (REQUEST_SERVICE) {
        let pendingRequest = this._fetchManager.getPendingFetch(internalModel.identifier, options);
        if (pendingRequest) {
          return pendingRequest.then(() => internalModel.getRecord());
        }
      } else {
        if (internalModel.currentState.isLoading) {
          return internalModel._promiseProxy.then(() => {
            return internalModel.getRecord();
          });
        }
      }
    }

    // fetch via link
    if (shouldFindViaLink) {
      return this._fetchBelongsToLinkFromResource(resource, parentInternalModel, relationshipMeta, options);
    }

    let preferLocalCache = hasReceivedData && allInverseRecordsAreLoaded && !isEmpty;
    let hasLocalPartialData = hasDematerializedInverse || (isEmpty && resource.data);
    // null is explicit empty, undefined is "we don't know anything"
    let localDataIsEmpty = resource.data === undefined || resource.data === null;

    // fetch using data, pulling from local cache if possible
    if (!shouldForceReload && !isStale && (preferLocalCache || hasLocalPartialData)) {
      /*
        We have canonical data, but our local state is empty
       */
      if (localDataIsEmpty) {
        return resolve(null);
      }

      if (!internalModel) {
        assert(`No InternalModel found for ${resource.lid}`, internalModel);
      }

      return this._findByInternalModel(internalModel, options);
    }

    let resourceIsLocal = !localDataIsEmpty && resource.data.id === null;

    if (internalModel && resourceIsLocal) {
      return resolve(internalModel.getRecord());
    }

    // fetch by data
    if (internalModel && !localDataIsEmpty) {
      return this._scheduleFetch(internalModel, options).then(() => {
        return internalModel.getRecord();
      });
    }

    // we were explicitly told we have no data and no links.
    //   TODO if the relationshipIsStale, should we hit the adapter anyway?
    return resolve(null);
  }

  /**
    This method delegates a query to the adapter. This is the one place where
    adapter-level semantics are exposed to the application.

    Each time this method is called a new request is made through the adapter.

    Exposing queries this way seems preferable to creating an abstract query
    language for all server-side queries, and then require all adapters to
    implement them.

    ---

    If you do something like this:

    ```javascript
    store.query('person', { page: 1 });
    ```

    The request made to the server will look something like this:

    ```
    GET "/api/v1/person?page=1"
    ```

    ---

    If you do something like this:

    ```javascript
    store.query('person', { ids: [1, 2, 3] });
    ```

    The request made to the server will look something like this:

    ```
    GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
    decoded: "/api/v1/person?ids[]=1&ids[]=2&ids[]=3"
    ```

    This method returns a promise, which is resolved with an
    [`AdapterPopulatedRecordArray`](/ember-data/release/classes/AdapterPopulatedRecordArray)
    once the server returns.

    @since 1.13.0
    @method query
    @public
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter.query
    @return {Promise} promise
  */
  query(modelName: string, query, options): PromiseArray<DSModel> {
    if (DEBUG) {
      assertDestroyingStore(this, 'query');
    }
    assert(`You need to pass a model name to the store's query method`, isPresent(modelName));
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let adapterOptionsWrapper: { adapterOptions?: any } = {};

    if (options && options.adapterOptions) {
      adapterOptionsWrapper.adapterOptions = options.adapterOptions;
    }

    let normalizedModelName = normalizeModelName(modelName);
    return this._query(normalizedModelName, query, null, adapterOptionsWrapper);
  }

  _query(modelName: string, query, array, options): PromiseArray<DSModel> {
    assert(`You need to pass a model name to the store's query method`, isPresent(modelName));
    assert(`You need to pass a query hash to the store's query method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let adapter = this.adapterFor(modelName);

    assert(`You tried to load a query but you have no adapter (for ${modelName})`, adapter);
    assert(
      `You tried to load a query but your adapter does not implement 'query'`,
      typeof adapter.query === 'function'
    );

    return promiseArray(_query(adapter, this, modelName, query, array, options));
  }

  /**
    This method makes a request for one record, where the `id` is not known
    beforehand (if the `id` is known, use [`findRecord`](../methods/findRecord?anchor=findRecord)
    instead).

    This method can be used when it is certain that the server will return a
    single object for the primary data.

    Each time this method is called a new request is made through the adapter.

    Let's assume our API provides an endpoint for the currently logged in user
    via:

    ```
    // GET /api/current_user
    {
      user: {
        id: 1234,
        username: 'admin'
      }
    }
    ```

    Since the specific `id` of the `user` is not known beforehand, we can use
    `queryRecord` to get the user:

    ```javascript
    store.queryRecord('user', {}).then(function(user) {
      let username = user.get('username');
      console.log(`Currently logged in as ${username}`);
    });
    ```

    The request is made through the adapters' `queryRecord`:

    ```app/adapters/user.js
    import Adapter from '@ember-data/adapter';
    import $ from 'jquery';

    export default class UserAdapter extends Adapter {
      queryRecord(modelName, query) {
        return $.getJSON('/api/current_user');
      }
    }
    ```

    Note: the primary use case for `store.queryRecord` is when a single record
    is queried and the `id` is not known beforehand. In all other cases
    `store.query` and using the first item of the array is likely the preferred
    way:

    ```
    // GET /users?username=unique
    {
      data: [{
        id: 1234,
        type: 'user',
        attributes: {
          username: "unique"
        }
      }]
    }
    ```

    ```javascript
    store.query('user', { username: 'unique' }).then(function(users) {
      return users.get('firstObject');
    }).then(function(user) {
      let id = user.get('id');
    });
    ```

    This method returns a promise, which resolves with the found record.

    If the adapter returns no data for the primary data of the payload, then
    `queryRecord` resolves with `null`:

    ```
    // GET /users?username=unique
    {
      data: null
    }
    ```

    ```javascript
    store.queryRecord('user', { username: 'unique' }).then(function(user) {
      console.log(user); // null
    });
    ```

    @since 1.13.0
    @method queryRecord
    @public
    @param {String} modelName
    @param {any} query an opaque query to be used by the adapter
    @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter.queryRecord
    @return {Promise} promise which resolves with the found record or `null`
  */
  queryRecord(modelName, query, options) {
    if (DEBUG) {
      assertDestroyingStore(this, 'queryRecord');
    }
    assert(`You need to pass a model name to the store's queryRecord method`, isPresent(modelName));
    assert(`You need to pass a query hash to the store's queryRecord method`, query);
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let normalizedModelName = normalizeModelName(modelName);
    let adapter = this.adapterFor(normalizedModelName);
    let adapterOptionsWrapper: { adapterOptions?: any } = {};

    if (options && options.adapterOptions) {
      adapterOptionsWrapper.adapterOptions = options.adapterOptions;
    }

    assert(`You tried to make a query but you have no adapter (for ${normalizedModelName})`, adapter);
    assert(
      `You tried to make a query but your adapter does not implement 'queryRecord'`,
      typeof adapter.queryRecord === 'function'
    );

    return promiseObject(
      _queryRecord(adapter, this, normalizedModelName, query, adapterOptionsWrapper).then((internalModel) => {
        // the promise returned by store.queryRecord is expected to resolve with
        // an instance of Model
        if (internalModel) {
          return internalModel.getRecord();
        }

        return null;
      })
    );
  }

  /**
    `findAll` asks the adapter's `findAll` method to find the records for the
    given type, and returns a promise which will resolve with all records of
    this type present in the store, even if the adapter only returns a subset
    of them.

    ```app/routes/authors.js
    import Route from '@ember/routing/route';

    export default class AuthorsRoute extends Route {
      model(params) {
        return this.store.findAll('author');
      }
    }
    ```

    _When_ the returned promise resolves depends on the reload behavior,
    configured via the passed `options` hash and the result of the adapter's
    `shouldReloadAll` method.

    ### Reloading

    If `{ reload: true }` is passed or `adapter.shouldReloadAll` evaluates to
    `true`, then the returned promise resolves once the adapter returns data,
    regardless if there are already records in the store:

    ```js
    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    // adapter#findAll resolves with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]
    store.findAll('author', { reload: true }).then(function(authors) {
      authors.getEach('id'); // ['first', 'second']
    });
    ```

    If no reload is indicated via the above mentioned ways, then the promise
    immediately resolves with all the records currently loaded in the store.

    ### Background Reloading

    Optionally, if `adapter.shouldBackgroundReloadAll` evaluates to `true`,
    then a background reload is started. Once this resolves, the array with
    which the promise resolves, is updated automatically so it contains all the
    records in the store:

    ```app/adapters/application.js
    import Adapter from '@ember-data/adapter';

    export default class ApplicationAdapter extends Adapter {
      shouldReloadAll(store, snapshotsArray) {
        return false;
      },

      shouldBackgroundReloadAll(store, snapshotsArray) {
        return true;
      }
    });

    // ...

    store.push({
      data: {
        id: 'first',
        type: 'author'
      }
    });

    let allAuthors;
    store.findAll('author').then(function(authors) {
      authors.getEach('id'); // ['first']

      allAuthors = authors;
    });

    // later, once adapter#findAll resolved with
    // [
    //   {
    //     id: 'second',
    //     type: 'author'
    //   }
    // ]

    allAuthors.getEach('id'); // ['first', 'second']
    ```

    If you would like to force or prevent background reloading, you can set a
    boolean value for `backgroundReload` in the options object for
    `findAll`.

    ```app/routes/post/edit.js
    import Route from '@ember/routing/route';

    export default class PostEditRoute extends Route {
      model() {
        return this.store.findAll('post', { backgroundReload: false });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to you adapter via the `snapshotRecordArray`

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      model(params) {
        return this.store.findAll('post', {
          adapterOptions: { subscribe: false }
        });
      }
    }
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default class UserAdapter extends MyCustomAdapter {
      findAll(store, type, sinceToken, snapshotRecordArray) {
        if (snapshotRecordArray.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    }
    ```

    See [peekAll](../methods/peekAll?anchor=peekAll) to get an array of current records in the
    store, without waiting until a reload is finished.

    ### Retrieving Related Model Records

    If you use an adapter such as Ember's default
    [`JSONAPIAdapter`](/ember-data/release/classes/JSONAPIAdapter)
    that supports the [JSON API specification](http://jsonapi.org/) and if your server
    endpoint supports the use of an
    ['include' query parameter](http://jsonapi.org/format/#fetching-includes),
    you can use `findAll()` to automatically retrieve additional records related to
    those requested by supplying an `include` parameter in the `options` object.

    For example, given a `post` model that has a `hasMany` relationship with a `comment`
    model, when we retrieve all of the post records we can have the server also return
    all of the posts' comments in the same request:

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      model() {
        return this.store.findAll('post', { include: 'comments' });
      }
    }
    ```
    Multiple relationships can be requested using an `include` parameter consisting of a
    comma-separated list (without white-space) while nested relationships can be specified
    using a dot-separated sequence of relationship names. So to request both the posts'
    comments and the authors of those comments the request would look like this:

    ```app/routes/posts.js
    import Route from '@ember/routing/route';

    export default class PostsRoute extends Route {
      model() {
        return this.store.findAll('post', { include: 'comments,comments.author' });
      }
    }
    ```

    See [query](../methods/query?anchor=query) to only get a subset of records from the server.

    @since 1.13.0
    @method findAll
    @public
    @param {String} modelName
    @param {Object} options
    @return {Promise} promise
  */
  findAll(modelName, options) {
    if (DEBUG) {
      assertDestroyingStore(this, 'findAll');
    }
    assert(`You need to pass a model name to the store's findAll method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );

    let normalizedModelName = normalizeModelName(modelName);
    let fetch = this._fetchAll(normalizedModelName, this.peekAll(normalizedModelName), options);

    return fetch;
  }

  /**
    @method _fetchAll
    @private
    @param {Model} modelName
    @param {RecordArray} array
    @return {Promise} promise
  */
  _fetchAll(modelName, array, options: { reload?: boolean; backgroundReload?: boolean } = {}) {
    let adapter = this.adapterFor(modelName);

    assert(`You tried to load all records but you have no adapter (for ${modelName})`, adapter);
    assert(
      `You tried to load all records but your adapter does not implement 'findAll'`,
      typeof adapter.findAll === 'function'
    );

    if (options.reload) {
      set(array, 'isUpdating', true);
      return promiseArray(_findAll(adapter, this, modelName, options));
    }

    let snapshotArray = array._createSnapshot(options);

    if (options.reload !== false) {
      if (
        (adapter.shouldReloadAll && adapter.shouldReloadAll(this, snapshotArray)) ||
        (!adapter.shouldReloadAll && snapshotArray.length === 0)
      ) {
        set(array, 'isUpdating', true);
        return promiseArray(_findAll(adapter, this, modelName, options));
      }
    }

    if (options.backgroundReload === false) {
      return promiseArray(Promise.resolve(array));
    }

    if (
      options.backgroundReload ||
      !adapter.shouldBackgroundReloadAll ||
      adapter.shouldBackgroundReloadAll(this, snapshotArray)
    ) {
      set(array, 'isUpdating', true);
      _findAll(adapter, this, modelName, options);
    }

    return promiseArray(Promise.resolve(array));
  }

  /**
    @method _didUpdateAll
    @param {String} modelName
    @private
  */
  _didUpdateAll(modelName) {
    this.recordArrayManager._didUpdateAll(modelName);
  }

  /**
    This method returns a filtered array that contains all of the
    known records for a given type in the store.

    Note that because it's just a filter, the result will contain any
    locally created records of the type, however, it will not make a
    request to the backend to retrieve additional records. If you
    would like to request all the records from the backend please use
    [store.findAll](../methods/findAll?anchor=findAll).

    Also note that multiple calls to `peekAll` for a given type will always
    return the same `RecordArray`.

    Example

    ```javascript
    let localPosts = store.peekAll('post');
    ```

    @since 1.13.0
    @method peekAll
    @public
    @param {String} modelName
    @return {RecordArray}
  */
  peekAll(modelName) {
    if (DEBUG) {
      assertDestroyingStore(this, 'peekAll');
    }
    assert(`You need to pass a model name to the store's peekAll method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);
    return this.recordArrayManager.liveRecordArrayFor(normalizedModelName);
  }

  /**
    This method unloads all records in the store.
    It schedules unloading to happen during the next run loop.

    Optionally you can pass a type which unload all records for a given type.

    ```javascript
    store.unloadAll();
    store.unloadAll('post');
    ```

    @method unloadAll
    @public
    @param {String} modelName
  */
  unloadAll(modelName?: string) {
    if (DEBUG) {
      assertDestroyedStoreOnly(this, 'unloadAll');
    }
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
      !modelName || typeof modelName === 'string'
    );

    const factory = internalModelFactoryFor(this);

    if (modelName === undefined) {
      factory.clear();
    } else {
      let normalizedModelName = normalizeModelName(modelName);
      factory.clear(normalizedModelName);
    }
  }

  filter() {
    assert(
      'The filter API has been moved to a plugin. To enable store.filter using an environment flag, or to use an alternative, you can visit the ember-data-filter addon page. https://github.com/ember-data/ember-data-filter',
      false
    );
  }

  // ..............
  // . PERSISTING .
  // ..............

  /**
    This method is called by `record.save`, and gets passed a
    resolver for the promise that `record.save` returns.

    It schedules saving to happen at the end of the run loop.

    @method scheduleSave
    @private
    @param {InternalModel} internalModel
    @param {Resolver} resolver
    @param {Object} options
  */
  scheduleSave(internalModel: InternalModel, resolver: RSVP.Deferred<void>, options): void | RSVP.Promise<void> {
    if (REQUEST_SERVICE) {
      if (internalModel._isRecordFullyDeleted()) {
        resolver.resolve();
        return resolver.promise;
      }

      internalModel.adapterWillCommit();

      if (!options) {
        options = {};
      }
      let recordData = internalModel._recordData;
      let operation: 'createRecord' | 'deleteRecord' | 'updateRecord' = 'updateRecord';

      // TODO handle missing isNew
      if (recordData.isNew && recordData.isNew()) {
        operation = 'createRecord';
      } else if (recordData.isDeleted && recordData.isDeleted()) {
        operation = 'deleteRecord';
      }

      options[SaveOp] = operation;

      let fetchManagerPromise = this._fetchManager.scheduleSave(internalModel.identifier, options);
      let promise = fetchManagerPromise.then(
        (payload) => {
          /*
        Note to future spelunkers hoping to optimize.
        We rely on this `run` to create a run loop if needed
        that `store._push` and `store.didSaveRecord` will both share.

        We use `join` because it is often the case that we
        have an outer run loop available still from the first
        call to `store._push`;
       */
          this._backburner.join(() => {
            let data = payload && payload.data;
            this.didSaveRecord(internalModel, { data }, operation);
            if (payload && payload.included) {
              this._push({ data: null, included: payload.included });
            }
          });
        },
        (e) => {
          if (typeof e === 'string') {
            throw e;
          }
          const { error, parsedErrors } = e;
          this.recordWasInvalid(internalModel, parsedErrors, error);
          throw error;
        }
      );

      return promise;
    } else {
      if (internalModel._isRecordFullyDeleted()) {
        resolver.resolve();
        return;
      }

      let snapshot = internalModel.createSnapshot(options);
      internalModel.adapterWillCommit();
      this._pendingSave.push({
        snapshot: snapshot,
        resolver: resolver,
      });

      emberBackburner.scheduleOnce('actions', this, this.flushPendingSave);
    }
  }

  /**
    This method is called at the end of the run loop, and
    flushes any records passed into `scheduleSave`

    @method flushPendingSave
    @private
  */
  flushPendingSave() {
    if (REQUEST_SERVICE) {
      // assert here
      return;
    }
    let pending = this._pendingSave.slice();
    this._pendingSave = [];

    for (let i = 0, j = pending.length; i < j; i++) {
      let pendingItem = pending[i];
      let snapshot = pendingItem.snapshot;
      let resolver = pendingItem.resolver;
      // TODO We have to cast due to our reliance on this private property
      // this will be refactored away once we change our pending API to be identifier based
      let internalModel = (snapshot as unknown as PrivateSnapshot)._internalModel;
      let adapter = this.adapterFor(internalModel.modelName);
      let operation;

      if (RECORD_DATA_STATE) {
        // TODO move this out of internalModel
        if (internalModel.isNew()) {
          operation = 'createRecord';
        } else if (internalModel.isDeleted()) {
          operation = 'deleteRecord';
        } else {
          operation = 'updateRecord';
        }
      } else {
        if (internalModel.currentState.stateName === 'root.deleted.saved') {
          resolver.resolve();
          continue;
        } else if (internalModel.isNew()) {
          operation = 'createRecord';
        } else if (internalModel.isDeleted()) {
          operation = 'deleteRecord';
        } else {
          operation = 'updateRecord';
        }
      }

      resolver.resolve(_commit(adapter, this, operation, snapshot));
    }
  }

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is resolved.

    If the data provides a server-generated ID, it will
    update the record and the store's indexes.

    @method didSaveRecord
    @private
    @param {InternalModel} internalModel the in-flight internal model
    @param {Object} data optional data (see above)
    @param {string} op the adapter operation that was committed
  */
  didSaveRecord(internalModel, dataArg, op: 'createRecord' | 'updateRecord' | 'deleteRecord') {
    if (DEBUG) {
      assertDestroyingStore(this, 'didSaveRecord');
    }
    let data;
    if (dataArg) {
      data = dataArg.data;
    }
    if (!data) {
      assert(
        `Your ${internalModel.modelName} record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response.`,
        internalModel.id
      );
    }

    const cache = identifierCacheFor(this);
    const identifier = internalModel.identifier;

    if (op !== 'deleteRecord' && data) {
      cache.updateRecordIdentifier(identifier, data);
    }

    //We first make sure the primary data has been updated
    //TODO try to move notification to the user to the end of the runloop
    internalModel.adapterDidCommit(data);
  }

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected with a `InvalidError`.

    @method recordWasInvalid
    @private
    @param {InternalModel} internalModel
    @param {Object} errors
  */
  recordWasInvalid(internalModel, parsedErrors, error) {
    if (DEBUG) {
      assertDestroyingStore(this, 'recordWasInvalid');
    }
    if (RECORD_DATA_ERRORS) {
      internalModel.adapterDidInvalidate(parsedErrors, error);
    } else {
      internalModel.adapterDidInvalidate(parsedErrors);
    }
  }

  /**
    This method is called once the promise returned by an
    adapter's `createRecord`, `updateRecord` or `deleteRecord`
    is rejected (with anything other than a `InvalidError`).

    @method recordWasError
    @private
    @param {InternalModel} internalModel
    @param {Error} error
  */
  recordWasError(internalModel, error) {
    if (DEBUG) {
      assertDestroyingStore(this, 'recordWasError');
    }
    internalModel.adapterDidError(error);
  }

  /**
    Sets newly received ID from the adapter's `createRecord`, `updateRecord`
    or `deleteRecord`.

    @method setRecordId
    @private
    @param {String} modelName
    @param {string} newId
    @param {string} clientId
   */
  setRecordId(modelName: string, newId: string, clientId: string) {
    if (DEBUG) {
      assertDestroyingStore(this, 'setRecordId');
    }
    internalModelFactoryFor(this).setRecordId(modelName, newId, clientId);
  }

  // ................
  // . LOADING DATA .
  // ................

  /**
    This internal method is used by `push`.

    @method _load
    @private
    @param {Object} data
  */
  _load(data: ExistingResourceObject) {
    const resource = constructResource(normalizeModelName(data.type), ensureStringId(data.id), coerceId(data.lid));

    let internalModel = internalModelFactoryFor(this).lookup(resource, data);

    // store.push will be from empty
    // findRecord will be from root.loading
    // all else will be updates
    const isLoading = internalModel.currentState.stateName === 'root.loading';
    const isUpdate = internalModel.currentState.isEmpty === false && !isLoading;

    // exclude store.push (root.empty) case
    let identifier = internalModel.identifier;
    if (isUpdate || isLoading) {
      let updatedIdentifier = identifierCacheFor(this).updateRecordIdentifier(identifier, data);

      if (updatedIdentifier !== identifier) {
        // we encountered a merge of identifiers in which
        // two identifiers (and likely two internalModels)
        // existed for the same resource. Now that we have
        // determined the correct identifier to use, make sure
        // that we also use the correct internalModel.
        identifier = updatedIdentifier;
        internalModel = internalModelFactoryFor(this).lookup(identifier);
      }
    }

    internalModel.setupData(data);

    if (!isUpdate) {
      this.recordArrayManager.recordDidChange(identifier);
    }

    return internalModel;
  }

  /**
    Push some data for a given type into the store.

    This method expects normalized [JSON API](http://jsonapi.org/) document. This means you have to follow [JSON API specification](http://jsonapi.org/format/) with few minor adjustments:
    - record's `type` should always be in singular, dasherized form
    - members (properties) should be camelCased

    [Your primary data should be wrapped inside `data` property](http://jsonapi.org/format/#document-top-level):

    ```js
    store.push({
      data: {
        // primary data for single record of type `Person`
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Daniel',
          lastName: 'Kmak'
        }
      }
    });
    ```

    [Demo.](http://ember-twiddle.com/fb99f18cd3b4d3e2a4c7)

    `data` property can also hold an array (of records):

    ```js
    store.push({
      data: [
        // an array of records
        {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Daniel',
            lastName: 'Kmak'
          }
        },
        {
          id: '2',
          type: 'person',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale'
          }
        }
      ]
    });
    ```

    [Demo.](http://ember-twiddle.com/69cdbeaa3702159dc355)

    There are some typical properties for `JSONAPI` payload:
    * `id` - mandatory, unique record's key
    * `type` - mandatory string which matches `model`'s dasherized name in singular form
    * `attributes` - object which holds data for record attributes - `attr`'s declared in model
    * `relationships` - object which must contain any of the following properties under each relationships' respective key (example path is `relationships.achievements.data`):
      - [`links`](http://jsonapi.org/format/#document-links)
      - [`data`](http://jsonapi.org/format/#document-resource-object-linkage) - place for primary data
      - [`meta`](http://jsonapi.org/format/#document-meta) - object which contains meta-information about relationship

    For this model:

    ```app/models/person.js
    import Model, { attr, hasMany } from '@ember-data/model';

    export default class PersonRoute extends Route {
      @attr('string') firstName;
      @attr('string') lastName;

      @hasMany('person') children;
    }
    ```

    To represent the children as IDs:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            data: [
              {
                id: '2',
                type: 'person'
              },
              {
                id: '3',
                type: 'person'
              },
              {
                id: '4',
                type: 'person'
              }
            ]
          }
        }
      }
    }
    ```

    [Demo.](http://ember-twiddle.com/343e1735e034091f5bde)

    To represent the children relationship as a URL:

    ```js
    {
      data: {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          children: {
            links: {
              related: '/people/1/children'
            }
          }
        }
      }
    }
    ```

    If you're streaming data or implementing an adapter, make sure
    that you have converted the incoming data into this form. The
    store's [normalize](../methods/normalize?anchor=normalize) method is a convenience
    helper for converting a json payload into the form Ember Data
    expects.

    ```js
    store.push(store.normalize('person', data));
    ```

    This method can be used both to push in brand new
    records, as well as to update existing records.

    @method push
    @public
    @param {Object} data
    @return the record(s) that was created or
      updated.
  */
  push(data: EmptyResourceDocument): null;
  push(data: SingleResourceDocument): RecordInstance;
  push(data: CollectionResourceDocument): RecordInstance[];
  push(data: JsonApiDocument): RecordInstance | RecordInstance[] | null {
    if (DEBUG) {
      assertDestroyingStore(this, 'push');
    }
    let pushed = this._push(data);

    if (Array.isArray(pushed)) {
      let records = pushed.map((internalModel) => internalModel.getRecord());
      return records;
    }

    if (pushed === null) {
      return null;
    }

    let record = pushed.getRecord();
    return record;
  }

  /**
    Push some data in the form of a json-api document into the store,
    without creating materialized records.

    @method _push
    @private
    @param {Object} jsonApiDoc
    @return {InternalModel|Array<InternalModel>} pushed InternalModel(s)
  */
  _push(jsonApiDoc): InternalModel | InternalModel[] | null {
    if (DEBUG) {
      assertDestroyingStore(this, '_push');
    }
    let internalModelOrModels = this._backburner.join(() => {
      let included = jsonApiDoc.included;
      let i, length;

      if (included) {
        for (i = 0, length = included.length; i < length; i++) {
          this._pushInternalModel(included[i]);
        }
      }

      if (Array.isArray(jsonApiDoc.data)) {
        length = jsonApiDoc.data.length;
        let internalModels = new Array(length);

        for (i = 0; i < length; i++) {
          internalModels[i] = this._pushInternalModel(jsonApiDoc.data[i]);
        }
        return internalModels;
      }

      if (jsonApiDoc.data === null) {
        return null;
      }

      assert(
        `Expected an object in the 'data' property in a call to 'push' for ${jsonApiDoc.type}, but was ${typeOf(
          jsonApiDoc.data
        )}`,
        typeOf(jsonApiDoc.data) === 'object'
      );

      return this._pushInternalModel(jsonApiDoc.data);
    });

    // this typecast is necessary because `backburner.join` is mistyped to return void
    return internalModelOrModels as unknown as InternalModel | InternalModel[];
  }

  _pushInternalModel(data) {
    let modelName = data.type;
    assert(
      `You must include an 'id' for ${modelName} in an object passed to 'push'`,
      data.id !== null && data.id !== undefined && data.id !== ''
    );
    assert(
      `You tried to push data with a type '${modelName}' but no model could be found with that name.`,
      this._hasModelFor(modelName)
    );

    if (DEBUG) {
      // If ENV.DS_WARN_ON_UNKNOWN_KEYS is set to true and the payload
      // contains unknown attributes or relationships, log a warning.

      if (ENV.DS_WARN_ON_UNKNOWN_KEYS) {
        let unknownAttributes, unknownRelationships;
        if (CUSTOM_MODEL_CLASS) {
          let relationships = this.getSchemaDefinitionService().relationshipsDefinitionFor(modelName);
          let attributes = this.getSchemaDefinitionService().attributesDefinitionFor(modelName);
          // Check unknown attributes
          unknownAttributes = Object.keys(data.attributes || {}).filter((key) => {
            return !attributes[key];
          });

          // Check unknown relationships
          unknownRelationships = Object.keys(data.relationships || {}).filter((key) => {
            return !relationships[key];
          });
        } else {
          let modelClass = this.modelFor(modelName);
          // Check unknown attributes
          unknownAttributes = Object.keys(data.attributes || {}).filter((key) => {
            return !get(modelClass, 'fields').has(key);
          });

          // Check unknown relationships
          unknownRelationships = Object.keys(data.relationships || {}).filter((key) => {
            return !get(modelClass, 'fields').has(key);
          });
        }
        let unknownAttributesMessage = `The payload for '${modelName}' contains these unknown attributes: ${unknownAttributes}. Make sure they've been defined in your model.`;
        warn(unknownAttributesMessage, unknownAttributes.length === 0, {
          id: 'ds.store.unknown-keys-in-payload',
        });

        let unknownRelationshipsMessage = `The payload for '${modelName}' contains these unknown relationships: ${unknownRelationships}. Make sure they've been defined in your model.`;
        warn(unknownRelationshipsMessage, unknownRelationships.length === 0, {
          id: 'ds.store.unknown-keys-in-payload',
        });
      }
    }

    // Actually load the record into the store.
    let internalModel = this._load(data);

    //    this._setupRelationshipsForModel(internalModel, data);

    return internalModel;
  }

  /**
    Push some raw data into the store.

    This method can be used both to push in brand new
    records, as well as to update existing records. You
    can push in more than one type of object at once.
    All objects should be in the format expected by the
    serializer.

    ```app/serializers/application.js
    import RESTSerializer from '@ember-data/serializer/rest';

    export default class ApplicationSerializer extends RESTSerializer;
    ```

    ```js
    let pushData = {
      posts: [
        { id: 1, postTitle: "Great post", commentIds: [2] }
      ],
      comments: [
        { id: 2, commentBody: "Insightful comment" }
      ]
    }

    store.pushPayload(pushData);
    ```

    By default, the data will be deserialized using a default
    serializer (the application serializer if it exists).

    Alternatively, `pushPayload` will accept a model type which
    will determine which serializer will process the payload.

    ```app/serializers/application.js
    import RESTSerializer from '@ember-data/serializer/rest';

     export default class ApplicationSerializer extends RESTSerializer;
    ```

    ```app/serializers/post.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default JSONSerializer;
    ```

    ```js
    store.pushPayload(pushData); // Will use the application serializer
    store.pushPayload('post', pushData); // Will use the post serializer
    ```

    @method pushPayload
    @public
    @param {String} modelName Optionally, a model type used to determine which serializer will be used
    @param {Object} inputPayload
  */
  pushPayload(modelName, inputPayload) {
    if (DEBUG) {
      assertDestroyingStore(this, 'pushPayload');
    }
    let serializer;
    let payload;
    if (!inputPayload) {
      payload = modelName;
      serializer = this.serializerFor('application');
      assert(
        `You cannot use 'store#pushPayload' without a modelName unless your default serializer defines 'pushPayload'`,
        typeof serializer.pushPayload === 'function'
      );
    } else {
      payload = inputPayload;
      assert(
        `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`,
        typeof modelName === 'string'
      );
      let normalizedModelName = normalizeModelName(modelName);
      serializer = this.serializerFor(normalizedModelName);
    }
    assert(
      `You must define a pushPayload method in your serializer in order to call store.pushPayload`,
      serializer.pushPayload
    );
    serializer.pushPayload(this, payload);
  }

  reloadManyArray(manyArray, internalModel, key, options) {
    return internalModel.reloadHasMany(key, options);
  }

  reloadBelongsTo(belongsToProxy, internalModel, key, options) {
    return internalModel.reloadBelongsTo(key, options);
  }

  _internalModelForResource(resource: ResourceIdentifierObject): InternalModel {
    return internalModelFactoryFor(this).getByResource(resource);
  }

  /**
   * TODO Only needed temporarily for test support
   *
   * @method _internalModelForId
   * @internal
   */
  _internalModelForId(type: string, id: string | null, lid: string | null): InternalModel {
    const resource = constructResource(type, id, lid);
    return internalModelFactoryFor(this).lookup(resource);
  }

  serializeRecord(record: RecordInstance, options?: Dict<unknown>): unknown {
    if (CUSTOM_MODEL_CLASS) {
      let identifier = recordIdentifierFor(record);
      let internalModel = internalModelFactoryFor(this).peek(identifier);
      // TODO we used to check if the record was destroyed here
      return internalModel!.createSnapshot(options).serialize(options);
    }

    assert('serializeRecord is only available when CUSTOM_MODEL_CLASS ff is on', false);
  }

  saveRecord(record: RecordInstance, options?: Dict<unknown>): RSVP.Promise<RecordInstance> {
    if (CUSTOM_MODEL_CLASS) {
      let identifier = recordIdentifierFor(record);
      let internalModel = internalModelFactoryFor(this).peek(identifier);
      // TODO we used to check if the record was destroyed here
      // Casting can be removed once REQUEST_SERVICE ff is turned on
      // because a `Record` is provided there will always be a matching internalModel
      return (internalModel!.save(options) as RSVP.Promise<void>).then(() => record);
    }

    assert('saveRecord is only available when CUSTOM_MODEL_CLASS ff is on');
  }

  relationshipReferenceFor(identifier: RecordIdentifier, key: string): BelongsToReference | HasManyReference {
    if (CUSTOM_MODEL_CLASS) {
      let stableIdentifier = identifierCacheFor(this).getOrCreateRecordIdentifier(identifier);
      let internalModel = internalModelFactoryFor(this).peek(stableIdentifier);
      // TODO we used to check if the record was destroyed here
      return internalModel!.referenceFor(null, key);
    }

    assert('relationshipReferenceFor is only available when CUSTOM_MODEL_CLASS ff is on', false);
  }

  /**
   * Manages setting setting up the recordData returned by createRecordDataFor
   *
   * @method _createRecordData
   * @internal
   */
  _createRecordData(identifier: StableRecordIdentifier): RecordData {
    const recordData = this.createRecordDataFor(identifier.type, identifier.id, identifier.lid, this._storeWrapper);
    setRecordDataFor(identifier, recordData);
    // TODO this is invalid for v2 recordData but required
    // for v1 recordData. Remember to remove this once the
    // RecordData manager handles converting recordData to identifier
    setRecordIdentifier(recordData, identifier);
    return recordData;
  }

  /**
   * Instantiation hook allowing applications or addons to configure the store
   * to utilize a custom RecordData implementation.
   *
   * @method createRecordDataFor
   * @public
   * @param modelName
   * @param id
   * @param clientId
   * @param storeWrapper
   */
  createRecordDataFor(
    modelName: string,
    id: string | null,
    clientId: string,
    storeWrapper: RecordDataStoreWrapper
  ): RecordData {
    if (HAS_RECORD_DATA_PACKAGE) {
      // we can't greedily use require as this causes
      // a cycle we can't easily fix (or clearly pin point) at present.
      //
      // it can be reproduced in partner tests by running
      // node ./scripts/packages-for-commit.js && yarn test-external:ember-observer
      if (_RecordData === undefined) {
        _RecordData = require('@ember-data/record-data/-private').RecordData as RecordDataConstruct;
      }

      let identifier = identifierCacheFor(this).getOrCreateRecordIdentifier({
        type: modelName,
        id,
        lid: clientId,
      });
      return new _RecordData(identifier, storeWrapper);
    }

    assert(`Expected store.createRecordDataFor to be implemented but it wasn't`);
  }

  /**
   * @internal
   */
  __recordDataFor(resource: RecordIdentifier) {
    const identifier = identifierCacheFor(this).getOrCreateRecordIdentifier(resource);
    return this.recordDataFor(identifier, false);
  }

  /**
   * @internal
   */
  recordDataFor(identifier: StableRecordIdentifier | { type: string }, isCreate: boolean): RecordData {
    let internalModel: InternalModel;
    if (isCreate === true) {
      internalModel = internalModelFactoryFor(this).build({ type: identifier.type, id: null });
      internalModel.send('loadedData');
      internalModel.didCreateRecord();
    } else {
      internalModel = internalModelFactoryFor(this).lookup(identifier as StableRecordIdentifier);
    }

    return internalModel._recordData;
  }

  /**
    `normalize` converts a json payload into the normalized form that
    [push](../methods/push?anchor=push) expects.

    Example

    ```js
    socket.on('message', function(message) {
      let modelName = message.model;
      let data = message.data;
      store.push(store.normalize(modelName, data));
    });
    ```

    @method normalize
    @public
    @param {String} modelName The name of the model type for this payload
    @param {Object} payload
    @return {Object} The normalized payload
  */
  normalize(modelName, payload) {
    if (DEBUG) {
      assertDestroyingStore(this, 'normalize');
    }
    assert(`You need to pass a model name to the store's normalize method`, isPresent(modelName));
    assert(
      `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${inspect(
        modelName
      )}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);
    let serializer = this.serializerFor(normalizedModelName);
    let model = this.modelFor(normalizedModelName);
    assert(
      `You must define a normalize method in your serializer in order to call store.normalize`,
      serializer.normalize
    );
    return serializer.normalize(model, payload);
  }

  newClientId() {
    assert(`Private API Removed`, false);
  }

  // ...............
  // . DESTRUCTION .
  // ...............

  /**
   * TODO remove test usage
   *
   * @internal
   */
  _internalModelsFor(modelName: string) {
    return internalModelFactoryFor(this).modelMapFor(modelName);
  }

  // ......................
  // . PER-TYPE ADAPTERS
  // ......................

  /**
    Returns an instance of the adapter for a given type. For
    example, `adapterFor('person')` will return an instance of
    `App.PersonAdapter`.

    If no `App.PersonAdapter` is found, this method will look
    for an `App.ApplicationAdapter` (the default adapter for
    your entire application).

    If no `App.ApplicationAdapter` is found, it will return
    the value of the `defaultAdapter`.

    @method adapterFor
    @public
    @param {String} modelName
    @return Adapter
  */
  adapterFor(modelName) {
    if (DEBUG) {
      assertDestroyingStore(this, 'adapterFor');
    }
    assert(`You need to pass a model name to the store's adapterFor method`, isPresent(modelName));
    assert(
      `Passing classes to store.adapterFor has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);

    let { _adapterCache } = this;
    let adapter = _adapterCache[normalizedModelName];
    if (adapter) {
      return adapter;
    }

    let owner = getOwner(this);

    adapter = owner.lookup(`adapter:${normalizedModelName}`);

    // in production this is handled by the re-export
    if (DEBUG && HAS_EMBER_DATA_PACKAGE && HAS_ADAPTER_PACKAGE && adapter === undefined) {
      if (normalizedModelName === '-json-api') {
        const Adapter = require('@ember-data/adapter/json-api').default;
        owner.register(`adapter:-json-api`, Adapter);
        adapter = owner.lookup(`adapter:-json-api`);
        deprecateTestRegistration('adapter', '-json-api');
      }
    }

    if (adapter !== undefined) {
      set(adapter, 'store', this);
      _adapterCache[normalizedModelName] = adapter;
      return adapter;
    }

    // no adapter found for the specific model, fallback and check for application adapter
    adapter = _adapterCache.application || owner.lookup('adapter:application');
    if (adapter !== undefined) {
      set(adapter, 'store', this);
      _adapterCache[normalizedModelName] = adapter;
      _adapterCache.application = adapter;
      return adapter;
    }

    // no model specific adapter or application adapter, check for an `adapter`
    // property defined on the store
    let adapterName = this.adapter || '-json-api';
    adapter = adapterName ? _adapterCache[adapterName] || owner.lookup(`adapter:${adapterName}`) : undefined;

    // in production this is handled by the re-export
    if (DEBUG && HAS_EMBER_DATA_PACKAGE && HAS_ADAPTER_PACKAGE && adapter === undefined) {
      if (adapterName === '-json-api') {
        const Adapter = require('@ember-data/adapter/json-api').default;
        owner.register(`adapter:-json-api`, Adapter);
        adapter = owner.lookup(`adapter:-json-api`);
        deprecateTestRegistration('adapter', '-json-api');
      }
    }

    if (adapter !== undefined) {
      set(adapter, 'store', this);
      _adapterCache[normalizedModelName] = adapter;
      _adapterCache[adapterName] = adapter;
      return adapter;
    }

    // final fallback, no model specific adapter, no application adapter, no
    // `adapter` property on store: use json-api adapter
    adapter = _adapterCache['-json-api'] || owner.lookup('adapter:-json-api');
    assert(
      `No adapter was found for '${modelName}' and no 'application' adapter was found as a fallback.`,
      adapter !== undefined
    );
    set(adapter, 'store', this);
    _adapterCache[normalizedModelName] = adapter;
    _adapterCache['-json-api'] = adapter;
    return adapter;
  }

  // ..............................
  // . RECORD CHANGE NOTIFICATION .
  // ..............................

  /**
    Returns an instance of the serializer for a given type. For
    example, `serializerFor('person')` will return an instance of
    `App.PersonSerializer`.

    If no `App.PersonSerializer` is found, this method will look
    for an `App.ApplicationSerializer` (the default serializer for
    your entire application).

    if no `App.ApplicationSerializer` is found, it will attempt
    to get the `defaultSerializer` from the `PersonAdapter`
    (`adapterFor('person')`).

    If a serializer cannot be found on the adapter, it will fall back
    to an instance of `JSONSerializer`.

    @method serializerFor
    @public
    @param {String} modelName the record to serialize
    @return {Serializer}
  */
  serializerFor(modelName) {
    if (DEBUG) {
      assertDestroyingStore(this, 'serializerFor');
    }
    assert(`You need to pass a model name to the store's serializerFor method`, isPresent(modelName));
    assert(
      `Passing classes to store.serializerFor has been removed. Please pass a dasherized string instead of ${modelName}`,
      typeof modelName === 'string'
    );
    let normalizedModelName = normalizeModelName(modelName);

    let { _serializerCache } = this;
    let serializer = _serializerCache[normalizedModelName];
    if (serializer) {
      return serializer;
    }

    let owner = getOwner(this);

    serializer = owner.lookup(`serializer:${normalizedModelName}`);

    if (DEPRECATE_LEGACY_TEST_REGISTRATIONS) {
      // in production this is handled by the re-export
      if (DEBUG && HAS_EMBER_DATA_PACKAGE && HAS_SERIALIZER_PACKAGE && serializer === undefined) {
        if (normalizedModelName === '-json-api') {
          const Serializer = require('@ember-data/serializer/json-api').default;
          owner.register(`serializer:-json-api`, Serializer);
          serializer = owner.lookup(`serializer:-json-api`);
          deprecateTestRegistration('serializer', '-json-api');
        } else if (normalizedModelName === '-rest') {
          const Serializer = require('@ember-data/serializer/rest').default;
          owner.register(`serializer:-rest`, Serializer);
          serializer = owner.lookup(`serializer:-rest`);
          deprecateTestRegistration('serializer', '-rest');
        } else if (normalizedModelName === '-default') {
          const Serializer = require('@ember-data/serializer/json').default;
          owner.register(`serializer:-default`, Serializer);
          serializer = owner.lookup(`serializer:-default`);
          serializer && deprecateTestRegistration('serializer', '-default');
        }
      }
    }

    if (serializer !== undefined) {
      set(serializer, 'store', this);
      _serializerCache[normalizedModelName] = serializer;
      return serializer;
    }

    // no serializer found for the specific model, fallback and check for application serializer
    serializer = _serializerCache.application || owner.lookup('serializer:application');
    if (serializer !== undefined) {
      set(serializer, 'store', this);
      _serializerCache[normalizedModelName] = serializer;
      _serializerCache.application = serializer;
      return serializer;
    }

    let serializerName;
    if (DEPRECATE_DEFAULT_SERIALIZER) {
      // no model specific serializer or application serializer, check for the `defaultSerializer`
      // property defined on the adapter
      let adapter = this.adapterFor(modelName);
      serializerName = get(adapter, 'defaultSerializer');

      deprecate(
        `store.serializerFor("${modelName}") resolved the "${serializerName}" serializer via the deprecated \`adapter.defaultSerializer\` property.\n\n\tPreviously, if no application or type-specific serializer was specified, the store would attempt to lookup a serializer via the \`defaultSerializer\` property on the type's adapter. This behavior is deprecated in favor of explicitly defining a type-specific serializer or application serializer`,
        !serializerName,
        {
          id: 'ember-data:default-serializer',
          until: '4.0',
          url: 'https://deprecations.emberjs.com/ember-data/v3.x/#toc_ember-data-default-serializers',
          for: '@ember-data/store',
          since: {
            available: '3.15',
            enabled: '3.15',
          },
        }
      );

      serializer = serializerName
        ? _serializerCache[serializerName] || owner.lookup(`serializer:${serializerName}`)
        : undefined;
    }

    if (DEPRECATE_LEGACY_TEST_REGISTRATIONS) {
      // in production this is handled by the re-export
      if (DEBUG && HAS_EMBER_DATA_PACKAGE && HAS_SERIALIZER_PACKAGE && serializer === undefined) {
        if (serializerName === '-json-api') {
          const Serializer = require('@ember-data/serializer/json-api').default;
          owner.register(`serializer:-json-api`, Serializer);
          serializer = owner.lookup(`serializer:-json-api`);
          deprecateTestRegistration('serializer', '-json-api');
        } else if (serializerName === '-rest') {
          const Serializer = require('@ember-data/serializer/rest').default;
          owner.register(`serializer:-rest`, Serializer);
          serializer = owner.lookup(`serializer:-rest`);
          deprecateTestRegistration('serializer', '-rest');
        } else if (serializerName === '-default') {
          const Serializer = require('@ember-data/serializer/json').default;
          owner.register(`serializer:-default`, Serializer);
          serializer = owner.lookup(`serializer:-default`);
          serializer && deprecateTestRegistration('serializer', '-default');
        }
      }

      if (serializer !== undefined) {
        set(serializer, 'store', this);
        _serializerCache[normalizedModelName] = serializer;
        _serializerCache[serializerName] = serializer;
        return serializer;
      }
    }

    if (DEPRECATE_DEFAULT_SERIALIZER) {
      // final fallback, no model specific serializer, no application serializer, no
      // `serializer` property on store: use the convenience JSONSerializer
      serializer = _serializerCache['-default'] || owner.lookup('serializer:-default');
      if (DEBUG && HAS_EMBER_DATA_PACKAGE && HAS_SERIALIZER_PACKAGE && serializer === undefined) {
        const JSONSerializer = require('@ember-data/serializer/json').default;
        owner.register('serializer:-default', JSONSerializer);
        serializer = owner.lookup('serializer:-default');

        serializer && deprecateTestRegistration('serializer', '-default');
      }

      deprecate(
        `store.serializerFor("${modelName}") resolved the "-default" serializer via the deprecated "-default" lookup fallback.\n\n\tPreviously, when no type-specific serializer, application serializer, or adapter.defaultSerializer had been defined by the app, the "-default" serializer would be used which defaulted to the \`JSONSerializer\`. This behavior is deprecated in favor of explicitly defining an application or type-specific serializer`,
        !serializer,
        {
          id: 'ember-data:default-serializer',
          until: '4.0',
          url: 'https://deprecations.emberjs.com/ember-data/v3.x/#toc_ember-data-default-serializers',
          for: '@ember-data/store',
          since: {
            available: '3.15',
            enabled: '3.15',
          },
        }
      );

      assert(
        `No serializer was found for '${modelName}' and no 'application' serializer was found as a fallback`,
        serializer !== undefined
      );

      set(serializer, 'store', this);
      _serializerCache[normalizedModelName] = serializer;
      _serializerCache['-default'] = serializer;

      return serializer;
    } else {
      assert(
        `No serializer was found for '${modelName}' and no 'application' serializer was found as a fallback`,
        serializer !== undefined
      );
    }
  }

  destroy() {
    // enqueue destruction of any adapters/serializers we have created
    for (let adapterName in this._adapterCache) {
      let adapter = this._adapterCache[adapterName];
      if (typeof adapter.destroy === 'function') {
        adapter.destroy();
      }
    }

    for (let serializerName in this._serializerCache) {
      let serializer = this._serializerCache[serializerName];
      if (typeof serializer.destroy === 'function') {
        serializer.destroy();
      }
    }

    if (HAS_RECORD_DATA_PACKAGE) {
      const peekGraph = require('@ember-data/record-data/-private').peekGraph;
      let graph = peekGraph(this);
      if (graph) {
        graph.destroy();
      }
    }

    return super.destroy();
  }

  willDestroy() {
    super.willDestroy();
    this.recordArrayManager.destroy();

    identifierCacheFor(this).destroy();

    // destroy the graph before unloadAll
    // since then we avoid churning relationships
    // during unload
    if (HAS_RECORD_DATA_PACKAGE) {
      const peekGraph = require('@ember-data/record-data/-private').peekGraph;
      let graph = peekGraph(this);
      if (graph) {
        graph.willDestroy();
      }
    }

    this.unloadAll();

    if (DEBUG) {
      unregisterWaiter(this.__asyncWaiter);
      let shouldTrack = this.shouldTrackAsyncRequests;
      let tracked = this._trackedAsyncRequests;
      let isSettled = tracked.length === 0;

      if (!isSettled) {
        if (shouldTrack) {
          throw new Error(
            'Async Request leaks detected. Add a breakpoint here and set `store.generateStackTracesForTrackedRequests = true;`to inspect traces for leak origins:\n\t - ' +
              tracked.map((o) => o.label).join('\n\t - ')
          );
        } else {
          warn(
            'Async Request leaks detected. Add a breakpoint here and set `store.generateStackTracesForTrackedRequests = true;`to inspect traces for leak origins:\n\t - ' +
              tracked.map((o) => o.label).join('\n\t - '),
            false,
            {
              id: 'ds.async.leak.detected',
            }
          );
        }
      }
    }
  }

  _updateInternalModel(internalModel: InternalModel) {
    if (this._updatedInternalModels.push(internalModel) !== 1) {
      return;
    }

    emberBackburner.schedule('actions', this, this._flushUpdatedInternalModels);
  }

  _flushUpdatedInternalModels() {
    let updated = this._updatedInternalModels;

    for (let i = 0, l = updated.length; i < l; i++) {
      updated[i]._triggerDeferredTriggers();
    }

    updated.length = 0;
  }
}

if (DEPRECATE_DEFAULT_ADAPTER) {
  defineProperty(
    CoreStore.prototype,
    'defaultAdapter',
    computed('adapter', function () {
      deprecate(
        `store.adapterFor(modelName) resolved the ("${
          this.adapter || '-json-api'
        }") adapter via the deprecated \`store.defaultAdapter\` property.\n\n\tPreviously, applications could define the store's \`adapter\` property which would be used by \`defaultAdapter\` and \`adapterFor\` as a fallback for when an adapter was not found by an exact name match. This behavior is deprecated in favor of explicitly defining an application or type-specific adapter.`,
        false,
        {
          id: 'ember-data:default-adapter',
          until: '4.0',
          url: 'https://deprecations.emberjs.com/ember-data/v3.x/#toc_ember-data-default-adapter',
          for: '@ember-data/store',
          since: {
            available: '3.15',
            enabled: '3.15',
          },
        }
      );
      let adapter = this.adapter || '-json-api';

      assert(
        'You tried to set `adapter` property to an instance of `Adapter`, where it should be a name',
        typeof adapter === 'string'
      );

      return this.adapterFor(adapter);
    })
  );
}

export default CoreStore;

function _commit(adapter, store, operation, snapshot) {
  let internalModel = snapshot._internalModel;
  let modelName = snapshot.modelName;
  let modelClass = store.modelFor(modelName);
  assert(`You tried to update a record but you have no adapter (for ${modelName})`, adapter);
  assert(
    `You tried to update a record but your adapter (for ${modelName}) does not implement '${operation}'`,
    typeof adapter[operation] === 'function'
  );

  let promise = Promise.resolve().then(() => adapter[operation](store, modelClass, snapshot));
  let serializer = store.serializerFor(modelName);
  let label = `DS: Extract and notify about ${operation} completion of ${internalModel}`;

  promise = guardDestroyedStore(promise, store, label);
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(
    (adapterPayload) => {
      /*
      Note to future spelunkers hoping to optimize.
      We rely on this `run` to create a run loop if needed
      that `store._push` and `store.didSaveRecord` will both share.

      We use `join` because it is often the case that we
      have an outer run loop available still from the first
      call to `store._push`;
     */
      store._backburner.join(() => {
        let payload, data, sideloaded;
        if (adapterPayload) {
          payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, snapshot.id, operation);
          if (payload.included) {
            sideloaded = payload.included;
          }
          data = payload.data;
        }
        store.didSaveRecord(internalModel, { data }, operation);
        // seems risky, but if the tests pass might be fine?
        if (sideloaded) {
          store._push({ data: null, included: sideloaded });
        }
      });

      return internalModel;
    },
    function (error) {
      if (error && error.isAdapterError === true && error.code === 'InvalidError') {
        let parsedErrors;

        if (typeof serializer.extractErrors === 'function') {
          parsedErrors = serializer.extractErrors(store, modelClass, error, snapshot.id);
        } else {
          parsedErrors = errorsArrayToHash(error.errors);
        }

        store.recordWasInvalid(internalModel, parsedErrors, error);
      } else {
        store.recordWasError(internalModel, error);
      }

      throw error;
    },
    label
  );
}

let assertDestroyingStore: Function;
let assertDestroyedStoreOnly: Function;

if (DEBUG) {
  assertDestroyingStore = function assertDestroyedStore(store, method) {
    if (!store.shouldAssertMethodCallsOnDestroyedStore) {
      deprecate(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !(store.isDestroying || store.isDestroyed),
        {
          id: 'ember-data:method-calls-on-destroyed-store',
          until: '3.8',
          for: '@ember-data/store',
          since: {
            available: '3.8',
            enabled: '3.8',
          },
        }
      );
    } else {
      assert(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !(store.isDestroying || store.isDestroyed)
      );
    }
  };
  assertDestroyedStoreOnly = function assertDestroyedStoreOnly(store, method) {
    if (!store.shouldAssertMethodCallsOnDestroyedStore) {
      deprecate(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !store.isDestroyed,
        {
          id: 'ember-data:method-calls-on-destroyed-store',
          until: '3.8',
          for: '@ember-data/store',
          since: {
            available: '3.8',
            enabled: '3.8',
          },
        }
      );
    } else {
      assert(
        `Attempted to call store.${method}(), but the store instance has already been destroyed.`,
        !store.isDestroyed
      );
    }
  };
}

/**
 * Flag indicating whether all inverse records are available
 *
 * true if the inverse exists and is loaded (not empty)
 * true if there is no inverse
 * false if the inverse exists and is not loaded (empty)
 *
 * @internal
 * @return {boolean}
 */
function areAllInverseRecordsLoaded(store: CoreStore, resource: JsonApiRelationship): boolean {
  const cache = identifierCacheFor(store);

  if (Array.isArray(resource.data)) {
    // treat as collection
    // check for unloaded records
    let hasEmptyRecords = resource.data.reduce((hasEmptyModel, resourceIdentifier) => {
      return hasEmptyModel || internalModelForRelatedResource(store, cache, resourceIdentifier).currentState.isEmpty;
    }, false);

    return !hasEmptyRecords;
  } else {
    // treat as single resource
    if (!resource.data) {
      return true;
    } else {
      const internalModel = internalModelForRelatedResource(store, cache, resource.data);
      return !internalModel.currentState.isEmpty;
    }
  }
}

function internalModelForRelatedResource(
  store: CoreStore,
  cache: IdentifierCache,
  resource: ResourceIdentifierObject
): InternalModel {
  const identifier = cache.getOrCreateRecordIdentifier(resource);
  return store._internalModelForResource(identifier);
}

function isMaybeIdentifier(
  maybeIdentifier: string | ResourceIdentifierObject
): maybeIdentifier is ResourceIdentifierObject {
  return Boolean(
    maybeIdentifier !== null &&
      typeof maybeIdentifier === 'object' &&
      (('id' in maybeIdentifier && 'type' in maybeIdentifier && maybeIdentifier.id && maybeIdentifier.type) ||
        maybeIdentifier.lid)
  );
}

function assertIdentifierHasId(
  identifier: StableRecordIdentifier
): asserts identifier is StableExistingRecordIdentifier {
  assert(`Attempted to schedule a fetch for a record without an id.`, identifier.id !== null);
}
