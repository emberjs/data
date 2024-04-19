/**
  @module @ember-data/store
*/
import { assert, deprecate } from '@ember/debug';

import type Store from '@ember-data/store';
import type { NativeProxy } from '@ember-data/store/-private';
import {
  ARRAY_SIGNAL,
  isStableIdentifier,
  MUTATE,
  notifyArray,
  RecordArray,
  recordIdentifierFor,
  SOURCE,
} from '@ember-data/store/-private';
import type { IdentifierArrayCreateOptions } from '@ember-data/store/-private/record-arrays/identifier-array';
import type { CreateRecordProperties } from '@ember-data/store/-private/store-service';
import type { Cache } from '@ember-data/store/-types/q/cache';
import type { ModelSchema } from '@ember-data/store/-types/q/ds-model';
import type { OpaqueRecordInstance } from '@ember-data/store/-types/q/record-instance';
import type { BaseFinderOptions } from '@ember-data/store/-types/q/store';
import type { Signal } from '@ember-data/tracking/-private';
import { addToTransaction } from '@ember-data/tracking/-private';
import { DEPRECATE_MANY_ARRAY_DUPLICATES } from '@warp-drive/build-config/deprecations';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core-types/record';
import type { Links, PaginationLinks } from '@warp-drive/core-types/spec/raw';

import type { LegacySupport } from './legacy-relationships-support';

export interface ManyArrayCreateArgs {
  identifiers: StableRecordIdentifier[];
  type: string;
  store: Store;
  allowMutation: boolean;
  manager: LegacySupport;

  identifier: StableRecordIdentifier;
  cache: Cache;
  meta: Record<string, unknown> | null;
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
export default class RelatedCollection<T = unknown> extends RecordArray<T> {
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
  declare meta: Record<string, unknown> | null;
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
  declare type: ModelSchema;
  declare modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;

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
    receiver: typeof NativeProxy<StableRecordIdentifier[], T[]>,
    prop: string,
    args: unknown[],
    _SIGNAL: Signal
  ): unknown {
    switch (prop) {
      case 'length 0': {
        Reflect.set(target, 'length', 0);
        mutateReplaceRelatedRecords(this, [], _SIGNAL);
        return true;
      }
      case 'replace cell': {
        const [index, prior, value] = args as [number, StableRecordIdentifier, StableRecordIdentifier];
        target[index] = value;
        mutateReplaceRelatedRecord(this, { value, prior, index }, _SIGNAL);
        return true;
      }
      case 'push': {
        const newValues = extractIdentifiersFromRecords(args);

        assertNoDuplicates(
          this,
          target,
          (currentState) => currentState.push(...newValues),
          `Cannot push duplicates to a hasMany's state.`
        );

        if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
          // dedupe
          const seen = new Set(target);
          const unique = new Set<OpaqueRecordInstance>();

          args.forEach((item) => {
            const identifier = recordIdentifierFor(item);
            if (!seen.has(identifier)) {
              seen.add(identifier);
              unique.add(item);
            }
          });

          const newArgs = Array.from(unique);
          const result = Reflect.apply(target[prop], receiver, newArgs) as OpaqueRecordInstance[];

          if (newArgs.length) {
            mutateAddToRelatedRecords(this, { value: extractIdentifiersFromRecords(newArgs) }, _SIGNAL);
          }
          return result;
        }

        // else, no dedupe, error on duplicates
        const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
        if (newValues.length) {
          mutateAddToRelatedRecords(this, { value: newValues }, _SIGNAL);
        }
        return result;
      }

      case 'pop': {
        const result: unknown = Reflect.apply(target[prop], receiver, args);
        if (result) {
          mutateRemoveFromRelatedRecords(this, { value: recordIdentifierFor(result as OpaqueRecordInstance) }, _SIGNAL);
        }
        return result;
      }

      case 'unshift': {
        const newValues = extractIdentifiersFromRecords(args);

        assertNoDuplicates(
          this,
          target,
          (currentState) => currentState.unshift(...newValues),
          `Cannot unshift duplicates to a hasMany's state.`
        );

        if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
          // dedupe
          const seen = new Set(target);
          const unique = new Set<OpaqueRecordInstance>();

          args.forEach((item) => {
            const identifier = recordIdentifierFor(item);
            if (!seen.has(identifier)) {
              seen.add(identifier);
              unique.add(item);
            }
          });

          const newArgs = Array.from(unique);
          const result: unknown = Reflect.apply(target[prop], receiver, newArgs);

          if (newArgs.length) {
            mutateAddToRelatedRecords(this, { value: extractIdentifiersFromRecords(newArgs), index: 0 }, _SIGNAL);
          }
          return result;
        }

        // else, no dedupe, error on duplicates
        const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
        if (newValues.length) {
          mutateAddToRelatedRecords(this, { value: newValues, index: 0 }, _SIGNAL);
        }
        return result;
      }

      case 'shift': {
        const result: unknown = Reflect.apply(target[prop], receiver, args);

        if (result) {
          mutateRemoveFromRelatedRecords(
            this,
            { value: recordIdentifierFor(result as OpaqueRecordInstance), index: 0 },
            _SIGNAL
          );
        }
        return result;
      }

      case 'sort': {
        const result: unknown = Reflect.apply(target[prop], receiver, args);
        mutateSortRelatedRecords(this, (result as OpaqueRecordInstance[]).map(recordIdentifierFor), _SIGNAL);
        return result;
      }

      case 'splice': {
        const [start, deleteCount, ...adds] = args as [number, number, ...OpaqueRecordInstance[]];

        // detect a full replace
        if (start === 0 && deleteCount === this[SOURCE].length) {
          const newValues = extractIdentifiersFromRecords(adds);

          assertNoDuplicates(
            this,
            target,
            (currentState) => currentState.splice(start, deleteCount, ...newValues),
            `Cannot replace a hasMany's state with a new state that contains duplicates.`
          );

          if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
            // dedupe
            const current = new Set(adds);
            const unique = Array.from(current);
            const newArgs = ([start, deleteCount] as unknown[]).concat(unique);

            const result = Reflect.apply(target[prop], receiver, newArgs) as OpaqueRecordInstance[];

            mutateReplaceRelatedRecords(this, extractIdentifiersFromRecords(unique), _SIGNAL);
            return result;
          }

          // else, no dedupe, error on duplicates
          const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
          mutateReplaceRelatedRecords(this, newValues, _SIGNAL);
          return result;
        }

        const newValues = extractIdentifiersFromRecords(adds);
        assertNoDuplicates(
          this,
          target,
          (currentState) => currentState.splice(start, deleteCount, ...newValues),
          `Cannot splice a hasMany's state with a new state that contains duplicates.`
        );

        if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
          // dedupe
          const currentState = target.slice();
          currentState.splice(start, deleteCount);

          const seen = new Set(currentState);
          const unique: OpaqueRecordInstance[] = [];
          adds.forEach((item) => {
            const identifier = recordIdentifierFor(item);
            if (!seen.has(identifier)) {
              seen.add(identifier);
              unique.push(item);
            }
          });

          const newArgs = [start, deleteCount, ...unique];
          const result = Reflect.apply(target[prop], receiver, newArgs) as OpaqueRecordInstance[];

          if (deleteCount > 0) {
            mutateRemoveFromRelatedRecords(this, { value: result.map(recordIdentifierFor), index: start }, _SIGNAL);
          }

          if (unique.length > 0) {
            mutateAddToRelatedRecords(this, { value: extractIdentifiersFromRecords(unique), index: start }, _SIGNAL);
          }

          return result;
        }

        // else, no dedupe, error on duplicates
        const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
        if (deleteCount > 0) {
          mutateRemoveFromRelatedRecords(this, { value: result.map(recordIdentifierFor), index: start }, _SIGNAL);
        }
        if (newValues.length > 0) {
          mutateAddToRelatedRecords(this, { value: newValues, index: start }, _SIGNAL);
        }
        return result;
      }
      default:
        assert(`unable to convert ${prop} into a transaction that updates the cache state for this record array`);
    }
  }

  notify() {
    const signal = this[ARRAY_SIGNAL];
    signal.shouldReset = true;
    // @ts-expect-error
    notifyArray(this);
  }

  /**
    Reloads all of the records in the manyArray. If the manyArray
    holds a relationship that was originally fetched using a links url
    EmberData will revisit the original links url to repopulate the
    relationship.

    If the ManyArray holds the result of a `store.query()` reload will
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
  reload(options?: BaseFinderOptions): Promise<this> {
    // TODO this is odd, we don't ask the store for anything else like this?
    return this._manager.reloadHasMany<T>(this.key, options) as Promise<this>;
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
  createRecord(hash: CreateRecordProperties<T>): T {
    const { store } = this;
    assert(`Expected modelName to be set`, this.modelName);
    const record = store.createRecord<T>(this.modelName as TypeFromInstance<T>, hash);
    this.push(record);

    return record;
  }

  override destroy() {
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

type PromiseProxyRecord = { then(): void; content: OpaqueRecordInstance | null | undefined };

function assertRecordPassedToHasMany(record: OpaqueRecordInstance | PromiseProxyRecord) {
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

function extractIdentifiersFromRecords(records: OpaqueRecordInstance[]): StableRecordIdentifier[] {
  return records.map(extractIdentifierFromRecord);
}

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | OpaqueRecordInstance) {
  assertRecordPassedToHasMany(recordOrPromiseRecord);
  return recordIdentifierFor(recordOrPromiseRecord);
}

function assertNoDuplicates<T>(
  collection: RelatedCollection<T>,
  target: StableRecordIdentifier[],
  callback: (currentState: StableRecordIdentifier[]) => void,
  reason: string
) {
  const state = target.slice();
  callback(state);

  if (state.length !== new Set(state).size) {
    const duplicates = state.filter((currentValue, currentIndex) => state.indexOf(currentValue) !== currentIndex);

    if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
      deprecate(
        `${reason} This behavior is deprecated. Found duplicates for the following records within the new state provided to \`<${
          collection.identifier.type
        }:${collection.identifier.id || collection.identifier.lid}>.${collection.key}\`\n\t- ${Array.from(
          new Set(duplicates)
        )
          .map((r) => (isStableIdentifier(r) ? r.lid : recordIdentifierFor(r).lid))
          .sort((a, b) => a.localeCompare(b))
          .join('\n\t- ')}`,
        false,
        {
          id: 'ember-data:deprecate-many-array-duplicates',
          for: 'ember-data',
          until: '6.0',
          since: {
            enabled: '5.3',
            available: '5.3',
          },
        }
      );
    } else {
      throw new Error(
        `${reason} Found duplicates for the following records within the new state provided to \`<${
          collection.identifier.type
        }:${collection.identifier.id || collection.identifier.lid}>.${collection.key}\`\n\t- ${Array.from(
          new Set(duplicates)
        )
          .map((r) => (isStableIdentifier(r) ? r.lid : recordIdentifierFor(r).lid))
          .sort((a, b) => a.localeCompare(b))
          .join('\n\t- ')}`
      );
    }
  }
}

function mutateAddToRelatedRecords<T>(
  collection: RelatedCollection<T>,
  operationInfo: { value: StableRecordIdentifier | StableRecordIdentifier[]; index?: number },
  _SIGNAL: Signal
) {
  mutate(
    collection,
    {
      op: 'addToRelatedRecords',
      record: collection.identifier,
      field: collection.key,
      ...operationInfo,
    },
    _SIGNAL
  );
}

function mutateRemoveFromRelatedRecords<T>(
  collection: RelatedCollection<T>,
  operationInfo: { value: StableRecordIdentifier | StableRecordIdentifier[]; index?: number },
  _SIGNAL: Signal
) {
  mutate(
    collection,
    {
      op: 'removeFromRelatedRecords',
      record: collection.identifier,
      field: collection.key,
      ...operationInfo,
    },
    _SIGNAL
  );
}

function mutateReplaceRelatedRecord<T>(
  collection: RelatedCollection<T>,
  operationInfo: {
    value: StableRecordIdentifier;
    prior: StableRecordIdentifier;
    index: number;
  },
  _SIGNAL: Signal
) {
  mutate(
    collection,
    {
      op: 'replaceRelatedRecord',
      record: collection.identifier,
      field: collection.key,
      ...operationInfo,
    },
    _SIGNAL
  );
}

function mutateReplaceRelatedRecords<T>(
  collection: RelatedCollection<T>,
  value: StableRecordIdentifier[],
  _SIGNAL: Signal
) {
  mutate(
    collection,
    {
      op: 'replaceRelatedRecords',
      record: collection.identifier,
      field: collection.key,
      value,
    },
    _SIGNAL
  );
}

function mutateSortRelatedRecords<T>(
  collection: RelatedCollection<T>,
  value: StableRecordIdentifier[],
  _SIGNAL: Signal
) {
  mutate(
    collection,
    {
      op: 'sortRelatedRecords',
      record: collection.identifier,
      field: collection.key,
      value,
    },
    _SIGNAL
  );
}

function mutate<T>(
  collection: RelatedCollection<T>,
  mutation: Parameters<LegacySupport['mutate']>[0],
  _SIGNAL: Signal
) {
  collection._manager.mutate(mutation);
  addToTransaction(_SIGNAL);
}
