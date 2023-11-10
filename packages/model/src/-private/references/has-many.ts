import { DEBUG } from '@ember-data/env';
import type { CollectionEdge } from '@ember-data/graph/-private/edges/collection';
import type { Graph } from '@ember-data/graph/-private/graph';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { RecordInstance } from '@ember-data/store/-types/q/record-instance';
import type { FindOptions } from '@ember-data/store/-types/q/store';
import { cached, compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import type {
  CollectionResourceDocument,
  CollectionResourceRelationship,
  ExistingResourceObject,
  LinkObject,
  Meta,
  PaginationLinks,
  SingleResourceDocument,
} from '@warp-drive/core-types/spec/raw';

import { assertPolymorphicType } from '../debug/assert-polymorphic-type';
import { areAllInverseRecordsLoaded, LEGACY_SUPPORT, LegacySupport } from '../legacy-relationships-support';
import type ManyArray from '../many-array';

/**
  @module @ember-data/model
*/
interface ResourceIdentifier {
  links?: {
    related?: string | LinkObject;
  };
  meta?: Meta;
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
  declare graph: Graph;
  declare key: string;
  declare hasManyRelationship: CollectionEdge;
  declare type: string;
  declare store: Store;

  // unsubscribe tokens given to us by the notification manager
  ___token!: object;
  ___identifier: StableRecordIdentifier;
  ___relatedTokenMap!: Map<StableRecordIdentifier, object>;

  declare _ref: number;

  constructor(
    store: Store,
    graph: Graph,
    parentIdentifier: StableRecordIdentifier,
    hasManyRelationship: CollectionEdge,
    key: string
  ) {
    this.graph = graph;
    this.key = key;
    this.hasManyRelationship = hasManyRelationship;
    this.type = hasManyRelationship.definition.type;

    this.store = store;
    this.___identifier = parentIdentifier;
    this.___token = store.notifications.subscribe(
      parentIdentifier,
      (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
        if (bucket === 'relationships' && notifiedKey === key) {
          this._ref++;
        }
      }
    );
    this.___relatedTokenMap = new Map();
    // TODO inverse
  }

  destroy() {
    this.store.notifications.unsubscribe(this.___token);
    this.___relatedTokenMap.forEach((token) => {
      this.store.notifications.unsubscribe(token);
    });
    this.___relatedTokenMap.clear();
  }

  /**
   * An array of identifiers for the records that this reference refers to.
   *
   * @property {StableRecordIdentifier[]} identifiers
   * @public
   */
  @cached
  @compat
  get identifiers(): StableRecordIdentifier[] {
    this._ref; // consume the tracked prop

    const resource = this._resource();

    const map = this.___relatedTokenMap;
    this.___relatedTokenMap = new Map();

    if (resource && resource.data) {
      return resource.data.map((resourceIdentifier) => {
        const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resourceIdentifier);
        let token = map.get(identifier);

        if (token) {
          map.delete(identifier);
        } else {
          token = this.store.notifications.subscribe(
            identifier,
            (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
              if (bucket === 'identity' || (bucket === 'attributes' && notifiedKey === 'id')) {
                this._ref++;
              }
            }
          );
        }
        this.___relatedTokenMap.set(identifier, token);

        return identifier;
      });
    }

    map.forEach((token) => {
      this.store.notifications.unsubscribe(token);
    });
    map.clear();

    return [];
  }

  _resource() {
    const cache = this.store.cache;
    return cache.getRelationship(this.___identifier, this.key) as CollectionResourceRelationship;
  }

  /**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany('comment', { async: true, inverse: null }) comments;
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
    const value = this._resource();
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
     @hasMany('comment', { async: true, inverse: null }) comments;
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
    return this.identifiers.map((identifier) => identifier.id);
  }

  /**
   The link Ember Data will use to fetch or reload this belongs-to
   relationship. By default it uses only the "related" resource linkage.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';
   export default Model.extend({
      user: belongsTo('user', { async: true, inverse: null })
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
    const resource = this._resource();

    if (isResourceIdentiferWithRelatedLinks(resource)) {
      if (resource.links) {
        const related = resource.links.related;
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
    const resource = this._resource();

    return resource && resource.links ? resource.links : null;
  }

  /**
   The meta data for the has-many relationship.

   Example

   ```javascript
   // models/blog.js
   import Model, { hasMany } from '@ember-data/model';
   export default Model.extend({
      users: hasMany('user', { async: true, inverse: null })
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
    let meta: Meta | null = null;
    const resource = this._resource();
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
     @hasMany('comment', { async: true, inverse: null }) comments;
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
    const payload = objectOrPromise;
    let array: Array<ExistingResourceObject | SingleResourceDocument>;

    if (!Array.isArray(payload) && typeof payload === 'object' && Array.isArray(payload.data)) {
      array = payload.data;
    } else {
      array = payload as ExistingResourceObject[];
    }

    const { store } = this;

    const identifiers = array.map((obj) => {
      let record: RecordInstance;
      if ('data' in obj) {
        // TODO deprecate pushing non-valid JSON:API here
        record = store.push(obj);
      } else {
        record = store.push({ data: obj });
      }

      if (DEBUG) {
        const relationshipMeta = this.hasManyRelationship.definition;
        const identifier = this.hasManyRelationship.identifier;

        assertPolymorphicType(identifier, relationshipMeta, recordIdentifierFor(record), store);
      }
      return recordIdentifierFor(record);
    });

    const { identifier } = this.hasManyRelationship;
    store._join(() => {
      this.graph.push({
        op: 'replaceRelatedRecords',
        record: identifier,
        field: this.key,
        value: identifiers,
      });
    });

    return this.load();
  }

  _isLoaded() {
    const hasRelationshipDataProperty = this.hasManyRelationship.state.hasReceivedData;
    if (!hasRelationshipDataProperty) {
      return false;
    }

    const relationship = this.graph.getData(this.hasManyRelationship.identifier, this.key) as CollectionRelationship;

    return relationship.data?.every((identifier) => {
      return this.store._instanceCache.recordIsLoaded(identifier, true) === true;
    });
  }

  /**
   `value()` synchronously returns the current value of the has-many
   relationship. Unlike `record.relationshipName`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany('comment', { async: true, inverse: null }) comments;
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

   post.comments.then(function(comments) {
     commentsRef.value() === comments
   })
   ```

   @method value
    @public
   @return {ManyArray}
   */
  value() {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;

    const loaded = this._isLoaded();

    if (!loaded) {
      // subscribe to changes
      // for when we are not loaded yet
      this._ref;
      return null;
    }

    return support.getManyArray(this.key);
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
     @hasMany('comment', { async: true, inverse: null }) comments;
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
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    const fetchSyncRel =
      !this.hasManyRelationship.definition.isAsync && !areAllInverseRecordsLoaded(this.store, this._resource());
    return fetchSyncRel
      ? (support.reloadHasMany(this.key, options) as Promise<ManyArray>)
      : (support.getHasMany(this.key, options) as Promise<ManyArray> | ManyArray); // this cast is necessary because typescript does not work properly with custom thenables;
  }

  /**
   Reloads this has-many relationship. This causes a request to the specified
   relationship link or reloads all items currently in the relationship.

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany('comment', { async: true, inverse: null }) comments;
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
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    return support.reloadHasMany(this.key, options);
  }
}
defineSignal(HasManyReference.prototype, '_ref', 0);
