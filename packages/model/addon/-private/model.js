/**
  @module @ember-data/model
 */

import { assert, deprecate, warn } from '@ember/debug';
import EmberError from '@ember/error';
import EmberObject, { get } from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';
import { run } from '@ember/runloop';
import { isNone } from '@ember/utils';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import Ember from 'ember';

import { CUSTOM_MODEL_CLASS, RECORD_DATA_ERRORS, REQUEST_SERVICE } from '@ember-data/canary-features';
import { HAS_DEBUG_PACKAGE } from '@ember-data/private-build-infra';
import {
  DEPRECATE_EVENTED_API_USAGE,
  DEPRECATE_MODEL_TOJSON,
  DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS,
} from '@ember-data/private-build-infra/deprecations';
import {
  coerceId,
  DeprecatedEvented,
  errorsArrayToHash,
  InternalModel,
  PromiseObject,
  recordDataFor,
} from '@ember-data/store/-private';

import Errors from './errors';
import RecordState, { peekTag, tagged } from './record-state';
import { relationshipFromMeta } from './system/relationships/relationship-meta';

const { changeProperties } = Ember;

/*
 In the non-CUSTOM_MODEL_CLASS world things decorated with flagToggledDecorator
 have logic that requires a cache and caching key (which tagged provides), but
 in the CUSTOM_MODEL_CLASS branch it only requires dependentKeyCompat which
 ensures computeds/observers on the field will fire when anything it accesses
 that is tracked changes
*/
const flagToggledDecorator = CUSTOM_MODEL_CLASS ? dependentKeyCompat : tagged;

function findPossibleInverses(type, inverseType, name, relationshipsSoFar) {
  let possibleRelationships = relationshipsSoFar || [];

  let relationshipMap = inverseType.relationships;
  if (!relationshipMap) {
    return possibleRelationships;
  }

  let relationshipsForType = relationshipMap.get(type.modelName);
  let relationships = Array.isArray(relationshipsForType)
    ? relationshipsForType.filter((relationship) => {
        let optionsForRelationship = inverseType.metaForProperty(relationship.name).options;

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
 * an expensive getter on first-access and therafter
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
  @uses DeprecatedEvented
*/
class Model extends EmberObject {
  init(options = {}) {
    const createProps = options._createProps;
    delete options._createProps;
    super.init(options);

    if (DEBUG) {
      if (!this._internalModel) {
        throw new EmberError(
          'You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.'
        );
      }
    }

    if (CUSTOM_MODEL_CLASS) {
      this.___recordState = new RecordState(this);
    }
    this.setProperties(createProps);
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
    record.get('isLoaded'); // true

    store.findRecord('model', 1).then(function(model) {
      model.get('isLoaded'); // true
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
    record.get('hasDirtyAttributes'); // true

    store.findRecord('model', 1).then(function(model) {
      model.get('hasDirtyAttributes'); // false
      model.set('foo', 'some value');
      model.get('hasDirtyAttributes'); // true
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
    record.get('isSaving'); // false
    let promise = record.save();
    record.get('isSaving'); // true
    promise.then(function() {
      record.get('isSaving'); // false
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
    record.get('isDeleted');    // false
    record.deleteRecord();

    // Locally deleted
    record.get('isDeleted');           // true
    record.get('hasDirtyAttributes');  // true
    record.get('isSaving');            // false

    // Persisting the deletion
    let promise = record.save();
    record.get('isDeleted');    // true
    record.get('isSaving');     // true

    // Deletion Persisted
    promise.then(function() {
      record.get('isDeleted');          // true
      record.get('isSaving');           // false
      record.get('hasDirtyAttributes'); // false
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
    record.get('isNew'); // true

    record.save().then(function(model) {
      model.get('isNew'); // false
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
    record.get('dirtyType'); // 'created'
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
    record.get('isError'); // false
    record.set('foo', 'valid value');
    record.save().then(null, function() {
      record.get('isError'); // true
    });
    ```

    @property isError
    @public
    @type {Boolean}
    @readOnly
  */
  @flagToggledDecorator
  get isError() {
    if (REQUEST_SERVICE) {
      return this.currentState.isError;
    }
    let tag = peekTag(this, 'isError');
    tag.value = tag.value || false;
    return tag.value;
  }
  set isError(v) {
    if (REQUEST_SERVICE && DEBUG) {
      throw new Error(`isError is not directly settable when REQUEST_SERVICE is enabled`);
    } else {
      let tag = peekTag(this, 'isError');
      tag.value = v;
    }
  }

  /**
    If `true` the store is attempting to reload the record from the adapter.

    Example

    ```javascript
    record.get('isReloading'); // false
    record.reload();
    record.get('isReloading'); // true
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
    record.get('id'); // null

    store.findRecord('model', 1).then(function(model) {
      model.get('id'); // '1'
    });
    ```

    @property id
    @public
    @type {String}
  */
  @tagged
  get id() {
    // the _internalModel guard exists, because some dev-only deprecation code
    // (addListener via validatePropertyInjections) invokes toString before the
    // object is real.
    if (DEBUG) {
      if (!this._internalModel) {
        return void 0;
      }
    }
    return this._internalModel.id;
  }
  set id(id) {
    const normalizedId = coerceId(id);

    if (normalizedId !== null) {
      this._internalModel.setId(normalizedId);
    }
  }

  /**
    @property currentState
    @private
    @type {Object}
  */
  @tagged
  get currentState() {
    if (CUSTOM_MODEL_CLASS) {
      return this.___recordState;
    }
    if (this.isDestroyed || this.isDestroying) {
      return this._internalModel._previousState;
    }

    return this._internalModel && this._internalModel.currentState;
  }
  set currentState(v) {
    if (!CUSTOM_MODEL_CLASS) {
      this.notifyPropertyChange('currentState');
    }
  }

  /**
   @property _internalModel
   @private
   @type {Object}
   */

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
    record.get('errors.length'); // 0
    record.set('foo', 'invalid value');
    record.save().catch(function() {
      record.get('errors').get('foo');
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
    let errors = Errors.create();

    errors._registerHandlers(
      () => {
        this._internalModel.send('becameInvalid');
      },
      () => {
        this._internalModel.send('becameValid');
      }
    );
    if (RECORD_DATA_ERRORS) {
      // TODO we should unify how errors gets populated
      // with the code managing the update. Probably a
      // lazy flush similar to retrieveLatest in ManyArray
      let recordData = recordDataFor(this);
      let jsonApiErrors;
      if (recordData.getErrors) {
        jsonApiErrors = recordData.getErrors();
        if (jsonApiErrors) {
          let errorsHash = errorsArrayToHash(jsonApiErrors);
          let errorKeys = Object.keys(errorsHash);

          for (let i = 0; i < errorKeys.length; i++) {
            errors._add(errorKeys[i], errorsHash[errorKeys[i]]);
          }
        }
      }
    }
    return errors;
  }

  /**
    This property holds the `AdapterError` object with which
    last adapter operation was rejected.

    @property adapterError
    @public
    @type {AdapterError}
  */
  @flagToggledDecorator
  get adapterError() {
    if (REQUEST_SERVICE) {
      return this.currentState.adapterError;
    }
    let tag = peekTag(this, 'adapterError');
    tag.value = tag.value || null;
    return tag.value;
  }
  set adapterError(v) {
    if (REQUEST_SERVICE && DEBUG) {
      throw new Error(`adapterError is not directly settable when REQUEST_SERVICE is enabled`);
    } else {
      let tag = peekTag(this, 'adapterError');
      tag.value = v;
    }
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
    return this._internalModel.createSnapshot().serialize(options);
  }

  /**
    Fired when the record is ready to be interacted with,
    that is either loaded from the server or created locally.

    @deprecated
    @public
    @event ready
  */

  /**
    Fired when the record is loaded from the server.

    @deprecated
    @public
    @event didLoad
  */

  /**
    Fired when the record is updated.

    @deprecated
    @public
    @event didUpdate
  */

  /**
    Fired when a new record is commited to the server.

    @deprecated
    @public
    @event didCreate
  */

  /**
    Fired when the record is deleted.

    @deprecated
    @public
    @event didDelete
  */

  /**
    Fired when the record becomes invalid.

    @deprecated
    @public
    @event becameInvalid
  */

  /**
    Fired when the record enters the error state.

    @deprecated
    @public
    @event becameError
  */

  /**
    Fired when the record is rolled back.

    @deprecated
    @public
    @event rolledBack
  */

  /**
    @deprecated
    @method send
    @private
    @param {String} name
    @param {Object} context
  */
  send(name, context) {
    return this._internalModel.send(name, context);
  }

  /**
    @deprecated
    @method transitionTo
    @private
    @param {String} name
  */
  transitionTo(name) {
    return this._internalModel.transitionTo(name);
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
    if (CUSTOM_MODEL_CLASS) {
      this.store.deleteRecord(this);
    } else {
      this._internalModel.deleteRecord();
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
    this.deleteRecord();
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
    if (this.isDestroyed) {
      return;
    }
    if (CUSTOM_MODEL_CLASS) {
      this.store.unloadRecord(this);
    } else {
      this._internalModel.unloadRecord();
    }
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
    return this._internalModel.changedAttributes();
  }

  /**
    If the model `hasDirtyAttributes` this function will discard any unsaved
    changes. If the model `isNew` it will be removed from the store.

    Example

    ```javascript
    record.get('name'); // 'Untitled Document'
    record.set('name', 'Doc 1');
    record.get('name'); // 'Doc 1'
    record.rollbackAttributes();
    record.get('name'); // 'Untitled Document'
    ```

    @since 1.13.0
    @method rollbackAttributes
    @public
  */
  rollbackAttributes() {
    this._internalModel.rollbackAttributes();
    if (CUSTOM_MODEL_CLASS) {
      this.currentState.cleanErrorRequests();
    }
  }

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot() {
    return this._internalModel.createSnapshot();
  }

  toStringExtension() {
    // the _internalModel guard exists, because some dev-only deprecation code
    // (addListener via validatePropertyInjections) invokes toString before the
    // object is real.
    return this._internalModel && this._internalModel.id;
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
    return PromiseObject.create({
      promise: this._internalModel.save(options).then(() => this),
    });
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
  reload(options) {
    let wrappedAdapterOptions;

    if (typeof options === 'object' && options !== null && options.adapterOptions) {
      wrappedAdapterOptions = {
        adapterOptions: options.adapterOptions,
      };
    }

    this.isReloading = true;
    return PromiseObject.create({
      promise: this._internalModel
        .reload(wrappedAdapterOptions)
        .then(() => this)
        .finally(() => {
          this.isReloading = false;
        }),
    });
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
      @belongsTo({ async: true }) user;
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
    return this._internalModel.referenceFor('belongsTo', name);
  }

  /**
    Get the reference for the specified hasMany relationship.

    Example

    ```app/models/blog.js
    import Model, { hasMany } from '@ember-data/model';

    export default class BlogModel extends Model {
      @hasMany({ async: true }) comments;
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
    return this._internalModel.referenceFor('hasMany', name);
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
          json[serializedHasManyName] = record.get(name).mapBy('id');
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
    return this.constructor.inverseFor(key, this._internalModel.store);
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
   import { underscore } from '@ember/string';

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
    let relationship = this.relationshipsByName.get(name);
    return relationship && store.modelFor(relationship.type);
  }

  @computeOnce
  static get inverseMap() {
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
   import Model from '@ember-data/model';
   import { belongsTo } from '@ember-decorators/data';

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
    let inverseType = this.typeForRelationship(name, store);
    if (!inverseType) {
      return null;
    }

    let propertyMeta = this.metaForProperty(name);
    //If inverse is manually specified to be null, like  `comments: hasMany('message', { inverse: null })`
    let options = propertyMeta.options;
    if (options.inverse === null) {
      return null;
    }

    let inverseName, inverseKind, inverse, inverseOptions;

    //If inverse is specified manually, return the inverse
    if (options.inverse) {
      inverseName = options.inverse;
      inverse = inverseType.relationshipsByName.get(inverseName);

      assert(
        "We found no inverse relationships by the name of '" +
          inverseName +
          "' on the '" +
          inverseType.modelName +
          "' model. This is most likely due to a missing attribute on your model definition.",
        !isNone(inverse)
      );

      // TODO probably just return the whole inverse here
      inverseKind = inverse.kind;
      inverseOptions = inverse.options;
    } else {
      //No inverse was specified manually, we need to use a heuristic to guess one
      if (propertyMeta.type === propertyMeta.parentModelName) {
        warn(
          `Detected a reflexive relationship by the name of '${name}' without an inverse option. Look at https://guides.emberjs.com/current/models/relationships/#toc_reflexive-relations for how to explicitly specify inverses.`,
          false,
          {
            id: 'ds.model.reflexive-relationship-without-inverse',
          }
        );
      }

      let possibleRelationships = findPossibleInverses(this, inverseType, name);

      if (possibleRelationships.length === 0) {
        return null;
      }

      let filteredRelationships = possibleRelationships.filter((possibleRelationship) => {
        let optionsForRelationship = inverseType.metaForProperty(possibleRelationship.name).options;
        return name === optionsForRelationship.inverse;
      });

      assert(
        "You defined the '" +
          name +
          "' relationship on " +
          this +
          ', but you defined the inverse relationships of type ' +
          inverseType.toString() +
          ' multiple times. Look at https://guides.emberjs.com/current/models/relationships/#toc_explicit-inverses for how to explicitly specify inverses',
        filteredRelationships.length < 2
      );

      if (filteredRelationships.length === 1) {
        possibleRelationships = filteredRelationships;
      }

      assert(
        "You defined the '" +
          name +
          "' relationship on " +
          this +
          ', but multiple possible inverse relationships of type ' +
          this +
          ' were found on ' +
          inverseType +
          '. Look at https://guides.emberjs.com/current/models/relationships/#toc_explicit-inverses for how to explicitly specify inverses',
        possibleRelationships.length === 1
      );

      inverseName = possibleRelationships[0].name;
      inverseKind = possibleRelationships[0].kind;
      inverseOptions = possibleRelationships[0].options;
    }

    assert(
      `The ${inverseType.modelName}:${inverseName} relationship declares 'inverse: null', but it was resolved as the inverse for ${this.modelName}:${name}.`,
      !inverseOptions || inverseOptions.inverse !== null
    );

    return {
      type: inverseType,
      name: inverseName,
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
   relationships.get('user');
   //=> [ { name: 'users', kind: 'hasMany' },
   //     { name: 'owner', kind: 'belongsTo' } ]
   relationships.get('post');
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
   relationshipsByName.get('users');
   //=> { key: 'users', kind: 'hasMany', type: 'user', options: Object, isRelationship: true }
   relationshipsByName.get('owner');
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
    let relationships = Object.create(null);
    let modelName = this.modelName;
    this.eachComputedProperty((name, meta) => {
      if (meta.isRelationship) {
        meta.key = name;
        meta.name = name;
        meta.parentModelName = modelName;
        relationships[name] = relationshipFromMeta(meta);
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
      console.log(field, kind);
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
    let map = new Map();

    this.eachComputedProperty((name, meta) => {
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
    let relationshipTypes = this.relatedTypes;

    for (let i = 0; i < relationshipTypes.length; i++) {
      let type = relationshipTypes[i];
      callback.call(binding, type);
    }
  }

  static determineRelationshipType(knownSide, store) {
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
   import Blog from 'app/models/blog'

   let attributes = Person.attributes

   attributes.forEach(function(meta, name) {
      console.log(name, meta);
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
      console.log(field, type);
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
      console.log(name, meta);
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
      console.log(name, type);
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
    return `model:${get(this, 'modelName')}`;
  }
}

// this is required to prevent `init` from passing
// the values initialized during create to `setUnknownProperty`
Model.prototype._internalModel = null;
Model.prototype.store = null;
Model.prototype._createProps = null;

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

if (DEPRECATE_EVENTED_API_USAGE) {
  /**
  Override the default event firing from Ember.Evented to
  also call methods with the given name.

  @method trigger
  @private
  @param {String} name
*/
  Model.reopen(DeprecatedEvented, {
    trigger(name) {
      if (DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS) {
        let fn = this[name];
        if (typeof fn === 'function') {
          let length = arguments.length;
          let args = new Array(length - 1);

          for (let i = 1; i < length; i++) {
            args[i - 1] = arguments[i];
          }
          fn.apply(this, args);
        }
      }

      const _hasEvent = DEBUG ? this._has(name) : this.has(name);
      if (_hasEvent) {
        this._super(...arguments);
      }
    },
  });
}

if (DEPRECATE_MODEL_TOJSON) {
  /**
    Use [JSONSerializer](JSONSerializer.html) to
    get the JSON representation of a record.

    `toJSON` takes an optional hash as a parameter, currently
    supported options are:

    - `includeId`: `true` if the record's ID should be included in the
      JSON representation.

    @method toJSON
    @public
    @param {Object} options
    @return {Object} A JSON representation of the object.
  */
  Model.reopen({
    toJSON(options) {
      // container is for lazy transform lookups
      deprecate(
        `Called the built-in \`toJSON\` on the record "${this.constructor.modelName}:${this.id}". The built-in \`toJSON\` method on instances of classes extending \`Model\` is deprecated. For more information see the link below.`,
        false,
        {
          id: 'ember-data:model.toJSON',
          until: '4.0',
          url: 'https://deprecations.emberjs.com/ember-data/v3.x#toc_record-toJSON',
          for: '@ember-data/model',
          since: {
            available: '3.15',
            enabled: '3.15',
          },
        }
      );
      let serializer = this._internalModel.store.serializerFor('-default');
      let snapshot = this._internalModel.createSnapshot();

      return serializer.serialize(snapshot, options);
    },
  });
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
  let isBasicDesc = function isBasicDesc(desc) {
    return (
      !desc ||
      (!desc.get && !desc.set && desc.enumerable === true && desc.writable === true && desc.configurable === true)
    );
  };
  let isDefaultEmptyDescriptor = function isDefaultEmptyDescriptor(obj, keyName) {
    let instanceDesc = lookupDescriptor(obj, keyName);
    return isBasicDesc(instanceDesc) && lookupDescriptor(obj.constructor, keyName) === null;
  };

  let lookupDeprecations;
  let _deprecatedLifecycleMethods;

  if (DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS) {
    const INSTANCE_DEPRECATIONS = new WeakMap();
    _deprecatedLifecycleMethods = [
      'becameError',
      'becameInvalid',
      'didCreate',
      'didDelete',
      'didLoad',
      'didUpdate',
      'ready',
      'rolledBack',
    ];

    lookupDeprecations = function lookupInstanceDeprecations(instance) {
      let deprecations = INSTANCE_DEPRECATIONS.get(instance);

      if (!deprecations) {
        deprecations = new Set();
        INSTANCE_DEPRECATIONS.set(instance, deprecations);
      }

      return deprecations;
    };
  }

  Model.reopen({
    init() {
      this._super(...arguments);

      if (DEPRECATE_EVENTED_API_USAGE) {
        this._getDeprecatedEventedInfo = () => `${this._internalModel.modelName}#${this.id}`;
      }

      if (!isDefaultEmptyDescriptor(this, '_internalModel') || !(this._internalModel instanceof InternalModel)) {
        throw new Error(
          `'_internalModel' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
        );
      }

      let ourDescriptor = lookupDescriptor(Model.prototype, 'currentState');
      let theirDescriptor = lookupDescriptor(this, 'currentState');
      let realState = this.___recordState || this._internalModel.currentState;
      if (ourDescriptor.get !== theirDescriptor.get || realState !== this.currentState) {
        throw new Error(
          `'currentState' is a reserved property name on instances of classes extending Model. Please choose a different property name for ${this.constructor.toString()}`
        );
      }

      const ID_DESCRIPTOR = lookupDescriptor(Model.prototype, 'id');
      let idDesc = lookupDescriptor(this, 'id');

      if (idDesc.get !== ID_DESCRIPTOR.get) {
        throw new EmberError(
          `You may not set 'id' as an attribute on your model. Please remove any lines that look like: \`id: attr('<type>')\` from ${this.constructor.toString()}`
        );
      }

      if (DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS) {
        let lifecycleDeprecations = lookupDeprecations(this.constructor);

        _deprecatedLifecycleMethods.forEach((methodName) => {
          if (typeof this[methodName] === 'function' && !lifecycleDeprecations.has(methodName)) {
            deprecate(
              `You defined a \`${methodName}\` method for ${this.constructor.toString()} but lifecycle events for models have been deprecated.`,
              false,
              {
                id: 'ember-data:record-lifecycle-event-methods',
                until: '4.0',
                url: 'https://deprecations.emberjs.com/ember-data/v3.x#toc_record-lifecycle-event-methods',
                for: '@ember-data/model',
                since: {
                  available: '3.12',
                  enabled: '3.12',
                },
              }
            );

            lifecycleDeprecations.add(methodName);
          }
        });
      }
    },
  });
}

export default Model;
