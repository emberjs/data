/**
  @module @ember-data/model
 */

import { assert } from '@ember/debug';
import EmberObject from '@ember/object';

import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store';
import { recordIdentifierFor, storeFor } from '@ember-data/store';
import { coerceId } from '@ember-data/store/-private';
import { compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';
import type { AttributeSchema, RelationshipSchema } from '@warp-drive/core-types/schema';
import { RecordStore } from '@warp-drive/core-types/symbols';

import Errors from './errors';
import { LEGACY_SUPPORT } from './legacy-relationships-support';
import type { MinimalLegacyRecord } from './model-methods';
import {
  belongsTo,
  changedAttributes,
  createSnapshot,
  deleteRecord,
  destroyRecord,
  hasMany,
  reload,
  rollbackAttributes,
  save,
  serialize,
  unloadRecord,
} from './model-methods';
import notifyChanges from './notify-changes';
import RecordState, { notifySignal, tagged } from './record-state';

export type ModelCreateArgs = {
  _createProps: Record<string, unknown>;
  // TODO @deprecate consider deprecating accessing record properties during init which the below is necessary for
  _secretInit: {
    identifier: StableRecordIdentifier;
    cache: Cache;
    store: Store;
    cb: (record: Model, cache: Cache, identifier: StableRecordIdentifier, store: Store) => void;
  };
};

export type StaticModel = typeof Model & { create(options: ModelCreateArgs): Model };
export type ModelFactory = { class: StaticModel };
export type FactoryCache = Record<string, ModelFactory>;
// we put this on the store for interop because it's used by modelFor and
// instantiateRecord as well.
export type ModelStore = Store & { _modelFactoryCache: FactoryCache };

/*
 * This decorator allows us to lazily compute
 * an expensive getter on first-access and thereafter
 * never recompute it.
 */
function computeOnce(target: object, propertyName: string, desc: PropertyDescriptor) {
  const cache = new WeakMap<object, { hasComputed: boolean; value: unknown }>();
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = desc.get;
  desc.get = function () {
    let meta = cache.get(this);

    if (!meta) {
      meta = { hasComputed: false, value: undefined };
      cache.set(this, meta);
    }

    if (!meta.hasComputed) {
      meta.value = (getter as () => unknown).call(this);
      meta.hasComputed = true;
    }

    return meta.value;
  };
  return desc;
}

/**
  Base class from which Models can be defined.

  ```js
  import Model, { attr } from '@ember-data/model';

  export default class User extends Model {
    @attr name;
  }
  ```

  Models are used both to define the static schema for a
  particular resource type as well as the class to instantiate
  to present that data from cache.

  @class Model
  @public
  @extends Ember.EmberObject
*/
class Model extends EmberObject implements MinimalLegacyRecord {
  // set during create by the store
  declare store: Store;
  declare ___recordState: RecordState;
  declare ___private_notifications: object;
  declare _createProps: null;
  declare _secretInit: null;
  declare [RecordStore]: Store;

  override init(options: ModelCreateArgs) {
    if (DEBUG) {
      if (!options?._secretInit && !options?._createProps) {
        throw new Error(
          'You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.'
        );
      }
    }
    const createProps = options._createProps;
    const _secretInit = options._secretInit;
    (options as Record<string, unknown>)._createProps = null;
    (options as Record<string, unknown>)._secretInit = null;

    const store = (this.store = _secretInit.store);
    super.init(options);

    this[RecordStore] = store;

    const identity = _secretInit.identifier;
    _secretInit.cb(this, _secretInit.cache, identity, _secretInit.store);

    this.___recordState = DEBUG
      ? new RecordState(this as unknown as MinimalLegacyRecord)
      : (null as unknown as RecordState);

    this.setProperties(createProps);

    const notifications = store.notifications;
    this.___private_notifications = notifications.subscribe(
      identity,
      (identifier: StableRecordIdentifier, type: NotificationType, field?: string): void => {
        notifyChanges(identifier, type, field, this, store);
      }
    );
  }

  // @ts-expect-error destroy should not return a value
  override destroy() {
    const identifier = recordIdentifierFor(this);
    this.___recordState?.destroy();
    const store = storeFor(this)!;
    store.notifications.unsubscribe(this.___private_notifications);
    // Legacy behavior is to notify the relationships on destroy
    // such that they "clear". It's uncertain this behavior would
    // be good for a new model paradigm, likely cheaper and safer
    // to simply not notify, for this reason the store does not itself
    // notify individual changes once the delete has been signaled,
    // this decision is left to model instances.

    this.eachRelationship((name, meta) => {
      if (meta.kind === 'belongsTo') {
        this.notifyPropertyChange(name);
      }
    });
    LEGACY_SUPPORT.get(this as unknown as MinimalLegacyRecord)?.destroy();
    LEGACY_SUPPORT.delete(this as unknown as MinimalLegacyRecord);
    LEGACY_SUPPORT.delete(identifier);

    super.destroy();
  }

  /**
    If this property is `true` the record is in the `empty`
    state. Empty is the first state all records enter after they have
    been created. Most records created by the store will quickly
    transition to the `loading` state if data needs to be fetched from
    the server or the `created` state if the record is created on the
    client. A record can also enter the empty state if the adapter is
    unable to locate the record.

    @property isEmpty
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isEmpty(): boolean {
    return this.currentState.isEmpty;
  }

  /**
    If this property is `true` the record is in the `loading` state. A
    record enters this state when the store asks the adapter for its
    data. It remains in this state until the adapter provides the
    requested data.

    @property isLoading
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isLoading(): boolean {
    return this.currentState.isLoading;
  }

  /**
    If this property is `true` the record is in the `loaded` state. A
    record enters this state when its data is populated. Most of a
    record's lifecycle is spent inside substates of the `loaded`
    state.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.isLoaded; // true

    store.findRecord('model', 1).then(function(model) {
      model.isLoaded; // true
    });
    ```

    @property isLoaded
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isLoaded(): boolean {
    return this.currentState.isLoaded;
  }

  /**
    If this property is `true` the record is in the `dirty` state. The
    record has local changes that have not yet been saved by the
    adapter. This includes records that have been created (but not yet
    saved) or deleted.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.hasDirtyAttributes; // true

    store.findRecord('model', 1).then(function(model) {
      model.hasDirtyAttributes; // false
      model.set('foo', 'some value');
      model.hasDirtyAttributes; // true
    });
    ```

    @since 1.13.0
    @property hasDirtyAttributes
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get hasDirtyAttributes(): boolean {
    return this.currentState.isDirty;
  }

  /**
    If this property is `true` the record is in the `saving` state. A
    record enters the saving state when `save` is called, but the
    adapter has not yet acknowledged that the changes have been
    persisted to the backend.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.isSaving; // false
    let promise = record.save();
    record.isSaving; // true
    promise.then(function() {
      record.isSaving; // false
    });
    ```

    @property isSaving
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isSaving(): boolean {
    return this.currentState.isSaving;
  }

  /**
    If this property is `true` the record is in the `deleted` state
    and has been marked for deletion. When `isDeleted` is true and
    `hasDirtyAttributes` is true, the record is deleted locally but the deletion
    was not yet persisted. When `isSaving` is true, the change is
    in-flight. When both `hasDirtyAttributes` and `isSaving` are false, the
    change has persisted.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.isDeleted;    // false
    record.deleteRecord();

    // Locally deleted
    record.isDeleted;           // true
    record.hasDirtyAttributes;  // true
    record.isSaving;            // false

    // Persisting the deletion
    let promise = record.save();
    record.isDeleted;    // true
    record.isSaving;     // true

    // Deletion Persisted
    promise.then(function() {
      record.isDeleted;          // true
      record.isSaving;           // false
      record.hasDirtyAttributes; // false
    });
    ```

    @property isDeleted
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isDeleted(): boolean {
    return this.currentState.isDeleted;
  }

  /**
    If this property is `true` the record is in the `new` state. A
    record will be in the `new` state when it has been created on the
    client and the adapter has not yet report that it was successfully
    saved.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.isNew; // true

    record.save().then(function(model) {
      model.isNew; // false
    });
    ```

    @property isNew
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isNew(): boolean {
    return this.currentState.isNew;
  }

  /**
    If this property is `true` the record is in the `valid` state.

    A record will be in the `valid` state when the adapter did not report any
    server-side validation failures.

    @property isValid
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isValid(): boolean {
    return this.currentState.isValid;
  }

  /**
    If the record is in the dirty state this property will report what
    kind of change has caused it to move into the dirty
    state. Possible values are:

    - `created` The record has been created by the client and not yet saved to the adapter.
    - `updated` The record has been updated by the client and not yet saved to the adapter.
    - `deleted` The record has been deleted by the client and not yet saved to the adapter.

    Example

    ```javascript
    let record = store.createRecord('model');
    record.dirtyType; // 'created'
    ```

    @property dirtyType
    @public
    @type {String}
    @readOnly
  */
  @compat
  get dirtyType(): 'created' | 'updated' | 'deleted' | '' {
    return this.currentState.dirtyType;
  }

  /**
    If `true` the adapter reported that it was unable to save local
    changes to the backend for any reason other than a server-side
    validation error.

    Example

    ```javascript
    record.isError; // false
    record.set('foo', 'valid value');
    record.save().then(null, function() {
      record.isError; // true
    });
    ```

    @property isError
    @public
    @type {Boolean}
    @readOnly
  */
  @compat
  get isError(): boolean {
    return this.currentState.isError;
  }
  set isError(v) {
    if (DEBUG) {
      throw new Error(`isError is not directly settable`);
    }
  }

  /**
    If `true` the store is attempting to reload the record from the adapter.

    Example

    ```javascript
    record.isReloading; // false
    record.reload();
    record.isReloading; // true
    ```

    @property isReloading
    @public
    @type {Boolean}
    @readOnly
  */
  declare isReloading: boolean;

  /**
    All ember models have an id property. This is an identifier
    managed by an external source. These are always coerced to be
    strings before being used internally. Note when declaring the
    attributes for a model it is an error to declare an id
    attribute.

    ```javascript
    let record = store.createRecord('model');
    record.id; // null

    store.findRecord('model', 1).then(function(model) {
      model.id; // '1'
    });
    ```

    @property id
    @public
    @type {String}
  */
  @tagged
  get id(): string | null {
    // this guard exists, because some dev-only deprecation code
    // (addListener via validatePropertyInjections) invokes toString before the
    // object is real.
    if (DEBUG) {
      try {
        return recordIdentifierFor(this).id;
      } catch {
        return null;
      }
    }
    return recordIdentifierFor(this).id;
  }
  set id(id) {
    const normalizedId = coerceId(id);
    const identifier = recordIdentifierFor(this);
    const didChange = normalizedId !== identifier.id;
    assert(
      `Cannot set ${identifier.type} record's id to ${id}, because id is already ${identifier.id}`,
      !didChange || identifier.id === null
    );

    if (normalizedId !== null && didChange) {
      this.store._instanceCache.setRecordId(identifier, normalizedId);
      this.store.notifications.notify(identifier, 'identity');
    }
  }

  override toString() {
    return `<model::${(this.constructor as unknown as { modelName: string }).modelName}:${this.id}>`;
  }

  /**
    @property currentState
    @private
    @type {Object}
  */
  // TODO we can probably make this a computeOnce
  // we likely do not need to notify the currentState root anymore
  @tagged
  get currentState() {
    // descriptors are called with the wrong `this` context during mergeMixins
    // when using legacy/classic ember classes. Basically: lazy in prod and eager in dev.
    // so we do this to try to steer folks to the nicer "dont user currentState"
    // error.
    if (!DEBUG) {
      if (!this.___recordState) {
        this.___recordState = new RecordState(this as unknown as MinimalLegacyRecord);
      }
    }
    return this.___recordState;
  }
  set currentState(_v) {
    throw new Error('cannot set currentState');
  }

  /**
    The store service instance which created this record instance

   @property store
    @public
   */

  /**
    When the record is in the `invalid` state this object will contain
    any errors returned by the adapter. When present the errors hash
    contains keys corresponding to the invalid property names
    and values which are arrays of Javascript objects with two keys:

    - `message` A string containing the error message from the backend
    - `attribute` The name of the property associated with this error message

    ```javascript
    record.errors.length; // 0
    record.set('foo', 'invalid value');
    record.save().catch(function() {
      record.errors.foo;
      // [{message: 'foo should be a number.', attribute: 'foo'}]
    });
    ```

    The `errors` property is useful for displaying error messages to
    the user.

    ```handlebars
    <label>Username: <Input @value={{@model.username}} /> </label>
    {{#each @model.errors.username as |error|}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    <label>Email: <Input @value={{@model.email}} /> </label>
    {{#each @model.errors.email as |error|}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    ```


    You can also access the special `messages` property on the error
    object to get an array of all the error strings.

    ```handlebars
    {{#each @model.errors.messages as |message|}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property errors
    @public
    @type {Errors}
  */
  @computeOnce
  get errors(): Errors {
    const errors = (Errors as unknown as { create(obj: object): Errors }).create({ __record: this });
    this.currentState.updateInvalidErrors(errors);
    return errors;
  }

  /**
    This property holds the `AdapterError` object with which
    last adapter operation was rejected.

    @property adapterError
    @public
    @type {AdapterError}
  */
  @compat
  get adapterError() {
    return this.currentState.adapterError;
  }
  set adapterError(v) {
    throw new Error(`adapterError is not directly settable`);
  }

  /**
    Create a JSON representation of the record, using the serialization
    strategy of the store's adapter.

   `serialize` takes an optional hash as a parameter, currently
    supported options are:

   - `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @method serialize
    @public
    @param {Object} options
    @return {Object} an object whose values are primitive JSON values only
  */
  declare serialize: typeof serialize;

  /*
    We hook the default implementation to ensure
    our tagged properties are properly notified
    as well. We still super for everything because
    sync observers require a direct call occuring
    to trigger their flush. We wouldn't need to
    super in 4.0+ where sync observers are removed.
   */
  // @ts-expect-error no return is necessary
  override notifyPropertyChange(prop: string) {
    notifySignal(this, prop as keyof this & string);
    super.notifyPropertyChange(prop);
  }

  /**
    Marks the record as deleted but does not save it. You must call
    `save` afterwards if you want to persist it. You might use this
    method if you want to allow the user to still `rollbackAttributes()`
    after a delete was made.

    Example

    ```js
    import Component from '@glimmer/component';

    export default class extends Component {
      softDelete = () => {
        this.args.model.deleteRecord();
      }

      confirm = () => {
        this.args.model.save();
      }

      undo = () => {
        this.args.model.rollbackAttributes();
      }
    }
    ```

    @method deleteRecord
    @public
  */
  declare deleteRecord: typeof deleteRecord;

  /**
    Same as `deleteRecord`, but saves the record immediately.

    Example

    ```js
    import Component from '@glimmer/component';

    export default class extends Component {
      delete = () => {
        this.args.model.destroyRecord().then(function() {
          this.transitionToRoute('model.index');
        });
      }
    }
    ```

    If you pass an object on the `adapterOptions` property of the options
    argument it will be passed to your adapter via the snapshot

    ```js
    record.destroyRecord({ adapterOptions: { subscribe: false } });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default class PostAdapter extends MyCustomAdapter {
      deleteRecord(store, type, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    }
    ```

    @method destroyRecord
    @public
    @param {Object} options
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  declare destroyRecord: typeof destroyRecord;

  /**
    Unloads the record from the store. This will not send a delete request
    to your server, it just unloads the record from memory.

    @method unloadRecord
    @public
  */
  declare unloadRecord: typeof unloadRecord;

  /**
    Returns an object, whose keys are changed properties, and value is
    an [oldProp, newProp] array.

    The array represents the diff of the canonical state with the local state
    of the model. Note: if the model is created locally, the canonical state is
    empty since the adapter hasn't acknowledged the attributes yet:

    Example

    ```app/models/mascot.js
    import Model, { attr } from '@ember-data/model';

    export default class MascotModel extends Model {
      @attr('string') name;
      @attr('boolean', {
        defaultValue: false
      })
      isAdmin;
    }
    ```

    ```javascript
    let mascot = store.createRecord('mascot');

    mascot.changedAttributes(); // {}

    mascot.set('name', 'Tomster');
    mascot.changedAttributes(); // { name: [undefined, 'Tomster'] }

    mascot.set('isAdmin', true);
    mascot.changedAttributes(); // { isAdmin: [undefined, true], name: [undefined, 'Tomster'] }

    mascot.save().then(function() {
      mascot.changedAttributes(); // {}

      mascot.set('isAdmin', false);
      mascot.changedAttributes(); // { isAdmin: [true, false] }
    });
    ```

    @method changedAttributes
    @public
    @return {Object} an object, whose keys are changed properties,
      and value is an [oldProp, newProp] array.
  */
  declare changedAttributes: typeof changedAttributes;

  /**
    If the model `hasDirtyAttributes` this function will discard any unsaved
    changes. If the model `isNew` it will be removed from the store.

    Example

    ```javascript
    record.name; // 'Untitled Document'
    record.set('name', 'Doc 1');
    record.name; // 'Doc 1'
    record.rollbackAttributes();
    record.name; // 'Untitled Document'
    ```

    @since 1.13.0
    @method rollbackAttributes
    @public
  */
  declare rollbackAttributes: typeof rollbackAttributes;

  /**
    @method _createSnapshot
    @private
  */
  declare _createSnapshot: typeof createSnapshot;
  // TODO @deprecate in favor of a public API or examples of how to test successfully

  /**
    Save the record and persist any changes to the record to an
    external source via the adapter.

    Example

    ```javascript
    record.set('name', 'Tomster');
    record.save().then(function() {
      // Success callback
    }, function() {
      // Error callback
    });
    ```

   If you pass an object using the `adapterOptions` property of the options
   argument it will be passed to your adapter via the snapshot.

    ```js
    record.save({ adapterOptions: { subscribe: false } });
    ```

    ```app/adapters/post.js
    import MyCustomAdapter from './custom-adapter';

    export default class PostAdapter extends MyCustomAdapter {
      updateRecord(store, type, snapshot) {
        if (snapshot.adapterOptions.subscribe) {
          // ...
        }
        // ...
      }
    }
    ```

    @method save
    @public
    @param {Object} options
    @return {Promise} a promise that will be resolved when the adapter returns
    successfully or rejected if the adapter returns with an error.
  */
  declare save: typeof save;

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading.

    Example

    ```js
    import Component from '@glimmer/component';

    export default class extends Component {
      async reload = () => {
        await this.args.model.reload();
        // do something with the reloaded model
      }
    }
    ```

    @method reload
    @public
    @param {Object} options optional, may include `adapterOptions` hash which will be passed to adapter request

   @return {Promise} a promise that will be resolved with the record when the
    adapter returns successfully or rejected if the adapter returns
    with an error.
  */
  declare reload: typeof reload;

  attr() {
    assert(
      'The `attr` method is not available on Model, a Snapshot was probably expected. Are you passing a Model instead of a Snapshot to your serializer?',
      false
    );
  }

  /**
    Get the reference for the specified belongsTo relationship.

    For instance, given the following model

    ```app/models/blog-post.js
    import Model, { belongsTo } from '@ember-data/model';

    export default class BlogPost extends Model {
      @belongsTo('user', { async: true, inverse: null }) author;
    }
    ```

    Then the reference for the author relationship would be
    retrieved from a record instance like so:

    ```js
    blogPost.belongsTo('author');
    ```

    A `BelongsToReference` is a low-level API that allows access
    and manipulation of a belongsTo relationship.

    It is especially useful when you're dealing with `async` relationships
    as it allows synchronous access to the relationship data if loaded, as
    well as APIs for loading, reloading the data or accessing available
    information without triggering a load.

    It may also be useful when using `sync` relationships that need to be
    loaded/reloaded with more precise timing than marking the
    relationship as `async` and relying on autofetch would have allowed.

    However,keep in mind that marking a relationship as `async: false` will introduce
    bugs into your application if the data is not always guaranteed to be available
    by the time the relationship is accessed. Ergo, it is recommended when using this
    approach to utilize `links` for unloaded relationship state instead of identifiers.

    Reference APIs are entangled with the relationship's underlying state,
    thus any getters or cached properties that utilize these will properly
    invalidate if the relationship state changes.

    References are "stable", meaning that multiple calls to retrieve the reference
    for a given relationship will always return the same HasManyReference.

    @method belongsTo
    @public
    @param {String} name of the relationship
    @since 2.5.0
    @return {BelongsToReference} reference for this relationship
  */
  declare belongsTo: typeof belongsTo;

  /**
    Get the reference for the specified hasMany relationship.

    For instance, given the following model

    ```app/models/blog-post.js
    import Model, { hasMany } from '@ember-data/model';

    export default class BlogPost extends Model {
      @hasMany('comment', { async: true, inverse: null }) comments;
    }
    ```

    Then the reference for the comments relationship would be
    retrieved from a record instance like so:

    ```js
    blogPost.hasMany('comments');
    ```

    A `HasManyReference` is a low-level API that allows access
    and manipulation of a hasMany relationship.

    It is especially useful when you are dealing with `async` relationships
    as it allows synchronous access to the relationship data if loaded, as
    well as APIs for loading, reloading the data or accessing available
    information without triggering a load.

    It may also be useful when using `sync` relationships with `@ember-data/model`
    that need to be loaded/reloaded with more precise timing than marking the
    relationship as `async` and relying on autofetch would have allowed.

    However,keep in mind that marking a relationship as `async: false` will introduce
    bugs into your application if the data is not always guaranteed to be available
    by the time the relationship is accessed. Ergo, it is recommended when using this
    approach to utilize `links` for unloaded relationship state instead of identifiers.

    Reference APIs are entangled with the relationship's underlying state,
    thus any getters or cached properties that utilize these will properly
    invalidate if the relationship state changes.

    References are "stable", meaning that multiple calls to retrieve the reference
    for a given relationship will always return the same HasManyReference.

    @method hasMany
    @public
    @param {String} name of the relationship
    @since 2.5.0
    @return {HasManyReference} reference for this relationship
  */
  declare hasMany: typeof hasMany;

  /**
   Given a callback, iterates over each of the relationships in the model,
   invoking the callback with the name of each relationship and its relationship
   descriptor.


   The callback method you provide should have the following signature (all
   parameters are optional):

   ```javascript
   function(name, descriptor);
   ```

   - `name` the name of the current property in the iteration
   - `descriptor` the meta object that describes this relationship

   The relationship descriptor argument is an object with the following properties.

   - **name** <span class="type">String</span> the name of this relationship on the Model
   - **kind** <span class="type">String</span> "hasMany" or "belongsTo"
   - **options** <span class="type">Object</span> the original options hash passed when the relationship was declared
   - **parentType** <span class="type">Model</span> the type of the Model that owns this relationship
   - **type** <span class="type">String</span> the type name of the related Model

   Note that in addition to a callback, you can also pass an optional target
   object that will be set as `this` on the context.

   Example

   ```app/serializers/application.js
   import JSONSerializer from '@ember-data/serializer/json';

   export default class ApplicationSerializer extends JSONSerializer {
      serialize(record, options) {
      let json = {};

      record.eachRelationship(function(name, descriptor) {
        if (descriptor.kind === 'hasMany') {
          let serializedHasManyName = name.toUpperCase() + '_IDS';
          json[serializedHasManyName] = record.get(name).map(r => r.id);
        }
      });

      return json;
    }
  }
   ```

   @method eachRelationship
   @public
   @param {Function} callback the callback to invoke
   @param {any} binding the value to which the callback's `this` should be bound
   */
  eachRelationship<T>(
    callback: (
      this: NoInfer<T> | undefined,
      key: Exclude<keyof this & string, keyof Model & string>,
      meta: RelationshipSchema
    ) => void,
    binding?: T
  ): void {
    (this.constructor as typeof Model).eachRelationship<T, this>(callback, binding);
  }

  relationshipFor(name: string): RelationshipSchema | undefined {
    return (this.constructor as typeof Model).relationshipsByName.get(name);
  }

  inverseFor(name: string) {
    return (this.constructor as typeof Model).inverseFor(name, storeFor(this)!);
  }

  eachAttribute<T>(
    callback: (
      this: NoInfer<T> | undefined,
      key: Exclude<keyof this & string, keyof Model & string>,
      meta: AttributeSchema
    ) => void,
    binding?: T
  ): void {
    (this.constructor as typeof Model).eachAttribute<T, this>(callback, binding);
  }

  static isModel = true;

  /**
    Create should only ever be called by the store. To create an instance of a
    `Model` in a dirty state use `store.createRecord`.

   To create instances of `Model` in a clean state, use `store.push`

    @method create
    @private
    @static
  */

  /**
   Represents the model's class name as a string. This can be used to look up the model's class name through
   `Store`'s modelFor method.

   `modelName` is generated for you by EmberData. It will be a lowercased, dasherized string.
   For example:

   ```javascript
   store.modelFor('post').modelName; // 'post'
   store.modelFor('blog-post').modelName; // 'blog-post'
   ```

   The most common place you'll want to access `modelName` is in your serializer's `payloadKeyFromModelName` method. For example, to change payload
   keys to underscore (instead of dasherized), you might use the following code:

   ```javascript
   import RESTSerializer from '@ember-data/serializer/rest';
   import { underscore } from '<app-name>/utils/string-utils';

   export default const PostSerializer = RESTSerializer.extend({
     payloadKeyFromModelName(modelName) {
       return underscore(modelName);
     }
   });
   ```
   @property modelName
    @public
   @type String
   @readonly
   @static
  */
  static modelName: string = null as unknown as string;

  /*
   These class methods below provide relationship
   introspection abilities about relationships.

   A note about the computed properties contained here:

   **These properties are effectively sealed once called for the first time.**
   To avoid repeatedly doing expensive iteration over a model's fields, these
   values are computed once and then cached for the remainder of the runtime of
   your application.

   If your application needs to modify a class after its initial definition
   (for example, using `reopen()` to add additional attributes), make sure you
   do it before using your model with the store, which uses these properties
   extensively.
   */

  /**
   For a given relationship name, returns the model type of the relationship.

   For example, if you define a model like this:

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany('comment') comments;
   }
   ```

   Calling `store.modelFor('post').typeForRelationship('comments', store)` will return `Comment`.

   @method typeForRelationship
    @public
   @static
   @param {String} name the name of the relationship
   @param {store} store an instance of Store
   @return {Model} the type of the relationship, or undefined
   */
  static typeForRelationship(name: string, store: Store) {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const relationship = this.relationshipsByName.get(name);
    return relationship && store.modelFor(relationship.type);
  }

  @computeOnce
  static get inverseMap(): Record<string, RelationshipSchema | null> {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );
    return Object.create(null) as Record<string, RelationshipSchema | null>;
  }

  /**
   Find the relationship which is the inverse of the one asked for.

   For example, if you define models like this:

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
      @hasMany('message') comments;
    }
   ```

   ```app/models/message.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class MessageModel extends Model {
      @belongsTo('post') owner;
    }
   ```

   ``` js
   store.modelFor('post').inverseFor('comments', store) // { type: 'message', name: 'owner', kind: 'belongsTo' }
   store.modelFor('message').inverseFor('owner', store) // { type: 'post', name: 'comments', kind: 'hasMany' }
   ```

   @method inverseFor
    @public
   @static
   @param {String} name the name of the relationship
   @param {Store} store
   @return {Object} the inverse relationship, or null
   */
  static inverseFor(name: string, store: Store): RelationshipSchema | null {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );
    const inverseMap = this.inverseMap;
    if (inverseMap[name]) {
      return inverseMap[name];
    } else {
      const inverse = this._findInverseFor(name, store);
      inverseMap[name] = inverse;
      return inverse;
    }
  }

  //Calculate the inverse, ignoring the cache
  static _findInverseFor(name: string, store: Store): RelationshipSchema | null {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const relationship = this.relationshipsByName.get(name)!;
    assert(`No relationship named '${name}' on '${this.modelName}' exists.`, relationship);

    if (!relationship) {
      return null;
    }

    const { options } = relationship;
    assert(
      `Expected the relationship ${name} on ${this.modelName} to define an inverse.`,
      options.inverse === null || (typeof options.inverse === 'string' && options.inverse.length > 0)
    );

    if (options.inverse === null) {
      return null;
    }

    const schemaExists = store.schema.doesTypeExist(relationship.type);

    assert(
      `No associated schema found for '${relationship.type}' while calculating the inverse of ${name} on ${this.modelName}`,
      schemaExists
    );

    if (!schemaExists) {
      return null;
    }

    const inverseSchemas = store.schema.relationshipsDefinitionFor({ type: relationship.type });
    const inverseSchema = inverseSchemas[options.inverse];

    assert(`No inverse relationship found for '${name}' on '${this.modelName}'`, inverseSchema !== undefined);

    return inverseSchema || null;
  }

  /**
   The model's relationships as a map, keyed on the type of the
   relationship. The value of each entry is an array containing a descriptor
   for each relationship with that type, describing the name of the relationship
   as well as the type.

   For example, given the following model definition:

   ```app/models/blog.js
   import Model, { belongsTo, hasMany } from '@ember-data/model';

   export default class BlogModel extends Model {
      @hasMany('user') users;
      @belongsTo('user') owner;
      @hasMany('post') posts;
    }
   ```

   This computed property would return a map describing these
   relationships, like this:

   ```javascript
   import Blog from 'app/models/blog';
   import User from 'app/models/user';
   import Post from 'app/models/post';

   let relationships = Blog.relationships;
   relationships.user;
   //=> [ { name: 'users', kind: 'hasMany' },
   //     { name: 'owner', kind: 'belongsTo' } ]
   relationships.post;
   //=> [ { name: 'posts', kind: 'hasMany' } ]
   ```

   @property relationships
    @public
   @static
   @type Map
   @readOnly
   */

  @computeOnce
  static get relationships(): Map<string, RelationshipSchema[]> {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const map = new Map<string, RelationshipSchema[]>();
    const relationshipsByName = this.relationshipsByName;

    // Loop through each computed property on the class
    relationshipsByName.forEach((desc) => {
      const { type } = desc;

      if (!map.has(type)) {
        map.set(type, []);
      }

      map.get(type)!.push(desc);
    });

    return map;
  }

  /**
   A hash containing lists of the model's relationships, grouped
   by the relationship kind. For example, given a model with this
   definition:

   ```app/models/blog.js
   import Model, { belongsTo, hasMany } from '@ember-data/model';

   export default class BlogModel extends Model {
      @hasMany('user') users;
      @belongsTo('user') owner;

      @hasMany('post') posts;
    }
   ```

   This property would contain the following:

   ```javascript
   import Blog from 'app/models/blog';

   let relationshipNames = Blog.relationshipNames;
   relationshipNames.hasMany;
   //=> ['users', 'posts']
   relationshipNames.belongsTo;
   //=> ['owner']
   ```

   @property relationshipNames
    @public
   @static
   @type Object
   @readOnly
   */
  @computeOnce
  static get relationshipNames() {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );
    const names: { hasMany: string[]; belongsTo: string[] } = {
      hasMany: [],
      belongsTo: [],
    };

    this.eachComputedProperty((name, meta) => {
      if (isRelationshipSchema(meta)) {
        names[meta.kind].push(name);
      }
    });

    return names;
  }

  /**
   An array of types directly related to a model. Each type will be
   included once, regardless of the number of relationships it has with
   the model.

   For example, given a model with this definition:

   ```app/models/blog.js
   import Model, { belongsTo, hasMany } from '@ember-data/model';

   export default class BlogModel extends Model {
      @hasMany('user') users;
      @belongsTo('user') owner;

      @hasMany('post') posts;
    }
   ```

   This property would contain the following:

   ```javascript
   import Blog from 'app/models/blog';

   let relatedTypes = Blog.relatedTypes');
   //=> ['user', 'post']
   ```

   @property relatedTypes
   @public
   @static
   @type Array
   @readOnly
   */
  @computeOnce
  static get relatedTypes() {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const types: string[] = [];

    const rels = this.relationshipsObject;
    const relationships = Object.keys(rels);

    // create an array of the unique types involved
    // in relationships
    for (let i = 0; i < relationships.length; i++) {
      const name = relationships[i];
      const meta = rels[name];
      const modelName = meta.type;

      if (!types.includes(modelName)) {
        types.push(modelName);
      }
    }

    return types;
  }

  /**
   A map whose keys are the relationships of a model and whose values are
   relationship descriptors.

   For example, given a model with this
   definition:

   ```app/models/blog.js
   import Model, { belongsTo, hasMany } from '@ember-data/model';

   export default class BlogModel extends Model {
      @hasMany('user') users;
      @belongsTo('user') owner;

      @hasMany('post') posts;
    }
   ```

   This property would contain the following:

   ```javascript
   import Blog from 'app/models/blog';

   let relationshipsByName = Blog.relationshipsByName;
   relationshipsByName.users;
   //=> { name: 'users', kind: 'hasMany', type: 'user', options: Object }
   relationshipsByName.owner;
   //=> { name: 'owner', kind: 'belongsTo', type: 'user', options: Object }
   ```

   @property relationshipsByName
    @public
   @static
   @type Map
   @readOnly
   */
  @computeOnce
  static get relationshipsByName(): Map<string, RelationshipSchema> {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );
    const map = new Map();
    const rels = this.relationshipsObject;
    const relationships = Object.keys(rels);

    for (let i = 0; i < relationships.length; i++) {
      const name = relationships[i];
      const value = rels[name];

      map.set(value.name, value);
    }

    return map;
  }

  @computeOnce
  static get relationshipsObject(): Record<string, RelationshipSchema> {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const relationships = Object.create(null) as Record<string, RelationshipSchema>;
    const modelName = this.modelName;
    this.eachComputedProperty((name: string, meta: unknown) => {
      if (!isRelationshipSchema(meta)) {
        return;
      }
      // TODO deprecate key being here
      (meta as unknown as { key: string }).key = name;
      meta.name = name;
      (meta as unknown as { parentModelName: string }).parentModelName = modelName;
      relationships[name] = meta;

      assert(`Expected options in meta`, meta.options && typeof meta.options === 'object');
      assert(
        `You should not specify both options.as and options.inverse as null on ${modelName}.${meta.name}, as if there is no inverse field there is no abstract type to conform to. You may have intended for this relationship to be polymorphic, or you may have mistakenly set inverse to null.`,
        !(meta.options.inverse === null && meta.options.as?.length)
      );
    });
    return relationships;
  }

  /**
   A map whose keys are the fields of the model and whose values are strings
   describing the kind of the field. A model's fields are the union of all of its
   attributes and relationships.

   For example:

   ```app/models/blog.js
   import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

   export default class BlogModel extends Model {
      @hasMany('user') users;
      @belongsTo('user') owner;

      @hasMany('post') posts;

      @attr('string') title;
    }
   ```

   ```js
   import Blog from 'app/models/blog'

   let fields = Blog.fields;
   fields.forEach(function(kind, field) {
      // do thing
    });

   // prints:
   // users, hasMany
   // owner, belongsTo
   // posts, hasMany
   // title, attribute
   ```

   @property fields
    @public
   @static
   @type Map
   @readOnly
   */
  @computeOnce
  static get fields() {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );
    const map = new Map();

    this.eachComputedProperty((name, meta) => {
      if (isRelationshipSchema(meta)) {
        map.set(name, meta.kind);
      } else if (isAttributeSchema(meta)) {
        map.set(name, 'attribute');
      }
    });

    return map;
  }

  /**
   Given a callback, iterates over each of the relationships in the model,
   invoking the callback with the name of each relationship and its relationship
   descriptor.

   @method eachRelationship
    @public
   @static
   @param {Function} callback the callback to invoke
   @param {any} binding the value to which the callback's `this` should be bound
   */
  static eachRelationship<T, Schema extends Model>(
    callback: (
      this: T | undefined,
      key: Exclude<keyof Schema & string, keyof Model & string>,
      relationship: RelationshipSchema
    ) => void,
    binding?: T
  ): void {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    this.relationshipsByName.forEach((relationship, name) => {
      callback.call(binding, name as Exclude<keyof Schema & string, keyof Model & string>, relationship);
    });
  }

  /**
   Given a callback, iterates over each of the types related to a model,
   invoking the callback with the related type's class. Each type will be
   returned just once, regardless of how many different relationships it has
   with a model.

   @method eachRelatedType
    @public
   @static
   @param {Function} callback the callback to invoke
   @param {any} binding the value to which the callback's `this` should be bound
   */
  static eachRelatedType<T>(callback: (this: T | undefined, type: string) => void, binding?: T) {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const relationshipTypes = this.relatedTypes;

    for (let i = 0; i < relationshipTypes.length; i++) {
      const type = relationshipTypes[i];
      callback.call(binding, type);
    }
  }

  /**
   *
   * @method determineRelationshipType
   * @private
   * @deprecated
   */
  static determineRelationshipType(
    knownSide: RelationshipSchema,
    store: Store
  ): 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany' | 'oneToNone' | 'manyToNone' {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const knownKey = knownSide.name;
    const knownKind = knownSide.kind;
    const inverse = this.inverseFor(knownKey, store);
    // let key;

    if (!inverse) {
      return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
    }

    // key = inverse.name;
    const otherKind = inverse.kind;

    if (otherKind === 'belongsTo') {
      return knownKind === 'belongsTo' ? 'oneToOne' : 'manyToOne';
    } else {
      return knownKind === 'belongsTo' ? 'oneToMany' : 'manyToMany';
    }
  }

  /**
   A map whose keys are the attributes of the model (properties
   described by attr) and whose values are the meta object for the
   property.

   Example

   ```app/models/person.js
   import Model, { attr } from '@ember-data/model';

   export default class PersonModel extends Model {
      @attr('string') firstName;
      @attr('string') lastName;
      @attr('date') birthday;
    }
   ```

   ```javascript
   import Person from 'app/models/person'

   let attributes = Person.attributes

   attributes.forEach(function(meta, name) {
      // do thing
    });

   // prints:
   // firstName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", kind: 'attribute', options: Object, parentType: function, name: "birthday"}
   ```

   @property attributes
    @public
   @static
   @type {Map}
   @readOnly
   */
  @computeOnce
  static get attributes() {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const map = new Map();

    this.eachComputedProperty((name, meta) => {
      if (isAttributeSchema(meta)) {
        assert(
          "You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: attr('<type>')` from " +
            this.toString(),
          name !== 'id'
        );

        // TODO deprecate key being here
        (meta as unknown as { key: string }).key = name;
        meta.name = name;
        map.set(name, meta);
      }
    });

    return map;
  }

  /**
   A map whose keys are the attributes of the model (properties
   described by attr) and whose values are type of transformation
   applied to each attribute. This map does not include any
   attributes that do not have an transformation type.

   Example

   ```app/models/person.js
   import Model, { attr } from '@ember-data/model';

   export default class PersonModel extends Model {
      @attr firstName;
      @attr('string') lastName;
      @attr('date') birthday;
    }
   ```

   ```javascript
   import Person from 'app/models/person';

   let transformedAttributes = Person.transformedAttributes

   transformedAttributes.forEach(function(field, type) {
      // do thing
    });

   // prints:
   // lastName string
   // birthday date
   ```

   @property transformedAttributes
    @public
   @static
   @type {Map}
   @readOnly
   */
  @computeOnce
  static get transformedAttributes() {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    const map = new Map<string, string>();

    this.eachAttribute((name: string, meta: AttributeSchema) => {
      if (meta.type) {
        map.set(name, meta.type);
      }
    });

    return map;
  }

  /**
   Iterates through the attributes of the model, calling the passed function on each
   attribute.

   The callback method you provide should have the following signature (all
   parameters are optional):

   ```javascript
   function(name, meta);
   ```

   - `name` the name of the current property in the iteration
   - `meta` the meta object for the attribute property in the iteration

   Note that in addition to a callback, you can also pass an optional target
   object that will be set as `this` on the context.

   Example

   ```javascript
   import Model, { attr } from '@ember-data/model';

   class PersonModel extends Model {
      @attr('string') firstName;
      @attr('string') lastName;
      @attr('date') birthday;
    }

   PersonModel.eachAttribute(function(name, meta) {
      // do thing
    });

   // prints:
   // firstName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", kind: 'attribute', options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", kind: 'attribute', options: Object, parentType: function, name: "birthday"}
   ```

   @method eachAttribute
    @public
   @param {Function} callback The callback to execute
   @param {Object} [binding] the value to which the callback's `this` should be bound
   @static
   */
  static eachAttribute<T, Schema extends Model>(
    callback: (
      this: T | undefined,
      key: Exclude<keyof Schema & string, keyof Model & string>,
      attribute: AttributeSchema
    ) => void,
    binding?: T
  ): void {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    this.attributes.forEach((meta: AttributeSchema, name: Exclude<keyof Schema & string, keyof Model & string>) => {
      callback.call(binding, name, meta);
    });
  }

  /**
   Iterates through the transformedAttributes of the model, calling
   the passed function on each attribute. Note the callback will not be
   called for any attributes that do not have an transformation type.

   The callback method you provide should have the following signature (all
   parameters are optional):

   ```javascript
   function(name, type);
   ```

   - `name` the name of the current property in the iteration
   - `type` a string containing the name of the type of transformed
   applied to the attribute

   Note that in addition to a callback, you can also pass an optional target
   object that will be set as `this` on the context.

   Example

   ```javascript
   import Model, { attr } from '@ember-data/model';

   let Person = Model.extend({
      firstName: attr(),
      lastName: attr('string'),
      birthday: attr('date')
    });

   Person.eachTransformedAttribute(function(name, type) {
      // do thing
    });

   // prints:
   // lastName string
   // birthday date
   ```

   @method eachTransformedAttribute
    @public
   @param {Function} callback The callback to execute
   @param {Object} [binding] the value to which the callback's `this` should be bound
   @static
   */
  static eachTransformedAttribute<T, Schema extends Model>(
    callback: (this: T | undefined, key: Exclude<keyof Schema & string, keyof Model & string>, type: string) => void,
    binding?: T
  ): void {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    this.transformedAttributes.forEach((type: string, name) => {
      callback.call(binding, name as Exclude<keyof Schema & string, keyof Model & string>, type);
    });
  }

  /**
   Returns the name of the model class.

   @method toString
    @public
   @static
   */
  static override toString() {
    assert(
      `Accessing schema information on Models without looking up the model via the store is disallowed.`,
      this.modelName
    );

    return `model:${this.modelName}`;
  }
}

Model.prototype.save = save;
Model.prototype.destroyRecord = destroyRecord;
Model.prototype.unloadRecord = unloadRecord;
Model.prototype.hasMany = hasMany;
Model.prototype.belongsTo = belongsTo;
Model.prototype.serialize = serialize;
Model.prototype._createSnapshot = createSnapshot;
Model.prototype.deleteRecord = deleteRecord;
Model.prototype.changedAttributes = changedAttributes;
Model.prototype.rollbackAttributes = rollbackAttributes;
Model.prototype.reload = reload;

defineSignal(Model.prototype, 'isReloading', false);

// this is required to prevent `init` from passing
// the values initialized during create to `setUnknownProperty`
Model.prototype._createProps = null;
Model.prototype._secretInit = null;

if (DEBUG) {
  const lookupDescriptor = function lookupDescriptor(obj: object, keyName: string) {
    let current: object = obj;
    do {
      const descriptor = Object.getOwnPropertyDescriptor(current, keyName);
      if (descriptor !== undefined) {
        return descriptor;
      }
      current = Object.getPrototypeOf(current) as object;
    } while (current !== null);
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const init = Model.prototype.init;
  Model.prototype.init = function (createArgs: ModelCreateArgs) {
    init.call(this, createArgs);

    const ourDescriptor = lookupDescriptor(Model.prototype, 'currentState');
    const theirDescriptor = lookupDescriptor(this, 'currentState');

    if (!ourDescriptor || !theirDescriptor) {
      throw new Error(
        `Unable to determine if 'currentState' is a reserved property name on instances of classes extending Model. Please ensure that 'currentState' is not defined as a property on ${this.constructor.toString()}`
      );
    }

    const realState = this.___recordState;
    if (ourDescriptor.get !== theirDescriptor.get || realState !== this.currentState) {
      throw new Error(
        `'currentState' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
      );
    }

    const ID_DESCRIPTOR = lookupDescriptor(Model.prototype, 'id');
    const idDesc = lookupDescriptor(this, 'id');

    if (!ID_DESCRIPTOR || !idDesc) {
      throw new Error(
        `Unable to determine if 'id' is a reserved property name on instances of classes extending Model. Please ensure that 'id' is not defined as a property on ${this.constructor.toString()}`
      );
    }

    if (idDesc.get !== ID_DESCRIPTOR.get) {
      throw new Error(
        `You may not set 'id' as an attribute on your model. Please remove any lines that look like: \`id: attr('<type>')\` from ${this.constructor.toString()}`
      );
    }
  };

  delete (Model as unknown as { reopen: unknown }).reopen;
  delete (Model as unknown as { reopenClass: unknown }).reopenClass;
}

export { Model };

function isRelationshipSchema(meta: unknown): meta is RelationshipSchema {
  const hasKind = typeof meta === 'object' && meta !== null && 'kind' in meta && 'options' in meta;
  return hasKind && (meta.kind === 'hasMany' || meta.kind === 'belongsTo');
}

function isAttributeSchema(meta: unknown): meta is AttributeSchema {
  return typeof meta === 'object' && meta !== null && 'kind' in meta && meta.kind === 'attribute';
}
