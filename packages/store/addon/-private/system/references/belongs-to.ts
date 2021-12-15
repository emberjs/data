import { deprecate } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { cached, tracked } from '@glimmer/tracking';

import { resolve } from 'rsvp';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import { DEPRECATE_BELONGS_TO_REFERENCE_PUSH } from '@ember-data/private-build-infra/deprecations';
import type { BelongsToRelationship } from '@ember-data/record-data/-private';
import { assertPolymorphicType } from '@ember-data/store/-debug';

import { SingleResourceDocument } from '../../ts-interfaces/ember-data-json-api';
import { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import CoreStore from '../core-store';
import { NotificationType, unsubscribe } from '../record-notification-manager';
import { internalModelFactoryFor, peekRecordIdentifier, recordIdentifierFor } from '../store/internal-model-factory';
import RecordReference from './record';
import Reference from './reference';

/**
  @module @ember-data/store
*/

/**
 A `BelongsToReference` is a low-level API that allows users and
 addon authors to perform meta-operations on a belongs-to
 relationship.

 @class BelongsToReference
 @public
 @extends Reference
 */
export default class BelongsToReference extends Reference {
  declare key: string;
  declare belongsToRelationship: BelongsToRelationship;
  declare type: string;
  declare parent: RecordReference;
  declare parentIdentifier: StableRecordIdentifier;

  // unsubscribe tokens given to us by the notification manager
  #token!: Object;
  #relatedToken: Object | null = null;

  @tracked _ref = 0;

  constructor(
    store: CoreStore,
    parentIdentifier: StableRecordIdentifier,
    belongsToRelationship: BelongsToRelationship,
    key: string
  ) {
    super(store, parentIdentifier);
    this.key = key;
    this.belongsToRelationship = belongsToRelationship;
    this.type = belongsToRelationship.definition.type;
    const parent = internalModelFactoryFor(store).peek(parentIdentifier);
    this.parent = parent!.recordReference;
    this.parentIdentifier = parentIdentifier;

    if (CUSTOM_MODEL_CLASS) {
      this.#token = store._notificationManager.subscribe(
        parentIdentifier,
        (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
          if ((bucket === 'relationships' || bucket === 'property') && notifiedKey === key) {
            this._ref++;
          }
        }
      );
    }

    // TODO inverse
  }

  destroy() {
    if (CUSTOM_MODEL_CLASS) {
      unsubscribe(this.#token);
      if (this.#relatedToken) {
        unsubscribe(this.#relatedToken);
      }
    }
  }

  @cached
  @dependentKeyCompat
  get _relatedIdentifier(): StableRecordIdentifier | null {
    this._ref; // consume the tracked prop
    if (this.#relatedToken) {
      unsubscribe(this.#relatedToken);
    }

    let resource = this._resource();
    if (resource && resource.data) {
      const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource.data);
      this.#relatedToken = this.store._notificationManager.subscribe(
        identifier,
        (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
          if (bucket === 'identity' || ((bucket === 'attributes' || bucket === 'property') && notifiedKey === 'id')) {
            this._ref++;
          }
        }
      );

      return identifier;
    }

    return null;
  }

  /**
   The `id` of the record that this reference refers to. Together, the
   `type()` and `id()` methods form a composite key for the identity
   map. This can be used to access the id of an async relationship
   without triggering a fetch that would normally happen if you
   attempted to use `record.get('relationship.id')`.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
    @belongsTo({ async: true }) user;
   }

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

   // get the identifier of the reference
   if (userRef.remoteType() === "id") {
      let id = userRef.id();
    }
   ```

   @method id
    @public
   @return {String} The id of the record in this belongsTo relationship.
   */
  id(): string | null {
    if (CUSTOM_MODEL_CLASS) {
      return this._relatedIdentifier?.id || null;
    }
    let resource = this._resource();
    if (resource && resource.data) {
      const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource.data);

      return identifier.id;
    }

    return null;
  }

  _resource() {
    return this.recordData.getBelongsTo(this.key);
  }

  /**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the canonical value of this
   relationship on the backend.

   Example

   ```app/models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
      @belongsTo({ async: true }) user;
    }

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

   // provide data for reference
   userRef.push({
      data: {
        type: 'user',
        id: 1,
        attributes: {
          username: "@user"
        }
      }
    }).then(function(user) {
      userRef.value() === user;
    });
   ```

   @method push
    @public
   @param {Object|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {Promise<record>} A promise that resolves with the new value in this belongs-to relationship.
   */
  async push(objectOrPromise: Object | SingleResourceDocument): Promise<Object> {
    // TODO deprecate thenable support
    return resolve(objectOrPromise).then((data) => {
      let record: Object;

      if (DEPRECATE_BELONGS_TO_REFERENCE_PUSH && peekRecordIdentifier(data)) {
        deprecate('Pushing a record into a BelongsToReference is deprecated', false, {
          id: 'ember-data:belongs-to-reference-push-record',
          until: '4.0',
          for: '@ember-data/store',
          since: {
            available: '3.16',
            enabled: '3.16',
          },
        });
        record = data as Object;
      } else {
        record = this.store.push(data as SingleResourceDocument);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      assertPolymorphicType(
        this.belongsToRelationship.identifier,
        this.belongsToRelationship.definition,
        recordIdentifierFor(record),
        this.store
      );

      const { graph, identifier } = this.belongsToRelationship;
      this.store._backburner.join(() => {
        graph.push({
          op: 'replaceRelatedRecord',
          record: identifier,
          field: this.key,
          value: recordIdentifierFor(record),
        });
      });

      return record;
    });
  }

  /**
   `value()` synchronously returns the current value of the belongs-to
   relationship. Unlike `record.get('relationshipName')`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
     @belongsTo({ async: true }) user;
   }

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

   userRef.value(); // null

   // provide data for reference
   userRef.push({
      data: {
        type: 'user',
        id: 1,
        attributes: {
          username: "@user"
        }
      }
    }).then(function(user) {
      userRef.value(); // user
    });
   ```

   @method value
    @public
   @return {Model} the record in this relationship
   */
  value(): Object | null {
    let resource = this._resource();
    if (resource && resource.data) {
      let inverseInternalModel = this.store._internalModelForResource(resource.data);
      if (inverseInternalModel && inverseInternalModel.currentState.isLoaded) {
        return inverseInternalModel.getRecord();
      }
    }

    return null;
  }

  /**
   Loads a record in a belongs-to relationship if it is not already
   loaded. If the relationship is already loaded this method does not
   trigger a new load.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
     @belongsTo({ async: true }) user;
   }

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

   userRef.value(); // null

   userRef.load().then(function(user) {
      userRef.value() === user
    });
   ```

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference.

   Example

   ```javascript
   userRef.load({ adapterOptions: { isPrivate: true } }).then(function(user) {
     userRef.value() === user;
   });
   ```
   ```app/adapters/user.js
   import Adapter from '@ember-data/adapter';

   export default class UserAdapter extends Adapter {
     findRecord(store, type, id, snapshot) {
       // In the adapter you will have access to adapterOptions.
       let adapterOptions = snapshot.adapterOptions;
     }
   });
   ```

   @method load
    @public
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the record in this belongs-to relationship.
   */
  load(options) {
    let parentInternalModel = internalModelFactoryFor(this.store).peek(this.parentIdentifier);
    return parentInternalModel!.getBelongsTo(this.key, options);
  }

  /**
   Triggers a reload of the value in this relationship. If the
   remoteType is `"link"` Ember Data will use the relationship link to
   reload the relationship. Otherwise it will reload the record by its
   id.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
     @belongsTo({ async: true }) user;
   }

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

   userRef.reload().then(function(user) {
      userRef.value() === user
    });
   ```

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference. A full example
   can be found in the `load` method.

   Example

   ```javascript
   userRef.reload({ adapterOptions: { isPrivate: true } })
   ```

   @method reload
    @public
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the record in this belongs-to relationship after the reload has completed.
   */
  reload(options) {
    let parentInternalModel = internalModelFactoryFor(this.store).peek(this.parentIdentifier);
    return parentInternalModel!.reloadBelongsTo(this.key, options).then((internalModel) => {
      return this.value();
    });
  }
}
