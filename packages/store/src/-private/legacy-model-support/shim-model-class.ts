import type { AttributeSchema, RelationshipSchema } from '@warp-drive/core-types/schema';

import type { ModelSchema } from '../../-types/q/ds-model';
import type Store from '../store-service';

type GenericRecord = Record<string, unknown>;

// if modelFor turns out to be a bottleneck we should replace with a Map
// and clear it during store teardown.
const AvailableShims = new WeakMap<Store, Record<string, ShimModelClass<GenericRecord>>>();

export function getShimClass(store: Store, modelName: string): ShimModelClass<GenericRecord> {
  let shims = AvailableShims.get(store);

  if (!shims) {
    shims = Object.create(null) as Record<string, ShimModelClass<GenericRecord>>;
    AvailableShims.set(store, shims);
  }

  let shim = shims[modelName];
  if (shim === undefined) {
    shim = shims[modelName] = new ShimModelClass(store, modelName);
  }

  return shim;
}

function mapFromHash<K extends string, T>(hash: Record<K, T>): Map<K, T> {
  const map: Map<K, T> = new Map();
  for (let i in hash) {
    if (Object.prototype.hasOwnProperty.call(hash, i)) {
      map.set(i, hash[i]);
    }
  }
  return map;
}

// Mimics the static apis of @ember-data/model
export default class ShimModelClass<T extends object> implements ModelSchema<T> {
  declare __store: Store;
  declare modelName: string;
  constructor(store: Store, modelName: string) {
    this.__store = store;
    this.modelName = modelName;
  }

  get fields(): Map<keyof T & string, 'attribute' | 'belongsTo' | 'hasMany'> {
    let attrs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    let relationships = this.__store.getSchemaDefinitionService().relationshipsDefinitionFor({ type: this.modelName });
    let fields = new Map<keyof T & string, 'attribute' | 'belongsTo' | 'hasMany'>();
    Object.keys(attrs).forEach((key) => fields.set(key as keyof T & string, 'attribute'));
    Object.keys(relationships).forEach((key) => fields.set(key as keyof T & string, relationships[key]!.kind));
    return fields;
  }

  get attributes(): Map<keyof T & string, AttributeSchema> {
    let attrs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    return mapFromHash(attrs as Record<keyof T & string, AttributeSchema>);
  }

  get relationshipsByName(): Map<keyof T & string, RelationshipSchema> {
    let relationships = this.__store.getSchemaDefinitionService().relationshipsDefinitionFor({ type: this.modelName });
    return mapFromHash(relationships as Record<keyof T & string, RelationshipSchema>);
  }

  eachAttribute<K extends keyof T & string>(callback: (key: K, attribute: AttributeSchema) => void, binding?: T) {
    let attrDefs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    Object.keys(attrDefs).forEach((key) => {
      callback.call(binding, key as K, attrDefs[key]);
    });
  }

  eachRelationship<K extends keyof T & string>(
    callback: (key: K, relationship: RelationshipSchema) => void,
    binding?: T
  ) {
    let relationshipDefs = this.__store
      .getSchemaDefinitionService()
      .relationshipsDefinitionFor({ type: this.modelName });
    Object.keys(relationshipDefs).forEach((key) => {
      callback.call(binding, key as K, relationshipDefs[key]);
    });
  }

  eachTransformedAttribute<K extends keyof T & string>(callback: (key: K, type: string | null) => void, binding?: T) {
    const attrDefs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    Object.keys(attrDefs).forEach((key) => {
      if (attrDefs[key]!.type) {
        callback.call(binding, key as K, attrDefs[key].type);
      }
    });
  }
}
