import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core-types/record';
import type { AttributeSchema, RelationshipSchema } from '@warp-drive/core-types/schema';

import type { KeyOrString, ModelSchema } from '../../-types/q/ds-model';
import type Store from '../store-service';

// if modelFor turns out to be a bottleneck we should replace with a Map
// and clear it during store teardown.
const AvailableShims = new WeakMap<Store, Record<string, ShimModelClass>>();

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

function mapFromHash<K extends string, T>(hash: Record<K, T>): Map<K, T> {
  const map: Map<K, T> = new Map();
  for (const i in hash) {
    if (Object.prototype.hasOwnProperty.call(hash, i)) {
      map.set(i, hash[i]);
    }
  }
  return map;
}

// Mimics the static apis of @ember-data/model
export default class ShimModelClass<T = unknown> implements ModelSchema<T> {
  declare __store: Store;
  declare modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;
  constructor(store: Store, modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string) {
    this.__store = store;
    this.modelName = modelName;
  }

  get fields(): Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'> {
    const attrs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    const relationships = this.__store
      .getSchemaDefinitionService()
      .relationshipsDefinitionFor({ type: this.modelName });
    const fields = new Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'>();
    Object.keys(attrs).forEach((key) => fields.set(key as KeyOrString<T>, 'attribute'));
    Object.keys(relationships).forEach((key) => fields.set(key as KeyOrString<T>, relationships[key]!.kind));
    return fields;
  }

  get attributes(): Map<KeyOrString<T>, AttributeSchema> {
    const attrs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    return mapFromHash(attrs as Record<keyof T & string, AttributeSchema>);
  }

  get relationshipsByName(): Map<KeyOrString<T>, RelationshipSchema> {
    const relationships = this.__store
      .getSchemaDefinitionService()
      .relationshipsDefinitionFor({ type: this.modelName });
    return mapFromHash(relationships as Record<keyof T & string, RelationshipSchema>);
  }

  eachAttribute<K extends KeyOrString<T>>(callback: (key: K, attribute: AttributeSchema) => void, binding?: T) {
    const attrDefs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    Object.keys(attrDefs).forEach((key) => {
      callback.call(binding, key as K, attrDefs[key]);
    });
  }

  eachRelationship<K extends KeyOrString<T>>(
    callback: (key: K, relationship: RelationshipSchema) => void,
    binding?: T
  ) {
    const relationshipDefs = this.__store
      .getSchemaDefinitionService()
      .relationshipsDefinitionFor({ type: this.modelName });
    Object.keys(relationshipDefs).forEach((key) => {
      callback.call(binding, key as K, relationshipDefs[key]);
    });
  }

  eachTransformedAttribute<K extends KeyOrString<T>>(callback: (key: K, type: string | null) => void, binding?: T) {
    const attrDefs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    Object.keys(attrDefs).forEach((key) => {
      if (attrDefs[key]!.type) {
        callback.call(binding, key as K, attrDefs[key].type);
      }
    });
  }
}
