import { getOrSetGlobal } from '../../../types/-private.ts';
import type { TypedRecordInstance, TypeFromInstance } from '../../../types/record.ts';
import type { LegacyAttributeField, LegacyRelationshipField } from '../../../types/schema/fields.ts';
import type { KeyOrString, ModelSchema } from '../../-types/q/ds-model.ts';
import type { Store } from '../store-service.ts';

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
export default class ShimModelClass<T = unknown> implements ModelSchema<T> {
  declare private __store: Store;
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
