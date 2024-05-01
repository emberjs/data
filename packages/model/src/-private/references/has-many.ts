import { assert } from '@ember/debug';

import type { CollectionEdge } from '@ember-data/graph/-private/edges/collection';
import type { Graph } from '@ember-data/graph/-private/graph';
import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { BaseFinderOptions } from '@ember-data/store/-types/q/store';
import { cached, compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import type { TypeFromInstanceOrString } from '@warp-drive/core-types/record';
import type {
  CollectionResourceDocument,
  CollectionResourceRelationship,
  ExistingResourceObject,
  LinkObject,
  Meta,
  PaginationLinks,
} from '@warp-drive/core-types/spec/raw';

import type { IsUnknown } from '../belongs-to';
import { assertPolymorphicType } from '../debug/assert-polymorphic-type';
import type { LegacySupport } from '../legacy-relationships-support';
import { areAllInverseRecordsLoaded, LEGACY_SUPPORT } from '../legacy-relationships-support';
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

type ArrayItemType<T> = T extends (infer U)[] ? U : never;

function isResourceIdentiferWithRelatedLinks(
  value: CollectionResourceRelationship | ResourceIdentifier | null
): value is ResourceIdentifier & { links: { related: string | LinkObject | null } } {
  return Boolean(value && value.links && value.links.related);
}
/**
 A `HasManyReference` is a low-level API that allows access
 and manipulation of a hasMany relationship.

 It is especially useful when you're dealing with `async` relationships
 from `@ember-data/model` as it allows synchronous access to
 the relationship data if loaded, as well as APIs for loading, reloading
 the data or accessing available information without triggering a load.

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

 @class HasManyReference
 @public
 */
export default class HasManyReference<
  T = unknown,
  K extends string = IsUnknown<T> extends true ? string : keyof T & string,
  Related = K extends keyof T ? ArrayItemType<Awaited<T[K]>> : unknown,
> {
  declare graph: Graph;
  declare store: Store;
  declare hasManyRelationship: CollectionEdge;
  /**
   * The field name on the parent record for this has-many relationship.
   *
   * @property {String} key
   * @public
   */
  declare key: K;

  /**
   * The type of resource this relationship will contain.
   *
   * @property {String} type
   * @public
   */
  declare type: TypeFromInstanceOrString<Related>;

  // unsubscribe tokens given to us by the notification manager
  ___token!: object;
  ___identifier: StableRecordIdentifier<TypeFromInstanceOrString<T>>;
  ___relatedTokenMap!: Map<StableRecordIdentifier, object>;

  declare _ref: number;

  constructor(
    store: Store,
    graph: Graph,
    parentIdentifier: StableRecordIdentifier<TypeFromInstanceOrString<T>>,
    hasManyRelationship: CollectionEdge,
    key: K
  ) {
    this.graph = graph;
    this.key = key;
    this.hasManyRelationship = hasManyRelationship;
    this.type = hasManyRelationship.definition.type as TypeFromInstanceOrString<Related>;

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

  /**
   * This method should never be called by user code.
   *
   * @internal
   */
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
  get identifiers(): StableRecordIdentifier<TypeFromInstanceOrString<Related>>[] {
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

        return identifier as StableRecordIdentifier<TypeFromInstanceOrString<Related>>;
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
   * @return
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
  @return {Object|null} The meta information for the belongs-to relationship.
  */
  meta(): Meta | null {
    let meta: Meta | null = null;
    const resource = this._resource();
    if (resource && resource.meta && typeof resource.meta === 'object') {
      meta = resource.meta;
    }
    return meta;
  }

  /**
   `push` can be used to update the data in the relationship and EmberData
   will treat the new data as the canonical value of this relationship on
   the backend. An empty array will signify the canonical value should be
   empty.

   Example model

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default class PostModel extends Model {
     @hasMany('comment', { async: true, inverse: null }) comments;
   }
   ```

   Setup some initial state, note we haven't loaded the comments yet:

   ```js
   const post = store.push({
     data: {
       type: 'post',
       id: '1',
       relationships: {
         comments: {
           data: [{ type: 'comment', id: '1' }]
         }
       }
     }
   });

   const commentsRef = post.hasMany('comments');
   commentsRef.ids(); // ['1']
   ```

   Update the state using `push`, note we can do this even without
   having loaded these comments yet by providing resource identifiers.

   Both full resources and resource identifiers are supported.

   ```js
   await commentsRef.push({
    data: [
     { type: 'comment', id: '2' },
     { type: 'comment', id: '3' },
    ]
   });

   commentsRef.ids(); // ['2', '3']
   ```

   For convenience, you can also pass in an array of resources or resource identifiers
   without wrapping them in the `data` property:

   ```js
   await commentsRef.push([
     { type: 'comment', id: '4' },
     { type: 'comment', id: '5' },
   ]);

   commentsRef.ids(); // ['4', '5']
   ```

   When using the `data` property, you may also include other resource data via included,
   as well as provide new links and meta to the relationship.

   ```js
   await commentsRef.push({
     links: {
       related: '/posts/1/comments'
     },
     meta: {
       total: 2
     },
     data: [
       { type: 'comment', id: '4' },
       { type: 'comment', id: '5' },
     ],
     included: [
       { type: 'other-thing', id: '1', attributes: { foo: 'bar' },
     ]
   });
   ```

   By default, the store will attempt to fetch any unloaded records before resolving
   the returned promise with the ManyArray.

   Alternatively, pass `true` as the second argument to avoid fetching unloaded records
   and instead the promise will resolve with void without attempting to fetch. This is
   particularly useful if you want to update the state of the relationship without
   forcing the load of all of the associated records.

   @method push
   @public
   @param {Array|Object} doc a JSONAPI document object describing the new value of this relationship.
   @param {Boolean} [skipFetch] if `true`, do not attempt to fetch unloaded records
   @return {Promise<ManyArray | void>}
  */
  async push(
    doc: ExistingResourceObject[] | CollectionResourceDocument,
    skipFetch?: boolean
  ): Promise<ManyArray<Related> | void> {
    const { store } = this;
    const dataDoc = Array.isArray(doc) ? { data: doc } : doc;
    const isResourceData = Array.isArray(dataDoc.data) && dataDoc.data.length > 0 && isMaybeResource(dataDoc.data[0]);

    // enforce that one of links, meta or data is present
    assert(
      `You must provide at least one of 'links', 'meta' or 'data' when calling hasManyReference.push`,
      'links' in dataDoc || 'meta' in dataDoc || 'data' in dataDoc
    );

    const identifiers = !Array.isArray(dataDoc.data)
      ? []
      : isResourceData
        ? (store._push(dataDoc, true) as StableRecordIdentifier[])
        : dataDoc.data.map((i) => store.identifierCache.getOrCreateRecordIdentifier(i));
    const { identifier } = this.hasManyRelationship;

    if (DEBUG) {
      const relationshipMeta = this.hasManyRelationship.definition;

      identifiers.forEach((added) => {
        assertPolymorphicType(identifier, relationshipMeta, added, store);
      });
    }

    const newData: CollectionResourceRelationship = {};
    // only set data if it was passed in
    if (Array.isArray(dataDoc.data)) {
      newData.data = identifiers;
    }
    if ('links' in dataDoc) {
      newData.links = dataDoc.links;
    }
    if ('meta' in dataDoc) {
      newData.meta = dataDoc.meta;
    }
    store._join(() => {
      this.graph.push({
        op: 'updateRelationship',
        record: identifier,
        field: this.key,
        value: newData,
      });
    });

    if (!skipFetch) return this.load();
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
  value(): ManyArray<Related> | null {
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

    return support.getManyArray<Related>(this.key);
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
  async load(options?: BaseFinderOptions): Promise<ManyArray<Related>> {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    const fetchSyncRel =
      !this.hasManyRelationship.definition.isAsync && !areAllInverseRecordsLoaded(this.store, this._resource());
    return fetchSyncRel
      ? (support.reloadHasMany(this.key, options) as Promise<ManyArray<Related>>)
      : // we cast to fix the return type since typescript and eslint don't understand async functions
        // properly
        (support.getHasMany(this.key, options) as Promise<ManyArray<Related>> | ManyArray<Related>);
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
  reload(options?: BaseFinderOptions): Promise<ManyArray<Related>> {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    return support.reloadHasMany(this.key, options) as Promise<ManyArray<Related>>;
  }
}
defineSignal(HasManyReference.prototype, '_ref', 0);

export function isMaybeResource(object: ExistingResourceObject | ResourceIdentifier): object is ExistingResourceObject {
  const keys = Object.keys(object).filter((k) => k !== 'id' && k !== 'type' && k !== 'lid');
  return keys.length > 0;
}
