import type { ModelSchema } from '@ember-data/types/q/ds-model';
import type { AttributeSchema, RelationshipSchema } from '@ember-data/types/q/record-data-schemas';
import type { Dict } from '@ember-data/types/q/utils';

import type Store from '../store-service';

// if modelFor turns out to be a bottleneck we should replace with a Map
// and clear it during store teardown.
const AvailableShims = new WeakMap<Store, Dict<ShimModelClass>>();

export function getShimClass(store: Store, modelName: string): ShimModelClass {
  let shims = AvailableShims.get(store);

  if (!shims) {
    shims = Object.create(null) as Dict<ShimModelClass>;
    AvailableShims.set(store, shims);
  }

  let shim = shims[modelName];
  if (shim === undefined) {
    shim = shims[modelName] = new ShimModelClass(store, modelName);
  }

  return shim;
}

function mapFromHash<T>(hash: Dict<T>): Map<string, T> {
  let map = new Map();
  for (let i in hash) {
    if (Object.prototype.hasOwnProperty.call(hash, i)) {
      map.set(i, hash[i]);
    }
  }
  return map;
}

// Mimics the static apis of DSModel
export default class ShimModelClass implements ModelSchema {
  declare __store: Store;
  declare modelName: string;
  constructor(store: Store, modelName: string) {
    this.__store = store;
    this.modelName = modelName;
  }

  get fields(): Map<string, 'attribute' | 'belongsTo' | 'hasMany'> {
    let attrs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    let relationships = this.__store.getSchemaDefinitionService().relationshipsDefinitionFor({ type: this.modelName });
    let fields = new Map<string, 'attribute' | 'belongsTo' | 'hasMany'>();
    Object.keys(attrs).forEach((key) => fields.set(key, 'attribute'));
    Object.keys(relationships).forEach((key) => fields.set(key, relationships[key]!.kind));
    return fields;
  }

  get attributes(): Map<string, AttributeSchema> {
    let attrs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    return mapFromHash(attrs);
  }

  get relationshipsByName(): Map<string, RelationshipSchema> {
    let relationships = this.__store.getSchemaDefinitionService().relationshipsDefinitionFor({ type: this.modelName });
    return mapFromHash(relationships);
  }

  eachAttribute<T>(callback: (this: T | undefined, key: string, attribute: AttributeSchema) => void, binding?: T) {
    let attrDefs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    Object.keys(attrDefs).forEach((key) => {
      callback.call(binding, key, attrDefs[key] as AttributeSchema);
    });
  }

  eachRelationship<T>(
    callback: (this: T | undefined, key: string, relationship: RelationshipSchema) => void,
    binding?: T
  ) {
    let relationshipDefs = this.__store
      .getSchemaDefinitionService()
      .relationshipsDefinitionFor({ type: this.modelName });
    Object.keys(relationshipDefs).forEach((key) => {
      callback.call(binding, key, relationshipDefs[key] as RelationshipSchema);
    });
  }

  eachTransformedAttribute<T>(callback: (this: T | undefined, key: string, type: string) => void, binding?: T) {
    const attrDefs = this.__store.getSchemaDefinitionService().attributesDefinitionFor({ type: this.modelName });
    Object.keys(attrDefs).forEach((key) => {
      if (attrDefs[key]!.type) {
        callback.call(binding, key, attrDefs[key]!.type);
      }
    });
  }
}
