import type { ResourceEdge } from '@ember-data/graph/-private/edges/resource';
import type { Graph } from '@ember-data/graph/-private/graph';
import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import { cached, compat } from '@ember-data/tracking';
import { defineSignal } from '@ember-data/tracking/-private';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { StableExistingRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { TypeFromInstanceOrString } from '@warp-drive/core-types/record';
import type {
  LinkObject,
  Links,
  Meta,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@warp-drive/core-types/spec/raw';

import type { IsUnknown } from '../belongs-to';
import { assertPolymorphicType } from '../debug/assert-polymorphic-type';
import type { LegacySupport } from '../legacy-relationships-support';
import { areAllInverseRecordsLoaded, LEGACY_SUPPORT } from '../legacy-relationships-support';
import { isMaybeResource } from './has-many';

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
  value: SingleResourceRelationship | ResourceIdentifier | null
): value is ResourceIdentifier & { links: { related: string | LinkObject | null } } {
  return Boolean(value && value.links && value.links.related);
}

/**
 A `BelongsToReference` is a low-level API that allows access
 and manipulation of a belongsTo relationship.

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

 @class BelongsToReference
 @public
 */
export default class BelongsToReference<
  T = unknown,
  K extends string = IsUnknown<T> extends true ? string : keyof T & string,
  Related = K extends keyof T ? Awaited<T[K]> : unknown,
> {
  declare graph: Graph;
  declare store: Store;
  declare belongsToRelationship: ResourceEdge;
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
  declare ___token: object;
  declare ___identifier: StableRecordIdentifier<TypeFromInstanceOrString<T>>;
  declare ___relatedToken: object | null;

  declare _ref: number;

  constructor(
    store: Store,
    graph: Graph,
    parentIdentifier: StableRecordIdentifier<TypeFromInstanceOrString<T>>,
    belongsToRelationship: ResourceEdge,
    key: K
  ) {
    this.graph = graph;
    this.key = key;
    this.belongsToRelationship = belongsToRelationship;
    this.type = belongsToRelationship.definition.type as TypeFromInstanceOrString<Related>;
    this.store = store;
    this.___identifier = parentIdentifier;
    this.___relatedToken = null;

    this.___token = store.notifications.subscribe(
      parentIdentifier,
      (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
        if (bucket === 'relationships' && notifiedKey === key) {
          this._ref++;
        }
      }
    );

    // TODO inverse
  }

  destroy() {
    // TODO @feature we need the notification manager often enough
    // we should potentially just expose it fully public
    this.store.notifications.unsubscribe(this.___token);
    this.___token = null as unknown as object;
    if (this.___relatedToken) {
      this.store.notifications.unsubscribe(this.___relatedToken);
      this.___relatedToken = null;
    }
  }

  /**
   * The identifier of the record that this reference refers to.
   * `null` if no related record is known.
   *
   * @property {StableRecordIdentifier | null} identifier
   * @public
   */
  @cached
  @compat
  get identifier(): StableRecordIdentifier<TypeFromInstanceOrString<Related>> | null {
    if (this.___relatedToken) {
      this.store.notifications.unsubscribe(this.___relatedToken);
      this.___relatedToken = null;
    }

    const resource = this._resource();
    if (resource && resource.data) {
      const identifier = this.store.identifierCache.getOrCreateRecordIdentifier(resource.data);
      this.___relatedToken = this.store.notifications.subscribe(
        identifier,
        (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
          if (bucket === 'identity' || (bucket === 'attributes' && notifiedKey === 'id')) {
            this._ref++;
          }
        }
      );

      return identifier as StableRecordIdentifier<TypeFromInstanceOrString<Related>>;
    }

    return null;
  }

  /**
   The `id` of the record that this reference refers to. Together, the
   `type()` and `id()` methods form a composite key for the identity
   map. This can be used to access the id of an async relationship
   without triggering a fetch that would normally happen if you
   attempted to use `record.relationship.id`.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
    @belongsTo('user', { async: true, inverse: null }) user;
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
    return this.identifier?.id || null;
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
  links(): Links | null {
    const resource = this._resource();

    return resource && resource.links ? resource.links : null;
  }

  /**
   The meta data for the belongs-to relationship.

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
              related: {
                href: '/articles/1/author'
              },
            },
            meta: {
              lastUpdated: 1458014400000
            }
          }
        }
      }
    });

   let userRef = blog.belongsTo('user');

   userRef.meta() // { lastUpdated: 1458014400000 }
   ```

   @method meta
    @public
   @return {Object} The meta information for the belongs-to relationship.
   */
  meta(): Meta | null {
    let meta: Meta | null = null;
    const resource = this._resource();
    if (resource && resource.meta && typeof resource.meta === 'object') {
      meta = resource.meta;
    }
    return meta;
  }

  _resource() {
    this._ref; // subscribe
    const cache = this.store.cache;
    return cache.getRelationship(this.___identifier, this.key) as SingleResourceRelationship;
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
   @return {String} The name of the remote type. This should either be `link` or `id`
   */
  remoteType(): 'link' | 'id' {
    const value = this._resource();
    if (isResourceIdentiferWithRelatedLinks(value)) {
      return 'link';
    }
    return 'id';
  }

  /**
   `push` can be used to update the data in the relationship and EmberData
   will treat the new data as the canonical value of this relationship on
   the backend. A value of `null` (e.g. `{ data: null }`) can be passed to
   clear the relationship.

   Example model

   ```app/models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
      @belongsTo('user', { async: true, inverse: null }) user;
    }
   ```

   Setup some initial state, note we haven't loaded the user yet:

   ```js
   const blog = store.push({
      data: {
        type: 'blog',
        id: '1',
        relationships: {
          user: {
            data: { type: 'user', id: '1' }
          }
        }
      }
   });

   const userRef = blog.belongsTo('user');
   userRef.id(); // '1'
   ```

   Update the state using `push`, note we can do this even without
   having loaded the user yet by providing a resource-identifier.

   Both full a resource and a resource-identifier are supported.

   ```js
   await userRef.push({
      data: {
        type: 'user',
        id: '2',
      }
    });

    userRef.id(); // '2'
   ```

   You may also pass in links and meta fore the relationship, and sideload
   additional resources that might be required.

   ```js
    await userRef.push({
        data: {
          type: 'user',
          id: '2',
        },
        links: {
          related: '/articles/1/author'
        },
        meta: {
          lastUpdated: Date.now()
        },
        included: [
          {
            type: 'user-preview',
            id: '2',
            attributes: {
              username: '@runspired'
            }
          }
        ]
      });
    ```

   By default, the store will attempt to fetch the record if it is not loaded or its
   resource data is not included in the call to `push` before resolving the returned
   promise with the new state..

   Alternatively, pass `true` as the second argument to avoid fetching unloaded records
   and instead the promise will resolve with void without attempting to fetch. This is
   particularly useful if you want to update the state of the relationship without
   forcing the load of all of the associated record.

   @method push
   @public
   @param {Object} doc a JSONAPI document object describing the new value of this relationship.
   @param {Boolean} [skipFetch] if `true`, do not attempt to fetch unloaded records
   @return {Promise<OpaqueRecordInstance | null | void>}
  */
  async push(doc: SingleResourceDocument, skipFetch?: boolean): Promise<Related | null | void> {
    const { store } = this;
    const isResourceData = doc.data && isMaybeResource(doc.data);
    const added = isResourceData
      ? (store._push(doc, true) as StableExistingRecordIdentifier)
      : doc.data
        ? (store.identifierCache.getOrCreateRecordIdentifier(doc.data) as StableExistingRecordIdentifier)
        : null;
    const { identifier } = this.belongsToRelationship;

    if (DEBUG) {
      if (added) {
        assertPolymorphicType(identifier, this.belongsToRelationship.definition, added, store);
      }
    }

    const newData: SingleResourceRelationship = {};

    // only set data if it was passed in
    if (doc.data || doc.data === null) {
      newData.data = added;
    }
    if ('links' in doc) {
      newData.links = doc.links;
    }
    if ('meta' in doc) {
      newData.meta = doc.meta;
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

  /**
   `value()` synchronously returns the current value of the belongs-to
   relationship. Unlike `record.relationshipName`, calling
   `value()` on a reference does not trigger a fetch if the async
   relationship is not yet loaded. If the relationship is not loaded
   it will always return `null`.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';

   export default class BlogModel extends Model {
     @belongsTo('user', { async: true, inverse: null }) user;
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
  value(): Related | null {
    const resource = this._resource();
    return resource && resource.data ? this.store.peekRecord(resource.data) : null;
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
     @belongsTo('user', { async: true, inverse: null }) user;
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
  async load(options?: Record<string, unknown>): Promise<Related | null> {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    const fetchSyncRel =
      !this.belongsToRelationship.definition.isAsync && !areAllInverseRecordsLoaded(this.store, this._resource());
    return fetchSyncRel
      ? support.reloadBelongsTo(this.key, options).then(() => this.value())
      : // we cast to fix the return type since typescript and eslint don't understand async functions
        // properly
        (support.getBelongsTo(this.key, options) as Promise<Related | null>);
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
     @belongsTo('user', { async: true, inverse: null }) user;
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
  reload(options?: Record<string, unknown>) {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    return support.reloadBelongsTo(this.key, options).then(() => this.value());
  }
}
defineSignal(BelongsToReference.prototype, '_ref', 0);
