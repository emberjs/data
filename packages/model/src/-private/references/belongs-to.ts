import { deprecate } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { DEBUG } from '@glimmer/env';
import { cached, tracked } from '@glimmer/tracking';

import type { Object as JSONObject, Value as JSONValue } from 'json-typescript';
import { resolve } from 'rsvp';

import type { Graph } from '@ember-data/graph/-private/graph/graph';
import type BelongsToRelationship from '@ember-data/graph/-private/relationships/state/belongs-to';
import { DEPRECATE_PROMISE_PROXIES } from '@ember-data/private-build-infra/deprecations';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store/-private';
import type { NotificationType } from '@ember-data/store/-private/managers/record-notification-manager';
import type {
  LinkObject,
  Links,
  SingleResourceDocument,
  SingleResourceRelationship,
} from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { Dict } from '@ember-data/types/q/utils';

import { assertPolymorphicType } from '../debug/assert-polymorphic-type';
import { areAllInverseRecordsLoaded, LegacySupport } from '../legacy-relationships-support';
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
  value: SingleResourceRelationship | ResourceIdentifier | null
): value is ResourceIdentifier & { links: { related: string | LinkObject | null } } {
  return Boolean(value && value.links && value.links.related);
}

/**
 A `BelongsToReference` is a low-level API that allows users and
 addon authors to perform meta-operations on a belongs-to
 relationship.

 @class BelongsToReference
 @public
 */
export default class BelongsToReference {
  declare key: string;
  declare belongsToRelationship: BelongsToRelationship;
  declare type: string;
  ___identifier: StableRecordIdentifier;
  declare store: Store;
  declare graph: Graph;

  // unsubscribe tokens given to us by the notification manager
  ___token!: object;
  ___relatedToken: object | null = null;

  @tracked _ref = 0;

  constructor(
    store: Store,
    graph: Graph,
    parentIdentifier: StableRecordIdentifier,
    belongsToRelationship: BelongsToRelationship,
    key: string
  ) {
    this.graph = graph;
    this.key = key;
    this.belongsToRelationship = belongsToRelationship;
    this.type = belongsToRelationship.definition.type;
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
  @dependentKeyCompat
  get identifier(): StableRecordIdentifier | null {
    if (this.___relatedToken) {
      this.store.notifications.unsubscribe(this.___relatedToken);
      this.___relatedToken = null;
    }

    let resource = this._resource();
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

      return identifier;
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
  links(): Links | null {
    let resource = this._resource();

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
  meta() {
    let meta: Dict<JSONValue> | null = null;
    let resource = this._resource();
    if (resource && resource.meta && typeof resource.meta === 'object') {
      meta = resource.meta;
    }
    return meta;
  }

  _resource() {
    this._ref; // subscribe
    return this.store._instanceCache
      .getRecordData(this.___identifier)
      .getRelationship(this.___identifier, this.key) as SingleResourceRelationship;
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
    let value = this._resource();
    if (isResourceIdentiferWithRelatedLinks(value)) {
      return 'link';
    }
    return 'id';
  }

  /**
   `push` can be used to update the data in the relationship and Ember
   Data will treat the new data as the canonical value of this
   relationship on the backend.

   Example

   ```app/models/blog.js
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
  async push(data: SingleResourceDocument | Promise<SingleResourceDocument>): Promise<RecordInstance> {
    let jsonApiDoc: SingleResourceDocument = data as SingleResourceDocument;
    if (DEPRECATE_PROMISE_PROXIES) {
      if ((data as { then: unknown }).then) {
        jsonApiDoc = await resolve(data);
        if (jsonApiDoc !== data) {
          deprecate(
            `You passed in a Promise to a Reference API that now expects a resolved value. await the value before setting it.`,
            false,
            {
              id: 'ember-data:deprecate-promise-proxies',
              until: '5.0',
              since: {
                enabled: '4.7',
                available: '4.7',
              },
              for: 'ember-data',
            }
          );
        }
      }
    }
    let record = this.store.push(jsonApiDoc);

    if (DEBUG) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      assertPolymorphicType(
        this.belongsToRelationship.identifier,
        this.belongsToRelationship.definition,
        recordIdentifierFor(record),
        this.store
      );
    }

    const { identifier } = this.belongsToRelationship;
    this.store._join(() => {
      this.graph.push({
        op: 'replaceRelatedRecord',
        record: identifier,
        field: this.key,
        value: recordIdentifierFor(record),
      });
    });

    return record;
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
  value(): RecordInstance | null {
    let resource = this._resource();
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
  load(options?: Dict<unknown>) {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    const fetchSyncRel =
      !this.belongsToRelationship.definition.isAsync && !areAllInverseRecordsLoaded(this.store, this._resource());
    return fetchSyncRel
      ? support.reloadBelongsTo(this.key, options).then(() => this.value())
      : support.getBelongsTo(this.key, options);
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
  reload(options?: Dict<unknown>) {
    const support: LegacySupport = (LEGACY_SUPPORT as Map<StableRecordIdentifier, LegacySupport>).get(
      this.___identifier
    )!;
    return support.reloadBelongsTo(this.key, options).then(() => this.value());
  }
}
