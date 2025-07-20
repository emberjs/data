import type { Store } from '@warp-drive/core';
import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';
import type { FindRecordOptions } from '@warp-drive/core/types';
import type { ChangedAttributesHash } from '@warp-drive/core/types/cache';
import type { CollectionRelationship } from '@warp-drive/core/types/cache/relationship';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { Value } from '@warp-drive/core/types/json/raw';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import type { LegacyAttributeField, LegacyRelationshipField } from '@warp-drive/core/types/schema/fields';

import { upgradeStore } from '../-private';
import type { SerializerOptions } from './minimum-serializer-interface';

type RecordId = string | null;

/**
  Snapshot is not directly instantiable.
  Instances are provided to a consuming application's
  adapters and serializers for certain requests.

  Snapshots are only available when using `@ember-data/legacy-compat`
  for legacy compatibility with adapters and serializers.

  For serialization of records in modern paradigms, request data from
  the cache or off the record directly.

  @hideconstructor
  @public
*/
export class Snapshot<R = unknown> {
  declare private __attributes: Record<keyof R & string, unknown> | null;
  declare private _belongsToRelationships: Record<string, Snapshot>;
  declare private _belongsToIds: Record<string, RecordId>;
  declare private _hasManyRelationships: Record<string, Snapshot[]>;
  declare private _hasManyIds: Record<string, RecordId[]>;
  declare private _changedAttributes: ChangedAttributesHash;
  declare private _store: Store;

  /**
    The unique RecordIdentifier associated with this Snapshot.

    @public
  */
  declare identifier: ResourceKey<R extends TypedRecordInstance ? TypeFromInstance<R> : string>;

  /**
   The ResourceType of the underlying record for this Snapshot, as a string.

    @public
  */
  declare modelName: R extends TypedRecordInstance ? TypeFromInstance<R> : string;

  /**
   The id of the snapshot's underlying record

    Example

    ```js
    // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
    postSnapshot.id; // => '1'
    ```

    @public
  */
  declare id: string | null;

  /**
   If `include` was passed to the options for the request, the value
   would be available here.

   @public
  */
  declare include?: string | string[];

  /**
   The adapterOptions passed to the request which generated this Snapshot, if any

   @public
  */
  declare adapterOptions?: Record<string, unknown>;

  constructor(
    options: FindRecordOptions,
    identifier: ResourceKey<R extends TypedRecordInstance ? TypeFromInstance<R> : string>,
    store: Store
  ) {
    this._store = store;

    this.__attributes = null;
    this._belongsToRelationships = Object.create(null) as Record<string, Snapshot>;
    this._belongsToIds = Object.create(null) as Record<string, RecordId>;
    this._hasManyRelationships = Object.create(null) as Record<string, Snapshot[]>;
    this._hasManyIds = Object.create(null) as Record<string, RecordId[]>;

    const hasRecord = !!store._instanceCache.peek(identifier);
    this.modelName = identifier.type;
    this.identifier = identifier;

    /*
      If the we do not yet have a record, then we are
      likely a snapshot being provided to a find request, so we
      populate __attributes lazily. Else, to preserve the "moment
      in time" in which a snapshot is created, we greedily grab
      the values.
     */
    if (hasRecord) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this._attributes;
    }

    this.id = identifier.id;
    this.adapterOptions = options.adapterOptions;
    this.include = options.include;
    this.modelName = identifier.type;

    if (hasRecord) {
      const cache = this._store.cache;
      this._changedAttributes = cache.changedAttrs(identifier);
    }
  }

  /**
   The underlying record for this snapshot. Can be used to access methods and
   properties defined on the record.

   ```js
   const someValue = snapshot.record.someProp;
   ```

   @property record
   @public
   */
  get record(): R | null {
    const record = this._store.peekRecord<R>(this.identifier);
    assert(
      `Record ${this.identifier.type} ${this.identifier.id} (${this.identifier.lid}) is not yet loaded and thus cannot be accessed from the Snapshot during serialization`,
      record !== null
    );
    return record;
  }

  /** @internal */
  private get _attributes(): Record<keyof R & string, unknown> {
    if (this.__attributes !== null) {
      return this.__attributes;
    }
    const attributes = (this.__attributes = Object.create(null) as Record<string, unknown>);
    const { identifier } = this;
    const cache = this._store.cache;

    this.eachAttribute((key: string, meta: LegacyAttributeField) => {
      attributes[key] = cache.getAttr(identifier, key);
    });

    return attributes;
  }

  get isNew(): boolean {
    const cache = this._store.cache;
    return cache?.isNew(this.identifier) || false;
  }

  /**
   Returns the value of an attribute.

   Example

   ```javascript
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postSnapshot.attr('author'); // => 'Tomster'
   postSnapshot.attr('title'); // => 'Ember.js rocks'
   ```

   Note: Values are loaded eagerly and cached when the snapshot is created.

   @return The attribute value or undefined
   @public
   */
  attr(keyName: keyof R & string): unknown {
    if (keyName in this._attributes) {
      return this._attributes[keyName];
    }
    assert(`Model '${this.identifier.lid}' has no attribute named '${keyName}' defined.`, false);
  }

  /**
   Returns all attributes and their corresponding values.

   ::: warning ⚠️ WARNING
   Attributes are SHALLOW copied from the cache.
   Because they are NOT deep copied from the cache, mutating
   any object or array fields will cause unintended side-effects
   and bugs.
   :::

   Example

   ```js
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postSnapshot.attributes(); // => { author: 'Tomster', title: 'Ember.js rocks' }
   ```

   @return All attributes of the current snapshot
   @public
   */
  attributes(): Record<keyof R & string, unknown> {
    return { ...this._attributes };
  }

  /**
   Returns all changed attributes and their old and new values.

   Example

   ```js
   // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
   postModel.set('title', 'Ember.js rocks!');
   postSnapshot.changedAttributes(); // => { title: ['Ember.js rocks', 'Ember.js rocks!'] }
   ```

   @return All changed attributes of the current snapshot
   @public
   */
  changedAttributes(): ChangedAttributesHash {
    const changedAttributes = Object.create(null) as ChangedAttributesHash;
    if (!this._changedAttributes) {
      return changedAttributes;
    }

    const changedAttributeKeys = Object.keys(this._changedAttributes);

    for (let i = 0, length = changedAttributeKeys.length; i < length; i++) {
      const key = changedAttributeKeys[i];
      changedAttributes[key] = this._changedAttributes[key].slice() as [Value | undefined, Value];
    }

    return changedAttributes;
  }

  /**
   Returns the current value of a belongsTo relationship.

   `belongsTo` takes an optional hash of options as a second parameter,
   currently supported options are:

   - `id`: set to `true` if you only want the ID of the related record to be
   returned.

   Example

   ```js
   // store.push('post', { id: 1, title: 'Hello World' });
   // store.createRecord('comment', { body: 'Lorem ipsum', post: post });
   commentSnapshot.belongsTo('post'); // => Snapshot
   commentSnapshot.belongsTo('post', { id: true }); // => '1'

   // store.push('comment', { id: 1, body: 'Lorem ipsum' });
   commentSnapshot.belongsTo('post'); // => undefined
   ```

   Calling `belongsTo` will return a new Snapshot as long as there's any known
   data for the relationship available, such as an ID. If the relationship is
   known but unset, `belongsTo` will return `null`. If the contents of the
   relationship is unknown `belongsTo` will return `undefined`.

   Note: Relationships are loaded lazily and cached upon first access.

   @public
   @return A snapshot or ID of a known relationship or null if the
   relationship is known but unset. undefined will be returned if the
   contents of the relationship are unknown.
   */
  belongsTo(keyName: string, options?: { id?: boolean }): Snapshot | RecordId | undefined {
    const returnModeIsId = !!(options && options.id);
    let result: Snapshot | RecordId | undefined;
    const store = this._store;

    if (returnModeIsId === true && keyName in this._belongsToIds) {
      return this._belongsToIds[keyName];
    }

    if (returnModeIsId === false && keyName in this._belongsToRelationships) {
      return this._belongsToRelationships[keyName];
    }

    const relationshipMeta = store.schema.fields({ type: this.modelName }).get(keyName);
    assert(
      `Model '${this.identifier.lid}' has no belongsTo relationship named '${keyName}' defined.`,
      relationshipMeta && relationshipMeta.kind === 'belongsTo'
    );

    assert(`snapshot.belongsTo only supported when using a cache that supports the graph`, this._store._graph);

    const { identifier } = this;

    if (DEBUG) {
      const relationship = this._store.schema.fields(identifier)?.get(keyName);
      assert(
        `You looked up the ${keyName} belongsTo relationship for { type: ${identifier.type}, id: ${
          identifier.id || ''
        }, lid: ${identifier.lid} but no such relationship was found.`,
        relationship
      );
      assert(
        `You looked up the ${keyName} belongsTo relationship for { type: ${identifier.type}, id: ${
          identifier.id || ''
        }, lid: ${identifier.lid} but that relationship is a hasMany.`,
        relationship.kind === 'belongsTo'
      );
    }

    const value = this._store.cache.getRelationship(identifier, keyName);
    const data = value && value.data;
    upgradeStore(store);

    const inverseIdentifier = data ? store.cacheKeyManager.getOrCreateRecordIdentifier(data) : null;

    if (value && value.data !== undefined) {
      const cache = store.cache;

      if (inverseIdentifier && !cache.isDeleted(inverseIdentifier)) {
        if (returnModeIsId) {
          result = inverseIdentifier.id;
        } else {
          result = store._fetchManager.createSnapshot(inverseIdentifier);
        }
      } else {
        result = null;
      }
    }

    if (returnModeIsId) {
      this._belongsToIds[keyName] = result as RecordId;
    } else {
      this._belongsToRelationships[keyName] = result as Snapshot;
    }

    return result;
  }

  /**
   Returns the current value of a hasMany relationship.

   `hasMany` takes an optional hash of options as a second parameter,
   currently supported options are:

   - `ids`: set to `true` if you only want the IDs of the related records to be
   returned.

   Example

   ```javascript
   // store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
   postSnapshot.hasMany('comments'); // => [Snapshot, Snapshot]
   postSnapshot.hasMany('comments', { ids: true }); // => ['2', '3']

   // store.push('post', { id: 1, title: 'Hello World' });
   postSnapshot.hasMany('comments'); // => undefined
   ```

   Note: Relationships are loaded lazily and cached upon first access.

   @public
   @return An array of snapshots or IDs of a known
   relationship or an empty array if the relationship is known but unset.
   undefined will be returned if the contents of the relationship is unknown.
   */
  hasMany(keyName: string, options?: { ids?: boolean }): RecordId[] | Snapshot[] | undefined {
    const returnModeIsIds = !!(options && options.ids);
    let results: RecordId[] | Snapshot[] | undefined;
    const cachedIds: RecordId[] | undefined = this._hasManyIds[keyName];
    const cachedSnapshots: Snapshot[] | undefined = this._hasManyRelationships[keyName];

    if (returnModeIsIds === true && keyName in this._hasManyIds) {
      return cachedIds;
    }

    if (returnModeIsIds === false && keyName in this._hasManyRelationships) {
      return cachedSnapshots;
    }

    const store = this._store;
    upgradeStore(store);
    const relationshipMeta = store.schema.fields({ type: this.modelName }).get(keyName);
    assert(
      `Model '${this.identifier.lid}' has no hasMany relationship named '${keyName}' defined.`,
      relationshipMeta && relationshipMeta.kind === 'hasMany'
    );

    // TODO @runspired it seems this code branch would not work with CUSTOM_MODEL_CLASSes
    // this check is not a regression in behavior because relationships don't currently
    // function without access to intimate API contracts between RecordData and Model.
    // This is a requirement we should fix as soon as the relationship layer does not require
    // this intimate API usage.
    assert(`snapshot.hasMany only supported when using a cache that supports the graph`, this._store._graph);

    const { identifier } = this;
    if (DEBUG) {
      const relationship = this._store.schema.fields(identifier)?.get(keyName);
      assert(
        `You looked up the ${keyName} hasMany relationship for { type: ${identifier.type}, id: ${
          identifier.id || ''
        }, lid: ${identifier.lid} but no such relationship was found.`,
        relationship
      );
      assert(
        `You looked up the ${keyName} hasMany relationship for { type: ${identifier.type}, id: ${
          identifier.id || ''
        }, lid: ${identifier.lid} but that relationship is a belongsTo.`,
        relationship.kind === 'hasMany'
      );
    }

    const value = this._store.cache.getRelationship(identifier, keyName) as CollectionRelationship;

    if (value.data) {
      results = [];
      value.data.forEach((member) => {
        const inverseIdentifier = store.cacheKeyManager.getOrCreateRecordIdentifier(member);
        const cache = store.cache;

        if (!cache.isDeleted(inverseIdentifier)) {
          if (returnModeIsIds) {
            (results as RecordId[]).push(inverseIdentifier.id);
          } else {
            (results as Snapshot[]).push(store._fetchManager.createSnapshot(inverseIdentifier));
          }
        }
      });
    }

    // we assign even if `undefined` so that we don't reprocess the relationship
    // on next access. This works with the `keyName in` checks above.
    if (returnModeIsIds) {
      this._hasManyIds[keyName] = results as RecordId[];
    } else {
      this._hasManyRelationships[keyName] = results as Snapshot[];
    }

    return results;
  }

  /**
    Iterates through all the attributes of the model, calling the passed
    function on each attribute.

    Example

    ```javascript
    snapshot.eachAttribute(function(name, meta) {
      // ...
    });
    ```

    @param callback the callback to execute
    @param binding the optional value to which the callback's `this` should be bound
    @public
  */
  eachAttribute(callback: (key: string, meta: LegacyAttributeField) => void, binding?: unknown): void {
    // if the store has a modelFor implementation, we use it to iterate attributes. This allows
    // a custom "ModelSchema" class for legacy serializers to adapt to new fields if desired.
    if (typeof this._store.modelFor === 'function') {
      const modelSchema = this._store.modelFor(this.identifier.type);
      modelSchema.eachAttribute(callback, binding);
    } else {
      const fields = this._store.schema.fields(this.identifier);
      fields.forEach((field, key) => {
        if (field.kind === 'attribute') {
          callback.call(binding, key, field);
        }
      });
    }
  }

  /**
    Iterates through all the relationships of the model, calling the passed
    function on each relationship.

    Example

    ```javascript
    snapshot.eachRelationship(function(name, relationship) {
      // ...
    });
    ```

    @param callback the callback to execute
    @param binding the optional value to which the callback's `this` should be bound
    @public
  */
  eachRelationship(callback: (key: string, meta: LegacyRelationshipField) => void, binding?: unknown): void {
    // if the store has a modelFor implementation, we use it to iterate relationships. This allows
    // a custom "ModelSchema" class for legacy serializers to adapt to new fields if desired.
    if (typeof this._store.modelFor === 'function') {
      const modelSchema = this._store.modelFor(this.identifier.type);
      modelSchema.eachRelationship(callback, binding);
    } else {
      const fields = this._store.schema.fields(this.identifier);
      fields.forEach((field, key) => {
        if (field.kind === 'belongsTo' || field.kind === 'hasMany') {
          callback.call(binding, key, field);
        }
      });
    }
  }

  /**
    Serializes the snapshot using the serializer for the model.

    Example

    ```js [app/adapters/application.js]
    import Adapter from '@ember-data/adapter';

    export default Adapter.extend({
      createRecord(store, type, snapshot) {
        let data = snapshot.serialize({ includeId: true });
        let url = `/${type.modelName}`;

        return fetch(url, {
          method: 'POST',
          body: data,
        }).then((response) => response.json())
      }
    });
    ```

    @return an object whose values are primitive JSON values only
    @public
   */
  serialize(options?: SerializerOptions): unknown {
    upgradeStore(this._store);
    const serializer = this._store.serializerFor(this.modelName);
    assert(`Cannot serialize record, no serializer found`, serializer);
    return serializer.serialize(this, options);
  }
}
