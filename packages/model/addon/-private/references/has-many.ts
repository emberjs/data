import { dependentKeyCompat } from '@ember/object/compat';
import { DEBUG } from '@glimmer/env';
import { cached, tracked } from '@glimmer/tracking';

import type { Object as JSONObject, Value as JSONValue } from 'json-typescript';
import { resolve } from 'rsvp';

import { ManyArray } from 'ember-data/-private';

import type { ManyRelationship } from '@ember-data/record-data/-private';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import type { NotificationType } from '@ember-data/store/-private/record-notification-manager';
import type { DebugWeakCache } from '@ember-data/store/-private/weak-cache';
import type {
  CollectionResourceDocument,
  CollectionResourceRelationship,
  ExistingResourceObject,
  LinkObject,
  PaginationLinks,
  SingleResourceDocument,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import type { LegacySupport } from '../legacy-relationships-support';
import { LEGACY_SUPPORT } from '../model';

/**
  @module @ember-data/model
*/
interface ResourceIdentifier {
  links?: {
    related?: string | LinkObject;
  };
  meta?: JSONObject;
}

function isResourceIdentiferWithRelatedLinks(
  value: CollectionResourceRelationship | ResourceIdentifier | null
): value is ResourceIdentifier & { links: { related: string | LinkObject | null } } {
  return Boolean(value && value.links && value.links.related);
}
/**
 A `HasManyReference` is a low-level API that allows users and addon
 authors to perform meta-operations on a has-many relationship.

 @class HasManyReference
 @public
 @extends Reference
 */
export default class HasManyReference {
  declare key: string;
  declare hasManyRelationship: ManyRelationship;
  declare type: string;
  declare store: Store;

  // unsubscribe tokens given to us by the notification manager
  #token!: Object;
  #identifier: StableRecordIdentifier;
  #relatedTokenMap!: Map<StableRecordIdentifier, Object>;

  @tracked _ref = 0;

  constructor(
    store: Store,
    parentIdentifier: StableRecordIdentifier,
    hasManyRelationship: ManyRelationship,
    key: string
  ) {
    this.key = key;
    this.hasManyRelationship = hasManyRelationship;
    this.type = hasManyRelationship.definition.type;

    this.store = store;
    this.#identifier = parentIdentifier;
    this.#token = store._notificationManager.subscribe(
      parentIdentifier,
      (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
        if ((bucket === 'relationships' || bucket === 'property') && notifiedKey === key) {
          this._ref++;
        }
      }
    );
    this.#relatedTokenMap = new Map();
    // TODO inverse
  }

  destroy() {
    this.store._notificationManager.unsubscribe(this.#token);
    this.#relatedTokenMap.forEach((token) => {
      this.store._notificationManager.unsubscribe(token);
    });
    this.#relatedTokenMap.clear();
  }

  @cached
  @dependentKeyCompat
  get _relatedIdentifiers(): StableRecordIdentifier[] {
    this._ref; // consume the tracked prop

    let resource = this._resource();

    this.#relatedTokenMap.forEach((token) => {
      this.store._notificationManager.unsubscribe(token);
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
    return this.store._instanceCache.recordDataFor(this.#identifier, false).getHasMany(this.key);
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
    return this._relatedIdentifiers.map((identifier) => identifier.id);
  }

  /**
   The link Ember Data will use to fetch or reload this belongs-to
   relationship. By default it uses only the "related" resource linkage.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';
   export default Model.extend({
      user: belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            links: {
              related: '/articles/1/author'
            }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   // get the identifier of the reference
   if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }
   ```

   @method link
   @public
   @return {String} The link Ember Data will use to fetch or reload this belongs-to relationship.
   */
  link(): string | null {
    let resource = this._resource();

    if (isResourceIdentiferWithRelatedLinks(resource)) {
      if (resource.links) {
        let related = resource.links.related;
        return !related || typeof related === 'string' ? related : related.href;
      }
    }
    return null;
  }

  /**
   * any links that have been received for this relationship
   *
   * @method links
   * @public
   * @returns
   */
  links(): PaginationLinks | null {
    let resource = this._resource();

    return resource && resource.links ? resource.links : null;
  }

  /**
   The meta data for the has-many relationship.

   Example

   ```javascript
   // models/blog.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
      users: hasMany({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          users: {
            links: {
              related: {
                href: '/articles/1/authors'
              },
            },
            meta: {
              lastUpdated: 1458014400000
            }
          }
        }
      }
    });

   let usersRef = blog.hasMany('user');

   usersRef.meta() // { lastUpdated: 1458014400000 }
   ```

  @method meta
  @public
  @return {Object} The meta information for the belongs-to relationship.
  */
  meta() {
    let meta: Dict<JSONValue> | null = null;
    let resource = this._resource();
    if (resource && resource.meta && typeof resource.meta === 'object') {
      meta = resource.meta;
    }
    return meta;
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
  ): Promise<ManyArray> {
    const payload = await resolve(objectOrPromise);
    let array: Array<ExistingResourceObject | SingleResourceDocument>;

    if (!Array.isArray(payload) && typeof payload === 'object' && Array.isArray(payload.data)) {
      array = payload.data;
    } else {
      array = payload as ExistingResourceObject[];
    }

    const { store } = this;

    let identifiers = array.map((obj) => {
      let record: RecordInstance;
      if ('data' in obj) {
        // TODO deprecate pushing non-valid JSON:API here
        record = store.push(obj);
      } else {
        record = store.push({ data: obj });
      }

      if (DEBUG) {
        let relationshipMeta = this.hasManyRelationship.definition;
        let identifier = this.hasManyRelationship.identifier;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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

    return this.load();
  }

  _isLoaded() {
    let hasRelationshipDataProperty = this.hasManyRelationship.state.hasReceivedData;
    if (!hasRelationshipDataProperty) {
      return false;
    }

    let members = this.hasManyRelationship.currentState;

    //TODO @runspired determine isLoaded via a better means
    return members.every((identifier) => {
      let internalModel = this.store._instanceCache._internalModelForResource(identifier);
      return internalModel.isLoaded === true;
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
    const support: LegacySupport = (
      LEGACY_SUPPORT as DebugWeakCache<StableRecordIdentifier, LegacySupport>
    ).getWithError(this.#identifier);

    return this._isLoaded() ? support.getManyArray(this.key) : null;
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
  async load(options?: FindOptions): Promise<ManyArray> {
    const support: LegacySupport = (
      LEGACY_SUPPORT as DebugWeakCache<StableRecordIdentifier, LegacySupport>
    ).getWithError(this.#identifier);
    return support.getHasMany(this.key, options) as Promise<ManyArray> | ManyArray; // this cast is necessary because typescript does not work properly with custom thenables;
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
  reload(options?: FindOptions) {
    const support: LegacySupport = (
      LEGACY_SUPPORT as DebugWeakCache<StableRecordIdentifier, LegacySupport>
    ).getWithError(this.#identifier);
    return support.reloadHasMany(this.key, options);
  }
}
