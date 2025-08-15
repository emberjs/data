import { deprecate } from '@ember/debug';

import { DEPRECATE_MANY_ARRAY_DUPLICATES } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import { Context } from '../../../reactive/-private.ts';
import type { BaseFinderOptions, ResourceKey } from '../../../types.ts';
import type { LocalRelationshipOperation } from '../../../types/graph.ts';
import type { ObjectValue } from '../../../types/json/raw.ts';
import type { OpaqueRecordInstance, TypedRecordInstance, TypeFromInstance } from '../../../types/record.ts';
import type { LegacyHasManyField, LinksModeHasManyField } from '../../../types/schema/fields.ts';
import type { Links, Meta, PaginationLinks } from '../../../types/spec/json-api-raw.ts';
import { recordIdentifierFor } from '../caches/instance-cache.ts';
import { isResourceKey } from '../managers/cache-key-manager.ts';
import { notifyInternalSignal, type WarpDriveSignal } from '../new-core-tmp/reactivity/internal.ts';
import type { CreateRecordProperties } from '../store-service.ts';
import { save } from './-utils.ts';
import type { LegacyLiveArrayCreateOptions } from './legacy-live-array.ts';
import type { NativeProxy } from './native-proxy-type-fix.ts';
import { createReactiveResourceArray, destroy, type ReactiveResourceArray } from './resource-array.ts';

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

  ```js [app/models/post.js]
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany('comment') comments;
  }
  ```

  ```js [app/models/comment.js]
  import { Model, belongsTo } from '@warp-drive/legacy/model';

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

  @public
*/
export interface LegacyManyArray<T = unknown> extends ReactiveResourceArray<T> {
  meta: Meta | null;
  links: Links | PaginationLinks | null;

  /** @internal */
  isPolymorphic: boolean;
  /** @internal */
  isAsync: boolean;

  /** @private */
  key: string;
  /** @private */
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;

  /**
    The loading state of this array
    @public
  */
  isLoaded: boolean;

  /** @internal */
  notify(): void;

  /**
    Reloads all of the records in the manyArray. If the manyArray
    holds a relationship that was originally fetched using a links url
    WarpDrive will revisit the original links url to repopulate the
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

    @public
  */
  reload(options?: BaseFinderOptions): Promise<LegacyManyArray<T>>;

  /**
    Create a child record and associated it to the collection

    @public
  */
  createRecord(hash: CreateRecordProperties<T>): T;

  /**
    Saves all of the records in the `ManyArray`.

    Note: this API can only be used in legacy mode with a configured Adapter.

    Example

    ```js
    const { content: { data: inbox } } = await store.request(findRecord({ type: 'inbox', id: '1' }));

    let messages = await inbox.messages;
    messages.forEach((message) => {
      message.isRead = true;
    });
    messages.save();
    ```

    @public
  */
  save: () => Promise<LegacyManyArray<T>>;

  /** @private */
  destroy: () => void;
}

/**
 * The options for {@link createLegacyManyArray}
 *
 * @private
 */
export interface LegacyManyArrayCreateOptions extends LegacyLiveArrayCreateOptions {
  isLoaded: boolean;
  editable: boolean;
  isAsync: boolean;
  isPolymorphic: boolean;
  field: LegacyHasManyField | LinksModeHasManyField;
  identifier: ResourceKey;
  links: Links | PaginationLinks | null;
  meta: Meta | null;
}
/**
 * Creates a {@link LegacyManyArray}
 *
 * @private
 */
export function createLegacyManyArray<T>(options: LegacyManyArrayCreateOptions): LegacyManyArray<T> {
  const extensions = options.store.schema.CAUTION_MEGA_DANGER_ZONE_arrayExtensions
    ? options.store.schema.CAUTION_MEGA_DANGER_ZONE_arrayExtensions(options.field)
    : null;

  return createReactiveResourceArray({
    store: options.store,
    manager: options.manager,
    editable: options.editable,
    source: options.source,
    data: {
      links: options.links,
      meta: options.meta,
    } as ObjectValue,
    features: {
      modelName: options.type,
      save,
      DEPRECATED_CLASS_NAME: 'ManyArray',
      isLoaded: options.isLoaded,
      isAsync: options.isAsync,
      isPolymorphic: options.isPolymorphic,
      identifier: options.identifier,
      key: options.field.name,
      reload,
      createRecord,
      notify,
    },
    extensions,
    options: null,
    destroy: destroyLegacyManyArray,
    mutate: _MUTATE,
  }) as LegacyManyArray<T>;
}

function _MUTATE<T>(
  target: ResourceKey[],
  receiver: typeof NativeProxy<ResourceKey[], T[]>,
  prop: string,
  args: unknown[],
  _SIGNAL: WarpDriveSignal
): unknown {
  const collection = receiver as unknown as LegacyManyArray<T>;
  switch (prop) {
    case 'length 0': {
      Reflect.set(target, 'length', 0);
      mutateReplaceRelatedRecords(collection, [], _SIGNAL);
      return true;
    }
    case 'replace cell': {
      const [index, prior, value] = args as [number, ResourceKey, ResourceKey];
      target[index] = value;
      mutateReplaceRelatedRecord(collection, { value, prior, index }, _SIGNAL);
      return true;
    }
    case 'push': {
      const newValues = extractIdentifiersFromRecords(args);

      assertNoDuplicates(
        collection,
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
          mutateAddToRelatedRecords(collection, { value: extractIdentifiersFromRecords(newArgs) }, _SIGNAL);
        }
        return result;
      }

      // else, no dedupe, error on duplicates
      const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
      if (newValues.length) {
        mutateAddToRelatedRecords(collection, { value: newValues }, _SIGNAL);
      }
      return result;
    }

    case 'pop': {
      const result: unknown = Reflect.apply(target[prop], receiver, args);
      if (result) {
        mutateRemoveFromRelatedRecords(
          collection,
          { value: recordIdentifierFor(result as OpaqueRecordInstance) },
          _SIGNAL
        );
      }
      return result;
    }

    case 'unshift': {
      const newValues = extractIdentifiersFromRecords(args);

      assertNoDuplicates(
        collection,
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
          mutateAddToRelatedRecords(collection, { value: extractIdentifiersFromRecords(newArgs), index: 0 }, _SIGNAL);
        }
        return result;
      }

      // else, no dedupe, error on duplicates
      const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
      if (newValues.length) {
        mutateAddToRelatedRecords(collection, { value: newValues, index: 0 }, _SIGNAL);
      }
      return result;
    }

    case 'shift': {
      const result: unknown = Reflect.apply(target[prop], receiver, args);

      if (result) {
        mutateRemoveFromRelatedRecords(
          collection,
          { value: recordIdentifierFor(result as OpaqueRecordInstance), index: 0 },
          _SIGNAL
        );
      }
      return result;
    }

    case 'sort': {
      const result: unknown = Reflect.apply(target[prop], receiver, args);
      mutateSortRelatedRecords(collection, (result as OpaqueRecordInstance[]).map(recordIdentifierFor), _SIGNAL);
      return result;
    }

    case 'splice': {
      const [start, deleteCount, ...adds] = args as [number, number, ...OpaqueRecordInstance[]];

      // detect a full replace
      if (start === 0 && deleteCount === collection[Context].source.length) {
        const newValues = extractIdentifiersFromRecords(adds);

        assertNoDuplicates(
          collection,
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

          mutateReplaceRelatedRecords(collection, extractIdentifiersFromRecords(unique), _SIGNAL);
          return result;
        }

        // else, no dedupe, error on duplicates
        const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
        mutateReplaceRelatedRecords(collection, newValues, _SIGNAL);
        return result;
      }

      const newValues = extractIdentifiersFromRecords(adds);
      assertNoDuplicates(
        collection,
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
          mutateRemoveFromRelatedRecords(collection, { value: result.map(recordIdentifierFor), index: start }, _SIGNAL);
        }

        if (unique.length > 0) {
          mutateAddToRelatedRecords(
            collection,
            { value: extractIdentifiersFromRecords(unique), index: start },
            _SIGNAL
          );
        }

        return result;
      }

      // else, no dedupe, error on duplicates
      const result = Reflect.apply(target[prop], receiver, args) as OpaqueRecordInstance[];
      if (deleteCount > 0) {
        mutateRemoveFromRelatedRecords(collection, { value: result.map(recordIdentifierFor), index: start }, _SIGNAL);
      }
      if (newValues.length > 0) {
        mutateAddToRelatedRecords(collection, { value: newValues, index: start }, _SIGNAL);
      }
      return result;
    }
    default:
      assert(`unable to convert ${prop} into a transaction that updates the cache state for this record array`);
  }
}

function notify(this: LegacyManyArray): void {
  notifyInternalSignal(this[Context].signal);
}

function reload<T>(this: LegacyManyArray<T>, options?: BaseFinderOptions): Promise<LegacyManyArray<T>> {
  const { manager } = this[Context];
  assert(`Expected the manager for ManyArray to implement reloadHasMany`, typeof manager.reloadHasMany === 'function');
  // TODO this is odd, we don't ask the store for anything else like this?
  return manager.reloadHasMany<T>(this.key, options) as Promise<LegacyManyArray<T>>;
}

function createRecord<T>(this: LegacyManyArray<T>, hash: CreateRecordProperties<T>): T {
  const { store } = this[Context];
  assert(`Expected modelName to be set`, this.modelName);
  const record = store.createRecord<T>(this.modelName as TypeFromInstance<T>, hash);
  this.push(record);

  return record;
}

function destroyLegacyManyArray(this: ReactiveResourceArray): void {
  destroy.call(this, false);
}

type PromiseProxyRecord = { then(): void; content: OpaqueRecordInstance | null | undefined };

function assertRecordPassedToHasMany(record: OpaqueRecordInstance | PromiseProxyRecord) {
  assert(
    `All elements of a hasMany relationship must be instances of Model, you passed ${typeof record}`,
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

function extractIdentifiersFromRecords(records: OpaqueRecordInstance[]): ResourceKey[] {
  return records.map(extractIdentifierFromRecord);
}

function extractIdentifierFromRecord(recordOrPromiseRecord: PromiseProxyRecord | OpaqueRecordInstance) {
  assertRecordPassedToHasMany(recordOrPromiseRecord);
  return recordIdentifierFor(recordOrPromiseRecord);
}

function assertNoDuplicates<T>(
  collection: LegacyManyArray<T>,
  target: ResourceKey[],
  callback: (currentState: ResourceKey[]) => void,
  reason: string
) {
  const identifier = collection[Context].features!.identifier as ResourceKey;
  const state = target.slice();
  callback(state);

  if (state.length !== new Set(state).size) {
    const duplicates = state.filter((currentValue, currentIndex) => state.indexOf(currentValue) !== currentIndex);

    if (DEPRECATE_MANY_ARRAY_DUPLICATES) {
      deprecate(
        `${reason} This behavior is deprecated. Found duplicates for the following records within the new state provided to \`<${
          identifier.type
        }:${identifier.id || identifier.lid}>.${collection.key}\`\n\t- ${Array.from(new Set(duplicates))
          .map((r) => (isResourceKey(r) ? r.lid : recordIdentifierFor(r).lid))
          .sort((a, b) => a.localeCompare(b))
          .join('\n\t- ')}`,
        false,
        {
          id: 'ember-data:deprecate-many-array-duplicates',
          for: 'ember-data',
          until: '6.0',
          since: {
            enabled: '5.3',
            available: '4.13',
          },
        }
      );
    } else {
      throw new Error(
        `${reason} Found duplicates for the following records within the new state provided to \`<${
          identifier.type
        }:${identifier.id || identifier.lid}>.${collection.key}\`\n\t- ${Array.from(new Set(duplicates))
          .map((r) => (isResourceKey(r) ? r.lid : recordIdentifierFor(r).lid))
          .sort((a, b) => a.localeCompare(b))
          .join('\n\t- ')}`
      );
    }
  }
}

function mutateAddToRelatedRecords<T>(
  collection: LegacyManyArray<T>,
  operationInfo: { value: ResourceKey | ResourceKey[]; index?: number },
  _SIGNAL: WarpDriveSignal
) {
  const identifier = collection[Context].features!.identifier as ResourceKey;

  // FIXME field needs to use sourceKey
  mutate(
    collection,
    {
      op: 'add',
      record: identifier,
      field: collection.key,
      ...operationInfo,
    },
    _SIGNAL
  );
}

function mutateRemoveFromRelatedRecords<T>(
  collection: LegacyManyArray<T>,
  operationInfo: { value: ResourceKey | ResourceKey[]; index?: number },
  _SIGNAL: WarpDriveSignal
) {
  const identifier = collection[Context].features!.identifier as ResourceKey;

  // FIXME field needs to use sourceKey
  mutate(
    collection,
    {
      op: 'remove',
      record: identifier,
      field: collection.key,
      ...operationInfo,
    },
    _SIGNAL
  );
}

function mutateReplaceRelatedRecord<T>(
  collection: LegacyManyArray<T>,
  operationInfo: {
    value: ResourceKey;
    prior: ResourceKey;
    index: number;
  },
  _SIGNAL: WarpDriveSignal
) {
  const identifier = collection[Context].features!.identifier as ResourceKey;

  // FIXME field needs to use sourceKey
  mutate(
    collection,
    {
      op: 'replaceRelatedRecord',
      record: identifier,
      field: collection.key,
      ...operationInfo,
    },
    _SIGNAL
  );
}

function mutateReplaceRelatedRecords<T>(
  collection: LegacyManyArray<T>,
  value: ResourceKey[],
  _SIGNAL: WarpDriveSignal
) {
  const identifier = collection[Context].features!.identifier as ResourceKey;

  // FIXME field needs to use sourceKey
  mutate(
    collection,
    {
      op: 'replaceRelatedRecords',
      record: identifier,
      field: collection.key,
      value,
    },
    _SIGNAL
  );
}

function mutateSortRelatedRecords<T>(collection: LegacyManyArray<T>, value: ResourceKey[], _SIGNAL: WarpDriveSignal) {
  const identifier = collection[Context].features!.identifier as ResourceKey;

  // FIXME field needs to use sourceKey
  mutate(
    collection,
    {
      op: 'sortRelatedRecords',
      record: identifier,
      field: collection.key,
      value,
    },
    _SIGNAL
  );
}

function mutate<T>(collection: LegacyManyArray<T>, mutation: LocalRelationshipOperation, _SIGNAL: WarpDriveSignal) {
  const { manager } = collection[Context];

  assert(`Expected the manager for ManyArray to implement mutate`, typeof manager.mutate === 'function');
  manager.mutate(mutation);
  notifyInternalSignal(_SIGNAL);
}
