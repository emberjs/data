/**
  @module @ember-data/model
 */

import { assert, deprecate, warn } from '@ember/debug';
import EmberObject from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';
import { run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import Ember from 'ember';

import { resolve } from 'rsvp';

import { HAS_DEBUG_PACKAGE } from '@ember-data/private-build-infra';
import {
  DEPRECATE_EARLY_STATIC,
  DEPRECATE_MODEL_REOPEN,
  DEPRECATE_NON_EXPLICIT_POLYMORPHISM,
  DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE,
  DEPRECATE_SAVE_PROMISE_ACCESS,
} from '@ember-data/private-build-infra/deprecations';
import { recordIdentifierFor, storeFor } from '@ember-data/store';
import { coerceId, recordDataFor } from '@ember-data/store/-private';

import { deprecatedPromiseObject } from './deprecated-promise-proxy';
import Errors from './errors';
import { LegacySupport } from './legacy-relationships-support';
import notifyChanges from './notify-changes';
import RecordState, { peekTag, tagged } from './record-state';
import { relationshipFromMeta } from './relationship-meta';

const { changeProperties } = Ember;
export const LEGACY_SUPPORT = new Map();

export function lookupLegacySupport(record) {
  const identifier = recordIdentifierFor(record);
  let support = LEGACY_SUPPORT.get(identifier);

  if (!support) {
    support = new LegacySupport(record);
    LEGACY_SUPPORT.set(identifier, support);
    LEGACY_SUPPORT.set(record, support);
  }

  return support;
}

function findPossibleInverses(type, inverseType, name, relationshipsSoFar) {
  let possibleRelationships = relationshipsSoFar || [];

  let relationshipMap = inverseType.relationships;
  if (!relationshipMap) {
    return possibleRelationships;
  }

  let relationshipsForType = relationshipMap.get(type.modelName);
  let relationships = Array.isArray(relationshipsForType)
    ? relationshipsForType.filter((relationship) => {
        let optionsForRelationship = relationship.options;

        if (!optionsForRelationship.inverse && optionsForRelationship.inverse !== null) {
          return true;
        }

        return name === optionsForRelationship.inverse;
      })
    : null;

  if (relationships) {
    possibleRelationships.push.apply(possibleRelationships, relationships);
  }

  //Recurse to support polymorphism
  if (type.superclass) {
    findPossibleInverses(type.superclass, inverseType, name, possibleRelationships);
  }

  return possibleRelationships;
}

/*
 * This decorator allows us to lazily compute
 * an expensive getter on first-access and thereafter
 * never recompute it.
 */
function computeOnce(target, key, desc) {
  const cache = new WeakMap();
  let getter = desc.get;
  desc.get = function () {
    let meta = cache.get(this);

    if (!meta) {
      meta = { hasComputed: false, value: undefined };
      cache.set(this, meta);
    }

    if (!meta.hasComputed) {
      meta.value = getter.call(this);
      meta.hasComputed = true;
    }

    return meta.value;
  };
  return desc;
}

/**
  Base class from which Models can be define.

  ```js
  import Model, { attr } from '@ember-data/model';

  export default class User extends Model {
    @attr name;
  }
  ```

  @class Model
  @public
  @extends Ember.EmberObject
*/
class Model extends EmberObject {
  ___private_notifications;

  init(options = {}) {
    if (DEBUG) {
      if (!options._secretInit && !options._createProps) {
        throw new Error(
          'You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.'
        );
      }
    }
    const createProps = options._createProps;
    const _secretInit = options._secretInit;
    options._createProps = null;
    options._secretInit = null;

    let store = (this.store = _secretInit.store);
    super.init(options);

    let identity = _secretInit.identifier;
    _secretInit.cb(this, _secretInit.recordData, identity, _secretInit.store);

    this.___recordState = DEBUG ? new RecordState(this) : null;

    this.setProperties(createProps);

    let notifications = store.notifications;
    this.___private_notifications = notifications.subscribe(identity, (identifier, type, key) => {
      notifyChanges(identifier, type, key, this, store);
    });
  }

  destroy() {
    const identifier = recordIdentifierFor(this);
    this.___recordState?.destroy();
    const store = storeFor(this);
    store.notifications.unsubscribe(this.___private_notifications);
    // Legacy behavior is to notify the relationships on destroy
    // such that they "clear". It's uncertain this behavior would
    // be good for a new model paradigm, likely cheaper and safer
    // to simply not notify, for this reason the store does not itself
    // notify individual changes once the delete has been signaled,
    // this decision is left to model instances.

    this.eachRelationship((key, meta) => {
      if (meta.kind === 'belongsTo') {
        this.notifyPropertyChange(key);
      }
    });
    LEGACY_SUPPORT.get(this)?.destroy();
    LEGACY_SUPPORT.delete(this);
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
  @dependentKeyCompat
  get isEmpty() {
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
  @dependentKeyCompat
  get isLoading() {
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
  @dependentKeyCompat
  get isLoaded() {
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
  @dependentKeyCompat
  get hasDirtyAttributes() {
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
  @dependentKeyCompat
  get isSaving() {
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
  @dependentKeyCompat
  get isDeleted() {
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
  @dependentKeyCompat
  get isNew() {
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
  @dependentKeyCompat
  get isValid() {
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
  @dependentKeyCompat
  get dirtyType() {
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
  @dependentKeyCompat
  get isError() {
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
  @tracked isReloading = false;

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
  get id() {
    // this guard exists, because some dev-only deprecation code
    // (addListener via validatePropertyInjections) invokes toString before the
    // object is real.
    if (DEBUG) {
      try {
        return recordIdentifierFor(this).id;
      } catch {
        return void 0;
      }
    }
    return recordIdentifierFor(this).id;
  }
  set id(id) {
    const normalizedId = coerceId(id);
    const identifier = recordIdentifierFor(this);
    let didChange = normalizedId !== identifier.id;
    assert(
      `Cannot set ${identifier.type} record's id to ${id}, because id is already ${identifier.id}`,
      !didChange || identifier.id === null
    );

    if (normalizedId !== null && didChange) {
      this.store._instanceCache.setRecordId(identifier, normalizedId);
      this.store.notifications.notify(identifier, 'identity');
    }
  }

  toString() {
    return `<model::${this.constructor.modelName}:${this.id}>`;
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
        this.___recordState = new RecordState(this);
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
  get errors() {
    let errors = Errors.create({ __record: this });
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
  @dependentKeyCompat
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
  serialize(options) {
    return storeFor(this)._instanceCache.createSnapshot(recordIdentifierFor(this)).serialize(options);
  }

  /*
    We hook the default implementation to ensure
    our tagged properties are properly notified
    as well. We still super for everything because
    sync observers require a direct call occuring
    to trigger their flush. We wouldn't need to
    super in 4.0+ where sync observers are removed.
   */
  notifyPropertyChange(key) {
    let tag = peekTag(this, key);
    if (tag) {
      tag.notify();
    }
    super.notifyPropertyChange(key);
  }

  /**
    Marks the record as deleted but does not save it. You must call
    `save` afterwards if you want to persist it. You might use this
    method if you want to allow the user to still `rollbackAttributes()`
    after a delete was made.

    Example

    ```app/controllers/model/delete.js
    import Controller from '@ember/controller';
    import { action } from '@ember/object';

    export default class ModelDeleteController extends Controller {
      @action
      softDelete() {
        this.model.deleteRecord();
      }

      @action
      confirm() {
        this.model.save();
      }

      @action
      undo() {
        this.model.rollbackAttributes();
      }
    }
    ```

    @method deleteRecord
    @public
  */
  deleteRecord() {
    // ensure we've populated currentState prior to deleting a new record
    if (this.currentState) {
      storeFor(this).deleteRecord(this);
    }
  }

  /**
    Same as `deleteRecord`, but saves the record immediately.

    Example

    ```app/controllers/model/delete.js
    import Controller from '@ember/controller';
    import { action } from '@ember/object';

    export default class ModelDeleteController extends Controller {
      @action
      delete() {
        this.model.destroyRecord().then(function() {
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
  destroyRecord(options) {
    const { isNew } = this.currentState;
    this.deleteRecord();
    if (isNew) {
      return resolve(this);
    }
    return this.save(options).then((_) => {
      run(() => {
        this.unloadRecord();
      });
      return this;
    });
  }

  /**
    Unloads the record from the store. This will not send a delete request
    to your server, it just unloads the record from memory.

    @method unloadRecord
    @public
  */
  unloadRecord() {
    if (this.currentState.isNew && (this.isDestroyed || this.isDestroying)) {
      return;
    }
    storeFor(this).unloadRecord(this);
  }

  /**
    @method _notifyProperties
    @private
  */
  _notifyProperties(keys) {
    // changeProperties defers notifications until after the delegate
    // and protects with a try...finally block
    // previously used begin...endPropertyChanges but this is private API
    changeProperties(() => {
      let key;
      for (let i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        this.notifyPropertyChange(key);
      }
    });
  }

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
  changedAttributes() {
    return recordDataFor(this).changedAttrs(recordIdentifierFor(this));
  }

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
  rollbackAttributes() {
    const { currentState } = this;
    const { isNew } = currentState;

    storeFor(this)._join(() => {
      recordDataFor(this).rollbackAttrs(recordIdentifierFor(this));
      this.errors.clear();
      currentState.cleanErrorRequests();
      if (isNew) {
        this.unloadRecord();
      }
    });
  }

  /**
    @method _createSnapshot
    @private
  */
  // TODO @deprecate in favor of a public API or examples of how to test successfully
  _createSnapshot() {
    return storeFor(this)._instanceCache.createSnapshot(recordIdentifierFor(this));
  }

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
  save(options) {
    let promise;

    if (this.currentState.isNew && this.currentState.isDeleted) {
      promise = resolve(this);
    } else {
      promise = storeFor(this).saveRecord(this, options);
    }

    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      return deprecatedPromiseObject(promise);
    }

    return promise;
  }

  /**
    Reload the record from the adapter.

    This will only work if the record has already finished loading.

    Example

    ```app/controllers/model/view.js
    import Controller from '@ember/controller';
    import { action } from '@ember/object';

    export default class ViewController extends Controller {
      @action
      reload() {
        this.model.reload().then(function(model) {
        // do something with the reloaded model
        });
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
  reload(_options) {
    let options = {};

    if (typeof _options === 'object' && _options !== null && _options.adapterOptions) {
      options.adapterOptions = _options.adapterOptions;
    }

    options.isReloading = true;
    let identifier = recordIdentifierFor(this);
    assert(`You cannot reload a record without an ID`, identifier.id);
    this.isReloading = true;
    const promise = storeFor(this)
      ._fetchManager.scheduleFetch(identifier, options)
      .then(() => this)
      .finally(() => {
        this.isReloading = false;
      });

    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      return deprecatedPromiseObject(promise);
    }
    return promise;
  }

  attr() {
    assert(
      'The `attr` method is not available on Model, a Snapshot was probably expected. Are you passing a Model instead of a Snapshot to your serializer?',
      false
    );
  }

  /**
    Get the reference for the specified belongsTo relationship.

    Example

    ```app/models/blog.js
    import Model, { belongsTo } from '@ember-data/model';

    export default class BlogModel extends Model {
      @belongsTo('user', { async: true, inverse: null }) user;
    }
    ```

    ```javascript
    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            data: { type: 'user', id: 1 }
          }
        }
      }
    });
    let userRef = blog.belongsTo('user');

    // check if the user relationship is loaded
    let isLoaded = userRef.value() !== null;

    // get the record of the reference (null if not yet available)
    let user = userRef.value();

    // get the identifier of the reference
    if (userRef.remoteType() === "id") {
      let id = userRef.id();
    } else if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }

    // load user (via store.findRecord or store.findBelongsTo)
    userRef.load().then(...)

    // or trigger a reload
    userRef.reload().then(...)

    // provide data for reference
    userRef.push({
      type: 'user',
      id: 1,
      attributes: {
        username: "@user"
      }
    }).then(function(user) {
      userRef.value() === user;
    });
    ```

    @method belongsTo
    @public
    @param {String} name of the relationship
    @since 2.5.0
    @return {BelongsToReference} reference for this relationship
  */
  belongsTo(name) {
    return lookupLegacySupport(this).referenceFor('belongsTo', name);
  }

  /**
    Get the reference for the specified hasMany relationship.

    Example

    ```app/models/blog.js
    import Model, { hasMany } from '@ember-data/model';

    export default class BlogModel extends Model {
      @hasMany('comment', { async: true, inverse: null }) comments;
    }

    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: 1 },
              { type: 'comment', id: 2 }
            ]
          }
        }
      }
    });
    let commentsRef = blog.hasMany('comments');

    // check if the comments are loaded already
    let isLoaded = commentsRef.value() !== null;

    // get the records of the reference (null if not yet available)
    let comments = commentsRef.value();

    // get the identifier of the reference
    if (commentsRef.remoteType() === "ids") {
      let ids = commentsRef.ids();
    } else if (commentsRef.remoteType() === "link") {
      let link = commentsRef.link();
    }

    // load comments (via store.findMany or store.findHasMany)
    commentsRef.load().then(...)

    // or trigger a reload
    commentsRef.reload().then(...)

    // provide data for reference
    commentsRef.push([{ type: 'comment', id: 1 }, { type: 'comment', id: 2 }]).then(function(comments) {
      commentsRef.value() === comments;
    });
    ```

    @method hasMany
    @public
    @param {String} name of the relationship
    @since 2.5.0
    @return {HasManyReference} reference for this relationship
  */
  hasMany(name) {
    return lookupLegacySupport(this).referenceFor('hasMany', name);
  }

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

   - **key** <span class="type">String</span> the name of this relationship on the Model
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
  eachRelationship(callback, binding) {
    this.constructor.eachRelationship(callback, binding);
  }

  relationshipFor(name) {
    return this.constructor.relationshipsByName.get(name);
  }

  inverseFor(key) {
    return this.constructor.inverseFor(key, storeFor(this));
  }

  eachAttribute(callback, binding) {
    this.constructor.eachAttribute(callback, binding);
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

   `modelName` is generated for you by Ember Data. It will be a lowercased, dasherized string.
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
  static modelName = null;

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
  static typeForRelationship(name, store) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let relationship = this.relationshipsByName.get(name);
    return relationship && store.modelFor(relationship.type);
  }

  @computeOnce
  static get inverseMap() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    return Object.create(null);
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
   store.modelFor('post').inverseFor('comments', store) // { type: App.Message, name: 'owner', kind: 'belongsTo' }
   store.modelFor('message').inverseFor('owner', store) // { type: App.Post, name: 'comments', kind: 'hasMany' }
   ```

   @method inverseFor
    @public
   @static
   @param {String} name the name of the relationship
   @param {Store} store
   @return {Object} the inverse relationship, or null
   */
  static inverseFor(name, store) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let inverseMap = this.inverseMap;
    if (inverseMap[name]) {
      return inverseMap[name];
    } else {
      let inverse = this._findInverseFor(name, store);
      inverseMap[name] = inverse;
      return inverse;
    }
  }

  //Calculate the inverse, ignoring the cache
  static _findInverseFor(name, store) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }

    const relationship = this.relationshipsByName.get(name);
    const { options } = relationship;
    const isPolymorphic = options.polymorphic;

    //If inverse is manually specified to be null, like  `comments: hasMany('message', { inverse: null })`
    const isExplicitInverseNull = options.inverse === null;
    const isAbstractType =
      !isExplicitInverseNull && isPolymorphic && !store.getSchemaDefinitionService().doesTypeExist(relationship.type);

    if (isExplicitInverseNull || isAbstractType) {
      assert(
        `No schema for the abstract type '${relationship.type}' for the polymorphic relationship '${name}' on '${this.modelName}' was provided by the SchemaDefinitionService.`,
        !isPolymorphic || isExplicitInverseNull
      );
      return null;
    }

    let fieldOnInverse, inverseKind, inverseRelationship, inverseOptions;
    let inverseSchema = this.typeForRelationship(name, store);

    // if the type does not exist and we are not polymorphic
    //If inverse is specified manually, return the inverse
    if (options.inverse !== undefined) {
      fieldOnInverse = options.inverse;
      inverseRelationship = inverseSchema && inverseSchema.relationshipsByName.get(fieldOnInverse);

      assert(
        `We found no field named '${fieldOnInverse}' on the schema for '${inverseSchema.modelName}' to be the inverse of the '${name}' relationship on '${this.modelName}'. This is most likely due to a missing field on your model definition.`,
        inverseRelationship
      );

      // TODO probably just return the whole inverse here
      inverseKind = inverseRelationship.kind;
      inverseOptions = inverseRelationship.options;
    } else {
      //No inverse was specified manually, we need to use a heuristic to guess one
      if (relationship.type === relationship.parentModelName) {
        warn(
          `Detected a reflexive relationship named '${name}' on the schema for '${relationship.type}' without an inverse option. Look at https://guides.emberjs.com/current/models/relationships/#toc_reflexive-relations for how to explicitly specify inverses.`,
          false,
          {
            id: 'ds.model.reflexive-relationship-without-inverse',
          }
        );
      }

      let possibleRelationships = findPossibleInverses(this, inverseSchema, name);

      if (possibleRelationships.length === 0) {
        return null;
      }

      if (DEBUG) {
        let filteredRelationships = possibleRelationships.filter((possibleRelationship) => {
          let optionsForRelationship = possibleRelationship.options;
          return name === optionsForRelationship.inverse;
        });

        assert(
          "You defined the '" +
            name +
            "' relationship on " +
            this +
            ', but you defined the inverse relationships of type ' +
            inverseSchema.toString() +
            ' multiple times. Look at https://guides.emberjs.com/current/models/relationships/#toc_explicit-inverses for how to explicitly specify inverses',
          filteredRelationships.length < 2
        );
      }

      let explicitRelationship = possibleRelationships.find((relationship) => relationship.options.inverse === name);
      if (explicitRelationship) {
        possibleRelationships = [explicitRelationship];
      }

      assert(
        "You defined the '" +
          name +
          "' relationship on " +
          this +
          ', but multiple possible inverse relationships of type ' +
          this +
          ' were found on ' +
          inverseSchema +
          '. Look at https://guides.emberjs.com/current/models/relationships/#toc_explicit-inverses for how to explicitly specify inverses',
        possibleRelationships.length === 1
      );

      fieldOnInverse = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
      inverseOptions = possibleRelationships[0].options;
    }

    // ensure inverse is properly configured
    if (DEBUG) {
      if (isPolymorphic) {
        if (DEPRECATE_NON_EXPLICIT_POLYMORPHISM) {
          if (!inverseOptions.as) {
            deprecate(
              `Relationships that satisfy polymorphic relationships MUST define which abstract-type they are satisfying using 'as'. The field '${fieldOnInverse}' on type '${inverseSchema.modelName}' is misconfigured.`,
              false,
              {
                id: 'ember-data:non-explicit-relationships',
                since: { enabled: '4.7', available: '4.7' },
                until: '5.0',
                for: 'ember-data',
              }
            );
          }
        } else {
          assert(
            `Relationships that satisfy polymorphic relationships MUST define which abstract-type they are satisfying using 'as'. The field '${fieldOnInverse}' on type '${inverseSchema.modelName}' is misconfigured.`,
            inverseOptions.as
          );
          assert(
            `options.as should match the expected type of the polymorphic relationship. Expected field '${fieldOnInverse}' on type '${inverseSchema.modelName}' to specify '${relationship.type}' but found '${inverseOptions.as}'`,
            !!inverseOptions.as && relationship.type === inverseOptions.as
          );
        }
      }
    }

    // ensure we are properly configured
    if (DEBUG) {
      if (inverseOptions.polymorphic) {
        if (DEPRECATE_NON_EXPLICIT_POLYMORPHISM) {
          if (!options.as) {
            deprecate(
              `Relationships that satisfy polymorphic relationships MUST define which abstract-type they are satisfying using 'as'. The field '${name}' on type '${this.modelName}' is misconfigured.`,
              false,
              {
                id: 'ember-data:non-explicit-relationships',
                since: { enabled: '4.7', available: '4.7' },
                until: '5.0',
                for: 'ember-data',
              }
            );
          }
        } else {
          assert(
            `Relationships that satisfy polymorphic relationships MUST define which abstract-type they are satisfying using 'as'. The field '${name}' on type '${this.modelName}' is misconfigured.`,
            options.as
          );
          assert(
            `options.as should match the expected type of the polymorphic relationship. Expected field '${name}' on type '${this.modelName}' to specify '${inverseRelationship.type}' but found '${options.as}'`,
            !!options.as && inverseRelationship.type === options.as
          );
        }
      }
    }

    assert(
      `The ${inverseSchema.modelName}:${fieldOnInverse} relationship declares 'inverse: null', but it was resolved as the inverse for ${this.modelName}:${name}.`,
      inverseOptions.inverse !== null
    );

    return {
      type: inverseSchema,
      name: fieldOnInverse,
      kind: inverseKind,
      options: inverseOptions,
    };
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
   import { get } from '@ember/object';
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
  static get relationships() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let map = new Map();
    let relationshipsByName = this.relationshipsByName;

    // Loop through each computed property on the class
    relationshipsByName.forEach((desc) => {
      let { type } = desc;

      if (!map.has(type)) {
        map.set(type, []);
      }

      map.get(type).push(desc);
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
   import { get } from '@ember/object';
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
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let names = {
      hasMany: [],
      belongsTo: [],
    };

    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
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
   import { get } from '@ember/object';
   import Blog from 'app/models/blog';

   let relatedTypes = Blog.relatedTypes');
   //=> [ User, Post ]
   ```

   @property relatedTypes
    @public
   @static
   @type Ember.Array
   @readOnly
   */
  @computeOnce
  static get relatedTypes() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let types = [];

    let rels = this.relationshipsObject;
    let relationships = Object.keys(rels);

    // create an array of the unique types involved
    // in relationships
    for (let i = 0; i < relationships.length; i++) {
      let name = relationships[i];
      let meta = rels[name];
      let modelName = meta.type;

      if (types.indexOf(modelName) === -1) {
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
   import { get } from '@ember/object';
   import Blog from 'app/models/blog';

   let relationshipsByName = Blog.relationshipsByName;
   relationshipsByName.users;
   //=> { key: 'users', kind: 'hasMany', type: 'user', options: Object, isRelationship: true }
   relationshipsByName.owner;
   //=> { key: 'owner', kind: 'belongsTo', type: 'user', options: Object, isRelationship: true }
   ```

   @property relationshipsByName
    @public
   @static
   @type Map
   @readOnly
   */
  @computeOnce
  static get relationshipsByName() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let map = new Map();
    let rels = this.relationshipsObject;
    let relationships = Object.keys(rels);

    for (let i = 0; i < relationships.length; i++) {
      let key = relationships[i];
      let value = rels[key];

      map.set(value.key, value);
    }

    return map;
  }

  @computeOnce
  static get relationshipsObject() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let relationships = Object.create(null);
    let modelName = this.modelName;
    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        meta.key = name;
        meta.name = name;
        meta.parentModelName = modelName;
        relationships[name] = DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE ? relationshipFromMeta(meta) : meta;
      }
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
   import { get } from '@ember/object';
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
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let map = new Map();

    this.eachComputedProperty((name, meta) => {
      // TODO end reliance on these booleans and stop leaking them in the spec
      if (meta.isRelationship) {
        map.set(name, meta.kind);
      } else if (meta.isAttribute) {
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
  static eachRelationship(callback, binding) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    this.relationshipsByName.forEach((relationship, name) => {
      callback.call(binding, name, relationship);
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
  static eachRelatedType(callback, binding) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let relationshipTypes = this.relatedTypes;

    for (let i = 0; i < relationshipTypes.length; i++) {
      let type = relationshipTypes[i];
      callback.call(binding, type);
    }
  }

  static determineRelationshipType(knownSide, store) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let knownKey = knownSide.key;
    let knownKind = knownSide.kind;
    let inverse = this.inverseFor(knownKey, store);
    // let key;
    let otherKind;

    if (!inverse) {
      return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
    }

    // key = inverse.name;
    otherKind = inverse.kind;

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
   import { get } from '@ember/object';
   import Person from 'app/models/person'

   let attributes = Person.attributes

   attributes.forEach(function(meta, name) {
      // do thing
    });

   // prints:
   // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
   ```

   @property attributes
    @public
   @static
   @type {Map}
   @readOnly
   */
  @computeOnce
  static get attributes() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let map = new Map();

    this.eachComputedProperty((name, meta) => {
      if (meta.isAttribute) {
        assert(
          "You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: attr('<type>')` from " +
            this.toString(),
          name !== 'id'
        );

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
   import { get } from '@ember/object';
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
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    let map = new Map();

    this.eachAttribute((key, meta) => {
      if (meta.type) {
        map.set(key, meta.type);
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
   // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
   // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
   // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
   ```

   @method eachAttribute
    @public
   @param {Function} callback The callback to execute
   @param {Object} [binding] the value to which the callback's `this` should be bound
   @static
   */
  static eachAttribute(callback, binding) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    this.attributes.forEach((meta, name) => {
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
  static eachTransformedAttribute(callback, binding) {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    this.transformedAttributes.forEach((type, name) => {
      callback.call(binding, name, type);
    });
  }

  /**
   Returns the name of the model class.

   @method toString
    @public
   @static
   */
  static toString() {
    if (DEPRECATE_EARLY_STATIC) {
      deprecate(
        `Accessing schema information on Models without looking up the model via the store is deprecated. Use store.modelFor (or better Snapshots or the store.getSchemaDefinitionService() apis) instead.`,
        this.modelName,
        {
          id: 'ember-data:deprecate-early-static',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
    } else {
      assert(
        `Accessing schema information on Models without looking up the model via the store is disallowed.`,
        this.modelName
      );
    }
    return `model:${this.modelName}`;
  }
}

// this is required to prevent `init` from passing
// the values initialized during create to `setUnknownProperty`
Model.prototype._createProps = null;
Model.prototype._secretInit = null;

if (HAS_DEBUG_PACKAGE) {
  /**
   Provides info about the model for debugging purposes
   by grouping the properties into more semantic groups.

   Meant to be used by debugging tools such as the Chrome Ember Extension.

   - Groups all attributes in "Attributes" group.
   - Groups all belongsTo relationships in "Belongs To" group.
   - Groups all hasMany relationships in "Has Many" group.
   - Groups all flags in "Flags" group.
   - Flags relationship CPs as expensive properties.

   @method _debugInfo
   @for Model
   @private
   */
  Model.prototype._debugInfo = function () {
    let attributes = ['id'];
    let relationships = {};
    let expensiveProperties = [];

    this.eachAttribute((name, meta) => attributes.push(name));

    let groups = [
      {
        name: 'Attributes',
        properties: attributes,
        expand: true,
      },
    ];

    this.eachRelationship((name, relationship) => {
      let properties = relationships[relationship.kind];

      if (properties === undefined) {
        properties = relationships[relationship.kind] = [];
        groups.push({
          name: relationship.kind,
          properties,
          expand: true,
        });
      }
      properties.push(name);
      expensiveProperties.push(name);
    });

    groups.push({
      name: 'Flags',
      properties: ['isLoaded', 'hasDirtyAttributes', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid'],
    });

    return {
      propertyInfo: {
        // include all other mixins / properties (not just the grouped ones)
        includeOtherProperties: true,
        groups: groups,
        // don't pre-calculate unless cached
        expensiveProperties: expensiveProperties,
      },
    };
  };
}

if (DEBUG) {
  let lookupDescriptor = function lookupDescriptor(obj, keyName) {
    let current = obj;
    do {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);
      if (descriptor !== undefined) {
        return descriptor;
      }
      current = Object.getPrototypeOf(current);
    } while (current !== null);
    return null;
  };

  Model.reopen({
    init() {
      this._super(...arguments);

      let ourDescriptor = lookupDescriptor(Model.prototype, 'currentState');
      let theirDescriptor = lookupDescriptor(this, 'currentState');
      let realState = this.___recordState;
      if (ourDescriptor.get !== theirDescriptor.get || realState !== this.currentState) {
        throw new Error(
          `'currentState' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
        );
      }

      const ID_DESCRIPTOR = lookupDescriptor(Model.prototype, 'id');
      let idDesc = lookupDescriptor(this, 'id');

      if (idDesc.get !== ID_DESCRIPTOR.get) {
        throw new Error(
          `You may not set 'id' as an attribute on your model. Please remove any lines that look like: \`id: attr('<type>')\` from ${this.constructor.toString()}`
        );
      }
    },
  });

  if (DEPRECATE_MODEL_REOPEN) {
    const originalReopen = Model.reopen;
    const originalReopenClass = Model.reopenClass;

    Model.reopen = function deprecatedReopen() {
      deprecate(`Model.reopen is deprecated. Use Foo extends Model to extend your class instead.`, false, {
        id: 'ember-data:deprecate-model-reopen',
        for: 'ember-data',
        until: '5.0',
        since: { available: '4.7', enabled: '4.7' },
      });
      return originalReopen.call(this, ...arguments);
    };

    Model.reopenClass = function deprecatedReopenClass() {
      deprecate(
        `Model.reopenClass is deprecated. Use Foo extends Model to add static methods and properties to your class instead.`,
        false,
        {
          id: 'ember-data:deprecate-model-reopenclass',
          for: 'ember-data',
          until: '5.0',
          since: { available: '4.7', enabled: '4.7' },
        }
      );
      return originalReopenClass.call(this, ...arguments);
    };
  }
}

export default Model;
