import { assert } from '@warp-drive/build-config/macros';

import { getOrSetGlobal } from '../../types/-private.ts';
import type { Cache } from '../../types/cache.ts';
import type { StableNewRecordIdentifier, StableRecordIdentifier } from '../../types/identifier.ts';
import type { Value } from '../../types/json/raw';
import type { Includes, OpaqueRecordInstance, TypedRecordInstance, TypeFromInstance } from '../../types/record.ts';
import type {
  LegacyAttributeField,
  LegacyRelationshipField,
  LegacyRelationshipField as RelationshipSchema,
} from '../../types/schema/fields.ts';
import type {
  ExistingResourceIdentifierObject,
  ExistingResourceObject,
  InnerRelationshipDocument,
} from '../../types/spec/json-api-raw';
import type { SingleResourceDocument } from '../../types/spec/json-api-raw.ts';
import { ensureStringId, type InstanceCache, recordIdentifierFor } from '../-private';
import type { NotificationType } from '../-private/managers/notification-manager.ts';
import { defineSignal } from '../-private/new-core-tmp/reactivity/signal.ts';
import type { Store } from './store.ts';

/*
    When a find request is triggered on the store, the user can optionally pass in
    attributes and relationships to be preloaded. These are meant to behave as if they
    came back from the server, except the user obtained them out of band and is informing
    the store of their existence. The most common use case is for supporting client side
    nested URLs, such as `/posts/1/comments/2` so the user can do
    `store.findRecord('comment', 2, { preload: { post: 1 } })` without having to fetch the post.

    Preloaded data can be attributes and relationships passed in either as IDs or as actual
    models.
  */
type PreloadRelationshipValue = OpaqueRecordInstance | string;
export function preloadData(store: Store, identifier: StableNewRecordIdentifier, preload: Record<string, Value>): void {
  const jsonPayload: Partial<ExistingResourceObject> = {};
  //TODO(Igor) consider the polymorphic case
  const schemas = store.schema;
  const fields = schemas.fields(identifier);
  Object.keys(preload).forEach((key) => {
    const preloadValue = preload[key];

    const field = fields.get(key);
    if (field && (field.kind === 'hasMany' || field.kind === 'belongsTo')) {
      if (!jsonPayload.relationships) {
        jsonPayload.relationships = {};
      }
      jsonPayload.relationships[key] = preloadRelationship(field, preloadValue);
    } else {
      if (!jsonPayload.attributes) {
        jsonPayload.attributes = {};
      }
      jsonPayload.attributes[key] = preloadValue;
    }
  });
  const cache = store.cache;
  const hasRecord = Boolean(store._instanceCache.peek(identifier));
  cache.upsert(identifier, jsonPayload, hasRecord);
}

function preloadRelationship(
  schema: RelationshipSchema,
  preloadValue: PreloadRelationshipValue | null | Array<PreloadRelationshipValue>
): InnerRelationshipDocument<ExistingResourceIdentifierObject> {
  const relatedType = schema.type;

  if (schema.kind === 'hasMany') {
    assert('You need to pass in an array to set a hasMany property on a record', Array.isArray(preloadValue));
    return { data: preloadValue.map((value) => _convertPreloadRelationshipToJSON(value, relatedType)) };
  }

  assert('You should not pass in an array to set a belongsTo property on a record', !Array.isArray(preloadValue));
  return { data: preloadValue ? _convertPreloadRelationshipToJSON(preloadValue, relatedType) : null };
}

/*
  findRecord('user', '1', { preload: { friends: ['1'] }});
  findRecord('user', '1', { preload: { friends: [record] }});
*/
function _convertPreloadRelationshipToJSON(
  value: OpaqueRecordInstance | string,
  type: string
): ExistingResourceIdentifierObject {
  if (typeof value === 'string' || typeof value === 'number') {
    return { type, id: ensureStringId(value) };
  }
  // TODO if not a record instance assert it's an identifier
  // and allow identifiers to be used
  return recordIdentifierFor(value) as ExistingResourceIdentifierObject;
}

export interface BaseFinderOptions<T = unknown> {
  reload?: boolean;
  backgroundReload?: boolean;
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
  adapterOptions?: Record<string, unknown>;
}
export interface FindRecordOptions<T = unknown> extends BaseFinderOptions<T> {
  /**
   * Data to preload into the store before the request is made.
   * This feature is *highly* discouraged and has no corresponding
   * feature when using builders and handlers.
   *
   * Excepting relationships: the data should be in the form of a
   * JSON object where the keys are fields on the record and the value
   * is the raw value to be added to the cache.
   *
   * Relationships can either be provided as string IDs from which
   * an identifier will be built base upon the relationship's expected
   * resource type, or be record instances from which the identifier
   * will be extracted.
   *
   */
  preload?: Record<string, Value>;
}

export type QueryOptions = {
  [K in string | 'adapterOptions']?: K extends 'adapterOptions' ? Record<string, unknown> : unknown;
};

export type FindAllOptions<T = unknown> = BaseFinderOptions<T>;
export type LegacyResourceQuery<T = unknown> = {
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
  [key: string]: Value | undefined;
};

export type KeyOrString<T> = keyof T & string extends never ? string : keyof T & string;

/**
 * Minimum subset of static schema methods and properties on the
 * "model" class.
 *
 * Only used when using the legacy schema-service implementation
 * for @ember-data/model or when wrapping schema for legacy
 * Adapters/Serializers.
 *
 */
export interface ModelSchema<T = unknown> {
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;
  fields: Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: Map<KeyOrString<T>, LegacyAttributeField>;
  relationshipsByName: Map<KeyOrString<T>, LegacyRelationshipField>;
  eachAttribute<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, attribute: LegacyAttributeField) => void,
    binding?: T
  ): void;
  eachRelationship<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, relationship: LegacyRelationshipField) => void,
    binding?: T
  ): void;
  eachTransformedAttribute<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, type: string | null) => void,
    binding?: T
  ): void;
}

function _resourceIsFullDeleted(identifier: StableRecordIdentifier, cache: Cache): boolean {
  return cache.isDeletionCommitted(identifier) || (cache.isNew(identifier) && cache.isDeleted(identifier));
}

export function resourceIsFullyDeleted(instanceCache: InstanceCache, identifier: StableRecordIdentifier): boolean {
  const cache = instanceCache.cache;
  return !cache || _resourceIsFullDeleted(identifier, cache);
}

/**
   A `RecordReference` is a low-level API that allows users and
   addon authors to perform meta-operations on a record.

   @hideconstructor
   @public
*/
export class RecordReference {
  /** @internal */
  declare private store: Store;
  // unsubscribe token given to us by the notification manager
  /** @internal */
  private ___token!: object;
  /** @internal */
  private ___identifier: StableRecordIdentifier;
  /** @internal */
  declare private _ref: number;

  constructor(store: Store, identifier: StableRecordIdentifier) {
    this.store = store;
    this.___identifier = identifier;
    this.___token = store.notifications.subscribe(
      identifier,
      (_: StableRecordIdentifier, bucket: NotificationType, notifiedKey?: string) => {
        if (bucket === 'identity' || (bucket === 'attributes' && notifiedKey === 'id')) {
          this._ref++;
        }
      }
    );
  }

  /** @internal */
  destroy(): void {
    this.store.notifications.unsubscribe(this.___token);
  }

  get type(): string {
    return this.identifier().type;
  }

  /**
     The `id` of the record that this reference refers to.

     Together, the `type` and `id` properties form a composite key for
     the identity map.

     Example

     ```javascript
     let userRef = store.getReference('user', 1);

     userRef.id(); // '1'
     ```

    @public
    @return The id of the record.
  */
  id(): string | null {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this._ref; // consume the tracked prop
    return this.___identifier.id;
  }

  /**
     The `identifier` of the record that this reference refers to.

     Together, the `type` and `id` properties form a composite key for
     the identity map.

     Example

     ```javascript
     let userRef = store.getReference('user', 1);

     userRef.identifier(); // '1'
     ```

    @public
    @return The identifier of the record.
  */
  identifier(): StableRecordIdentifier {
    return this.___identifier;
  }

  /**
     How the reference will be looked up when it is loaded. Currently
     this always returns `identity` to signify that a record will be
     loaded by its `type` and `id`.

     Example

     ```javascript
     const userRef = store.getReference('user', 1);

     userRef.remoteType(); // 'identity'
     ```

     @public
  */
  remoteType(): 'identity' {
    return 'identity';
  }

  /**
    This API allows you to provide a reference with new data. The
    simplest usage of this API is similar to `store.push`: you provide a
    normalized hash of data and the object represented by the reference
    will update.

    If you pass a promise to `push`, Ember Data will not ask the adapter
    for the data if another attempt to fetch it is made in the
    interim. When the promise resolves, the underlying object is updated
    with the new data, and the promise returned by *this function* is resolved
    with that object.

    For example, `recordReference.push(promise)` will be resolved with a
    record.

     Example

     ```javascript
     let userRef = store.getReference('user', 1);

     // provide data for reference
     userRef.push({
       data: {
         id: "1",
         type: "user",
         attributes: {
           username: "@user"
         }
       }
     }).then(function(user) {
       userRef.value() === user;
     });
     ```

    @public
    @param objectOrPromise a JSON:API ResourceDocument or a promise resolving to one
    @return a promise for the value (record or relationship)
  */
  push(objectOrPromise: SingleResourceDocument | Promise<SingleResourceDocument>): Promise<OpaqueRecordInstance> {
    // TODO @deprecate pushing unresolved payloads
    return Promise.resolve(objectOrPromise).then((data) => {
      return this.store.push(data);
    });
  }

  /**
    If the entity referred to by the reference is already loaded, it is
    present as `reference.value`. Otherwise the value returned by this function
    is `null`.

     Example

     ```javascript
     let userRef = store.getReference('user', 1);

     userRef.value(); // user
     ```

    @public
    @return the record for this RecordReference
  */
  value(): OpaqueRecordInstance | null {
    return this.store.peekRecord(this.___identifier);
  }

  /**
     Triggers a fetch for the backing entity based on its `remoteType`
     (see `remoteType` definitions per reference type).

     Example

     ```javascript
     let userRef = store.getReference('user', 1);

     // load user (via store.find)
     userRef.load().then(...)
     ```

    @public
    @return the record for this RecordReference
  */
  load(): Promise<unknown> {
    const id = this.id();
    if (id !== null) {
      return this.store.findRecord(this.type, id);
    }
    assert(`Unable to fetch record of type ${this.type} without an id`);
  }

  /**
     Reloads the record if it is already loaded. If the record is not
     loaded it will load the record via `store.findRecord`

     Example

     ```javascript
     let userRef = store.getReference('user', 1);

     // or trigger a reload
     userRef.reload().then(...)
     ```

    @public
    @return the record for this RecordReference
  */
  reload(): Promise<unknown> {
    const id = this.id();
    if (id !== null) {
      return this.store.findRecord(this.type, id, { reload: true });
    }
    assert(`Unable to fetch record of type ${this.type} without an id`);
  }
}

defineSignal(RecordReference.prototype, '_ref');

// if modelFor turns out to be a bottleneck we should replace with a Map
// and clear it during store teardown.
const AvailableShims = getOrSetGlobal('AvailableShims', new WeakMap<Store, Record<string, ShimModelClass>>());

export function getShimClass<T>(
  store: Store,
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string
): ShimModelClass<T> {
  let shims = AvailableShims.get(store);

  if (!shims) {
    shims = Object.create(null) as Record<string, ShimModelClass>;
    AvailableShims.set(store, shims);
  }

  let shim = shims[modelName];
  if (shim === undefined) {
    shim = shims[modelName] = new ShimModelClass<unknown>(store, modelName);
  }

  return shim;
}

// Mimics the static apis of @ember-data/model
export class ShimModelClass<T = unknown> implements ModelSchema<T> {
  declare __store: Store;
  declare modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;
  constructor(store: Store, modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string) {
    this.__store = store;
    this.modelName = modelName;
  }

  get fields(): Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'> {
    const fields = new Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'>();
    const fieldSchemas = this.__store.schema.fields({ type: this.modelName });

    fieldSchemas.forEach((schema, key) => {
      if (schema.kind === 'attribute' || schema.kind === 'belongsTo' || schema.kind === 'hasMany') {
        fields.set(key as KeyOrString<T>, schema.kind);
      }
    });

    return fields;
  }

  get attributes(): Map<KeyOrString<T>, LegacyAttributeField> {
    const attrs = new Map<KeyOrString<T>, LegacyAttributeField>();
    const fields = this.__store.schema.fields({ type: this.modelName });

    fields.forEach((schema, key) => {
      if (schema.kind === 'attribute') {
        attrs.set(key as KeyOrString<T>, schema);
      }
    });

    return attrs;
  }

  get relationshipsByName(): Map<KeyOrString<T>, LegacyRelationshipField> {
    const rels = new Map<KeyOrString<T>, LegacyRelationshipField>();
    const fields = this.__store.schema.fields({ type: this.modelName });

    fields.forEach((schema, key) => {
      if (schema.kind === 'belongsTo' || schema.kind === 'hasMany') {
        rels.set(key as KeyOrString<T>, schema);
      }
    });

    return rels;
  }

  eachAttribute<K extends KeyOrString<T>>(
    callback: (key: K, attribute: LegacyAttributeField) => void,
    binding?: T
  ): void {
    this.__store.schema.fields({ type: this.modelName }).forEach((schema, key) => {
      if (schema.kind === 'attribute') {
        callback.call(binding, key as K, schema);
      }
    });
  }

  eachRelationship<K extends KeyOrString<T>>(
    callback: (key: K, relationship: LegacyRelationshipField) => void,
    binding?: T
  ): void {
    this.__store.schema.fields({ type: this.modelName }).forEach((schema, key) => {
      if (schema.kind === 'belongsTo' || schema.kind === 'hasMany') {
        callback.call(binding, key as K, schema);
      }
    });
  }

  eachTransformedAttribute<K extends KeyOrString<T>>(
    callback: (key: K, type: string | null) => void,
    binding?: T
  ): void {
    this.__store.schema.fields({ type: this.modelName }).forEach((schema, key) => {
      if (schema.kind === 'attribute') {
        const type = schema.type;
        if (type) callback.call(binding, key as K, type);
      }
    });
  }
}
