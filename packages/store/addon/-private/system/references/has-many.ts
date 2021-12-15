import { dependentKeyCompat } from '@ember/object/compat';
import { DEBUG } from '@glimmer/env';
import { cached, tracked } from '@glimmer/tracking';

import { resolve } from 'rsvp';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import type { ManyRelationship } from '@ember-data/record-data/-private';
import { assertPolymorphicType } from '@ember-data/store/-debug';

import {
  CollectionResourceDocument,
  ExistingResourceObject,
  SingleResourceDocument,
} from '../../ts-interfaces/ember-data-json-api';
import { StableRecordIdentifier } from '../../ts-interfaces/identifier';
import CoreStore from '../core-store';
import { NotificationType, unsubscribe } from '../record-notification-manager';
import { internalModelFactoryFor, recordIdentifierFor } from '../store/internal-model-factory';
import RecordReference from './record';
import Reference, { internalModelForReference } from './reference';

/**
  @module @ember-data/store
*/

/**
 A `HasManyReference` is a low-level API that allows users and addon
 authors to perform meta-operations on a has-many relationship.

 @class HasManyReference
 @public
 @extends Reference
 */
export default class HasManyReference extends Reference {
  declare key: string;
  declare hasManyRelationship: ManyRelationship;
  declare type: string;
  declare parent: RecordReference;
  declare parentIdentifier: StableRecordIdentifier;

  // unsubscribe tokens given to us by the notification manager
  #token!: Object;
  #relatedTokenMap!: Map<StableRecordIdentifier, Object>;

  @tracked _ref = 0;

  constructor(
    store: CoreStore,
    parentIdentifier: StableRecordIdentifier,
    hasManyRelationship: ManyRelationship,
    key: string
  ) {
    super(store, parentIdentifier);
    this.key = key;
    this.hasManyRelationship = hasManyRelationship;
    this.type = hasManyRelationship.definition.type;

    this.parent = internalModelFactoryFor(store).peek(parentIdentifier)!.recordReference;

    if (CUSTOM_MODEL_CLASS) {
      this.#token = store._notificationManager.subscribe(
        parentIdentifier,
        (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
          if ((bucket === 'relationships' || bucket === 'property') && notifiedKey === key) {
            this._ref++;
          }
        }
      );
      this.#relatedTokenMap = new Map();
    }
    // TODO inverse
  }

  destroy() {
    if (CUSTOM_MODEL_CLASS) {
      unsubscribe(this.#token);
      this.#relatedTokenMap.forEach((token) => {
        unsubscribe(token);
      });
      this.#relatedTokenMap.clear();
    }
  }

  @cached
  @dependentKeyCompat
  get _relatedIdentifiers(): StableRecordIdentifier[] {
    this._ref; // consume the tracked prop

    let resource = this._resource();

    this.#relatedTokenMap.forEach((token) => {
      unsubscribe(token);
    });
    this.#relatedTokenMap.clear();

    if (resource && resource.data) {
      return resource.data.map((resourceIdentifier) => {
        const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resourceIdentifier);
        const token = this.store._notificationManager.subscribe(
          identifier,
          (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
            if (bucket === 'identity' || ((bucket === 'attributes' || bucket === 'property') && notifiedKey === 'id')) {
              this._ref++;
            }
          }
        );

        this.#relatedTokenMap.set(identifier, token);

        return identifier;
      });
    }

    return [];
  }

  _resource() {
    return this.recordData.getHasMany(this.key);
  }

  /**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany({ async: true }) comments;
   }
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   // get the identifier of the reference
   if (commentsRef.remoteType() === "ids") {
     let ids = commentsRef.ids();
   } else if (commentsRef.remoteType() === "link") {
     let link = commentsRef.link();
   }
   ```

   @method remoteType
   @public
   @return {String} The name of the remote type. This should either be `link` or `ids`
   */
  remoteType(): 'link' | 'ids' {
    let value = this._resource();
    if (value && value.links && value.links.related) {
      return 'link';
    }

    return 'ids';
  }

  /**
   `ids()` returns an array of the record IDs in this relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany({ async: true }) comments;
   }
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']
   ```

   @method ids
    @public
   @return {Array} The ids in this has-many relationship
   */
  ids(): Array<string | null> {
    if (CUSTOM_MODEL_CLASS) {
      return this._relatedIdentifiers.map((identifier) => identifier.id);
    }

    let resource = this._resource();

    if (resource && resource.data) {
      return resource.data.map((resourceIdentifier) => {
        const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resourceIdentifier);

        return identifier.id;
      });
    }

    return [];
  }

  /**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the canonical value of this
   relationship on the backend.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany({ async: true }) comments;
   }
   ```

   ```
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.ids(); // ['1']

   commentsRef.push([
   [{ type: 'comment', id: 2 }],
   [{ type: 'comment', id: 3 }],
   ])

   commentsRef.ids(); // ['2', '3']
   ```

   @method push
    @public
   @param {Array|Promise} objectOrPromise a promise that resolves to a JSONAPI document object describing the new value of this relationship.
   @return {ManyArray}
   */
  async push(
    objectOrPromise: ExistingResourceObject[] | CollectionResourceDocument | { data: SingleResourceDocument[] }
  ): Promise<any> {
    const payload = await resolve(objectOrPromise);
    let array: Array<ExistingResourceObject | SingleResourceDocument>;

    if (!Array.isArray(payload) && typeof payload === 'object' && Array.isArray(payload.data)) {
      array = payload.data;
    } else {
      array = payload as ExistingResourceObject[];
    }

    const internalModel = internalModelForReference(this)!;
    const { store } = this;

    let identifiers = array.map((obj) => {
      let record;
      if ('data' in obj) {
        // TODO deprecate pushing non-valid JSON:API here
        record = store.push(obj);
      } else {
        record = store.push({ data: obj });
      }

      if (DEBUG) {
        let relationshipMeta = this.hasManyRelationship.definition;
        let identifier = this.hasManyRelationship.identifier;
        assertPolymorphicType(identifier, relationshipMeta, recordIdentifierFor(record), store);
      }
      return recordIdentifierFor(record);
    });

    const { graph, identifier } = this.hasManyRelationship;
    store._backburner.join(() => {
      graph.push({
        op: 'replaceRelatedRecords',
        record: identifier,
        field: this.key,
        value: identifiers,
      });
    });

    // TODO IGOR it seems wrong that we were returning the many array here
    return internalModel.getHasMany(this.key);
  }

  _isLoaded() {
    let hasRelationshipDataProperty = this.hasManyRelationship.state.hasReceivedData;
    if (!hasRelationshipDataProperty) {
      return false;
    }

    let members = this.hasManyRelationship.currentState;

    //TODO Igor cleanup
    return members.every((identifier) => {
      let internalModel = this.store._internalModelForResource(identifier);
      return internalModel.currentState.isLoaded === true;
    });
  }

  /**
   `value()` synchronously returns the current value of the has-many
   relationship. Unlike `record.get('relationshipName')`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany({ async: true }) comments;
   }
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   post.get('comments').then(function(comments) {
     commentsRef.value() === comments
   })
   ```

   @method value
    @public
   @return {ManyArray}
   */
  value() {
    let internalModel = internalModelForReference(this)!;
    if (this._isLoaded()) {
      return internalModel.getManyArray(this.key);
    }

    return null;
  }

  /**
   Loads the relationship if it is not already loaded.  If the
   relationship is already loaded this method does not trigger a new
   load. This causes a request to the specified
   relationship link or reloads all items currently in the relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany({ async: true }) comments;
   }
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.load().then(function(comments) {
     //...
   });
   ```

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference.

   Example

   ```javascript
   commentsRef.load({ adapterOptions: { isPrivate: true } })
     .then(function(comments) {
       //...
     });
   ```

   ```app/adapters/comment.js
   export default ApplicationAdapter.extend({
     findMany(store, type, id, snapshots) {
       // In the adapter you will have access to adapterOptions.
       let adapterOptions = snapshots[0].adapterOptions;
     }
   });
   ```

   @method load
    @public
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the ManyArray in
   this has-many relationship.
   */
  load(options) {
    let internalModel = internalModelForReference(this)!;
    return internalModel.getHasMany(this.key, options);
  }

  /**
   Reloads this has-many relationship. This causes a request to the specified
   relationship link or reloads all items currently in the relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany({ async: true }) comments;
   }
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   commentsRef.reload().then(function(comments) {
     //...
   });
   ```

   You may also pass in an options object whose properties will be
   fed forward. This enables you to pass `adapterOptions` into the
   request given to the adapter via the reference. A full example
   can be found in the `load` method.

   Example

   ```javascript
   commentsRef.reload({ adapterOptions: { isPrivate: true } })
   ```

   @method reload
    @public
   @param {Object} options the options to pass in.
   @return {Promise} a promise that resolves with the ManyArray in this has-many relationship.
   */
  reload(options) {
    let internalModel = internalModelForReference(this)!;
    return internalModel.reloadHasMany(this.key, options);
  }
}
