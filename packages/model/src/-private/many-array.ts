/**
  @module @ember-data/store
*/
import { assert, deprecate } from '@ember/debug';

import { DEPRECATE_PROMISE_PROXIES } from '@ember-data/deprecations';
import { DEBUG } from '@ember-data/env';
import type Store from '@ember-data/store';
import {
  IDENTIFIER_ARRAY_TAG,
  MUTATE,
  notifyArray,
  RecordArray,
  recordIdentifierFor,
  SOURCE,
} from '@ember-data/store/-private';
import type ShimModelClass from '@ember-data/store/-private/legacy-model-support/shim-model-class';
import { IdentifierArrayCreateOptions } from '@ember-data/store/-private/record-arrays/identifier-array';
import type { CreateRecordProperties } from '@ember-data/store/-private/store-service';
import { addToTransaction, type Tag } from '@ember-data/tracking/-private';
import type { Cache } from '@ember-data/types/q/cache';
import type { Links, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';
import type { FindOptions } from '@ember-data/types/q/store';
import type { Dict } from '@ember-data/types/q/utils';

import { LegacySupport } from './legacy-relationships-support';

export interface ManyArrayCreateArgs {
  identifiers: StableRecordIdentifier[];
  type: string;
  store: Store;
  allowMutation: boolean;
  manager: LegacySupport;

  identifier: StableRecordIdentifier;
  cache: Cache;
  meta: Dict<unknown> | null;
  links: Links | PaginationLinks | null;
  key: string;
  isPolymorphic: boolean;
  isAsync: boolean;
  _inverseIsAsync: boolean;
  isLoaded: boolean;
}
/**
  A `ManyArray` is a `MutableArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  This class is not intended to be directly instantiated by consuming applications.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany('comment') comments;
  }
  ```

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post') post;
  }
  ```

  If you created a new instance of `Post` and added
  a `Comment` record to its `comments` has-many
  relationship, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which a relationship belongs-to the
  relationship's _owner_.

  @class ManyArray
  @public
*/
export default class RelatedCollection extends RecordArray {
  declare isAsync: boolean;
  /**
    The loading state of this array

    @property {Boolean} isLoaded
    @public
    */

  declare isLoaded: boolean;
  /**
    `true` if the relationship is polymorphic, `false` otherwise.

    @property {Boolean} isPolymorphic
    @private
    */
  declare isPolymorphic: boolean;
  declare _inverseIsAsync: boolean;
  /**
    Metadata associated with the request for async hasMany relationships.

    Example

    Given that the server returns the following JSON payload when fetching a
    hasMany relationship:

    ```js
    {
      "comments": [{
        "id": 1,
        "comment": "This is the first comment",
      }, {
    // ...
      }],

      "meta": {
        "page": 1,
        "total": 5
      }
    }
    ```

    You can then access the meta data via the `meta` property:

    ```js
    let comments = await post.comments;
    let meta = comments.meta;

    // meta.page => 1
    // meta.total => 5
    ```

    @property {Object | null} meta
    @public
    */
  declare meta: Dict<unknown> | null;
  /**
     * Retrieve the links for this relationship
     *
     @property {Object | null} links
     @public
     */
  declare links: Links | PaginationLinks | null;
  declare identifier: StableRecordIdentifier;
  declare cache: Cache;
  // @ts-expect-error
  declare _manager: LegacySupport;
  declare store: Store;
  declare key: string;
  declare type: ShimModelClass;

  constructor(options: ManyArrayCreateArgs) {
    super(options as unknown as IdentifierArrayCreateOptions);
    this.isLoaded = options.isLoaded || false;
    this.isAsync = options.isAsync || false;
    this.isPolymorphic = options.isPolymorphic || false;
    this.identifier = options.identifier;
    this.key = options.key;
  }

  [MUTATE](
    target: StableRecordIdentifier[],
    receiver: typeof Proxy<StableRecordIdentifier[]>,
    prop: string,
    args: unknown[],
    _TAG: Tag
  ): unknown {
    switch (prop) {
      case 'length 0': {
        Reflect.set(target, 'length', 0);
        this._manager.mutate({
          op: 'replaceRelatedRecords',
          record: this.identifier,
          field: this.key,
          value: [],
        });
        addToTransaction(_TAG);
        return true;
      }
      case 'replace cell': {
        const [index, prior, value] = args as [number, StableRecordIdentifier, StableRecordIdentifier];
        target[index] = value;
        this._manager.mutate({
          op: 'replaceRelatedRecord',
          record: this.identifier,
          field: this.key,
          value,
          prior,
          index,
        });
        addToTransaction(_TAG);
        return true;
      }
      case 'push': {
        if (DEBUG) {
          const seen = new Set(target);
          const unique = new Set<RecordInstance>();
          const duplicates = new Set<RecordInstance>();
          (args as RecordInstance[]).forEach((item) => {
            const identifier = recordIdentifierFor(item);
            if (seen.has(identifier)) {
              duplicates.add(item);
            } else {
              seen.add(identifier);
              unique.add(item);
            }
          });

          assert(
            duplicationMsg(`Cannot push duplicates to a hasMany's state.`, this, duplicates),
            duplicates.size === 0
          );
        }

        const seen = new Set(target);
        const unique = new Set<RecordInstance>();

        (args as RecordInstance[]).forEach((item) => {
          const identifier = recordIdentifierFor(item);
          if (!seen.has(identifier)) {
            seen.add(identifier);
            unique.add(item);
          }
        });

        const newArgs = Array.from(unique);
        const result = Reflect.apply(target[prop], receiver, newArgs) as RecordInstance[];

        if (newArgs.length) {
          this._manager.mutate({
            op: 'addToRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: extractIdentifiersFromRecords(newArgs),
          });
          addToTransaction(_TAG);
        }
        return result;
      }
      case 'pop': {
        const result: unknown = Reflect.apply(target[prop], receiver, args);
        if (result) {
          this._manager.mutate({
            op: 'removeFromRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: recordIdentifierFor(result as RecordInstance),
          });
          addToTransaction(_TAG);
        }
        return result;
      }

      case 'unshift': {
        if (DEBUG) {
          const seen = new Set(target);
          const unique = new Set<RecordInstance>();
          const duplicates = new Set<RecordInstance>();
          (args as RecordInstance[]).forEach((item) => {
            const identifier = recordIdentifierFor(item);
            if (seen.has(identifier)) {
              duplicates.add(item);
            } else {
              seen.add(identifier);
              unique.add(item);
            }
          });

          assert(
            duplicationMsg(`Cannot unshift duplicates to a hasMany's state.`, this, duplicates),
            duplicates.size === 0
          );
        }

        const seen = new Set(target);
        const unique = new Set<RecordInstance>();

        (args as RecordInstance[]).forEach((item) => {
          const identifier = recordIdentifierFor(item);
          if (!seen.has(identifier)) {
            seen.add(identifier);
            unique.add(item);
          }
        });

        const newArgs = Array.from(unique);
        const result: unknown = Reflect.apply(target[prop], receiver, newArgs);

        if (newArgs.length) {
          this._manager.mutate({
            op: 'addToRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: extractIdentifiersFromRecords(Array.from(unique)),
            index: 0,
          });
          addToTransaction(_TAG);
        }
        return result;
      }

      case 'shift': {
        const result: unknown = Reflect.apply(target[prop], receiver, args);

        if (result) {
          this._manager.mutate({
            op: 'removeFromRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: recordIdentifierFor(result as RecordInstance),
            index: 0,
          });
          addToTransaction(_TAG);
        }
        return result;
      }

      case 'sort': {
        const result: unknown = Reflect.apply(target[prop], receiver, args);

        this._manager.mutate({
          op: 'sortRelatedRecords',
          record: this.identifier,
          field: this.key,
          value: (result as RecordInstance[]).map(recordIdentifierFor),
        });
        addToTransaction(_TAG);
        return result;
      }

      case 'splice': {
        const [start, deleteCount, ...adds] = args as [number, number, RecordInstance];

        // detect a full replace
        if (start === 0 && deleteCount === this[SOURCE].length) {
          const current = new Set(adds);
          if (DEBUG) {
            if (current.size !== adds.length) {
              const seen = new Set<RecordInstance>();
              const duplicates = new Set<RecordInstance>();
              adds.forEach((item) => {
                if (seen.has(item)) {
                  duplicates.add(item);
                } else {
                  seen.add(item);
                }
              });
              assert(
                duplicationMsg(
                  `Cannot replace a hasMany's state with a new state that contains duplicates.`,
                  this,
                  duplicates
                )
              );
            }
          }
          const unique = Array.from(current);
          const newArgs = ([start, deleteCount] as unknown[]).concat(unique);
          const result = Reflect.apply(target[prop], receiver, newArgs) as RecordInstance[];

          this._manager.mutate({
            op: 'replaceRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: extractIdentifiersFromRecords(unique),
          });
          addToTransaction(_TAG);
          return result;
        }

        const copy = target.slice();
        copy.splice(start, deleteCount);

        if (DEBUG) {
          const seen = new Set(copy);
          const unique = new Set<RecordInstance>();
          const duplicates = new Set<RecordInstance>();
          adds.forEach((item) => {
            const identifier = recordIdentifierFor(item);
            if (seen.has(identifier)) {
              duplicates.add(item);
            } else {
              seen.add(identifier);
              unique.add(item);
            }
          });

          assert(
            duplicationMsg(
              `Cannot splice a hasMany's state with a new state that contains duplicates.`,
              this,
              duplicates
            ),
            duplicates.size === 0
          );
        }

        const seen = new Set(copy);
        const unique = new Set<RecordInstance>();
        adds.forEach((item) => {
          const identifier = recordIdentifierFor(item);
          if (!seen.has(identifier)) {
            seen.add(identifier);
            unique.add(item);
          }
        });

        const addedRecords = Array.from(unique);
        const newArgs = ([start, deleteCount] as unknown[]).concat(addedRecords);
        const result = Reflect.apply(target[prop], receiver, newArgs) as RecordInstance[];

        if (deleteCount > 0) {
          this._manager.mutate({
            op: 'removeFromRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: result.map(recordIdentifierFor),
            index: start,
          });
          addToTransaction(_TAG);
        }

        if (unique.size) {
          this._manager.mutate({
            op: 'addToRelatedRecords',
            record: this.identifier,
            field: this.key,
            value: extractIdentifiersFromRecords(addedRecords),
            index: start,
          });
          addToTransaction(_TAG);
        }

        return result;
      }
      default:
        assert(`unable to convert ${prop} into a transaction that updates the cache state for this record array`);
    }
  }

  notify() {
    const tag = this[IDENTIFIER_ARRAY_TAG];
    tag.shouldReset = true;
    // @ts-expect-error
    notifyArray(this);
  }

  /**
    Reloads all of the records in the manyArray. If the manyArray
    holds a relationship that was originally fetched using a links url
    Ember Data will revisit the original links url to repopulate the
    relationship.

    If the manyArray holds the result of a `store.query()` reload will
    re-run the original query.

    Example

    ```javascript
    let user = store.peekRecord('user', '1')
    await login(user);

    let permissions = await user.permissions;
    await permissions.reload();
    ```

    @method reload
    @public
  */
  reload(options?: FindOptions) {
    // TODO this is odd, we don't ask the store for anything else like this?
    return this._manager.reloadHasMany(this.key, options);
  }

  /**
    Saves all of the records in the `ManyArray`.

    Example

    ```javascript
    let inbox = await store.findRecord('inbox', '1');
    let messages = await inbox.messages;
    messages.forEach((message) => {
      message.isRead = true;
    });
    messages.save();
    ```

    @method save
    @public
    @return {PromiseArray} promise
  */

  /**
    Create a child record within the owner

    @method createRecord
    @public
    @param {Object} hash
    @return {Model} record
  */
  createRecord(hash: CreateRecordProperties): RecordInstance {
    const { store } = this;
    assert(`Expected modelName to be set`, this.modelName);
    const record = store.createRecord(this.modelName, hash);
    this.push(record);

    return record;
  }

  destroy() {
    super.destroy(false);
  }
}
RelatedCollection.prototype.isAsync = false;
RelatedCollection.prototype.isPolymorphic = false;
RelatedCollection.prototype.identifier = null as unknown as StableRecordIdentifier;
RelatedCollection.prototype.cache = null as unknown as Cache;
RelatedCollection.prototype._inverseIsAsync = false;
RelatedCollection.prototype.key = '';
RelatedCollection.prototype.DEPRECATED_CLASS_NAME = 'ManyArray';

type PromiseProxyRecord = { then(): void; content: RecordInstance | null | undefined };

function assertRecordPassedToHasMany(record: RecordInstance | PromiseProxyRecord) {
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed $${typeof record}`,
    (function () {
      try {
        recordIdentifierFor(record);
        return true;
      } catch {
        return false;
      }
    })()
  );
}

function extractIdentifiersFromRecords(records: RecordInstance[]): StableRecordIdentifier[] {
  return records.map(extractIdentifierFromRecord);
}

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | RecordInstance) {
  if (DEPRECATE_PROMISE_PROXIES) {
    if (isPromiseRecord(recordOrPromiseRecord)) {
      let content = recordOrPromiseRecord.content;
      assert(
        'You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo relationship.',
        content !== undefined && content !== null
      );
      deprecate(
        `You passed in a PromiseProxy to a Relationship API that now expects a resolved value. await the value before setting it.`,
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
      assertRecordPassedToHasMany(content);
      return recordIdentifierFor(content);
    }
  }

  assertRecordPassedToHasMany(recordOrPromiseRecord);
  return recordIdentifierFor(recordOrPromiseRecord);
}

function isPromiseRecord(record: PromiseProxyRecord | RecordInstance): record is PromiseProxyRecord {
  return !!record.then;
}

function duplicationMsg(reason: string, collection: RelatedCollection, duplicates: Set<RecordInstance>) {
  return `${reason} Found duplicates for the following records within the new state provided to \`<${
    collection.identifier.type
  }:${collection.identifier.id || collection.identifier.lid}>.${collection.key}\`\n\t- ${Array.from(duplicates)
    .map((r) => recordIdentifierFor(r).lid)
    .sort((a, b) => a.localeCompare(b))
    .join('\n\t- ')}`;
}
