import { ModelSchema } from '../../ts-interfaces/ds-model';
import type { AttributeSchema, RelationshipSchema } from '../../ts-interfaces/record-data-schemas';
import type { Dict } from '../../ts-interfaces/utils';
import type CoreStore from '../core-store';

const AvailableShims = new WeakMap<CoreStore, Dict<ShimModelClass>>();

export function getShimClass(store: CoreStore, modelName: string): ShimModelClass {
  let shims = AvailableShims.get(store);

  if (shims === undefined) {
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
  // TODO Maybe expose the class here?
  constructor(private __store: CoreStore, public modelName: string) {}

  get fields(): Map<string, 'attribute' | 'belongsTo' | 'hasMany'> {
    let attrs = this.__store._attributesDefinitionFor(this.modelName);
    let relationships = this.__store._relationshipsDefinitionFor(this.modelName);
    let fields = new Map<string, 'attribute' | 'belongsTo' | 'hasMany'>();
    Object.keys(attrs).forEach((key) => fields.set(key, 'attribute'));
    Object.keys(relationships).forEach((key) => fields.set(key, relationships[key]!.kind));
    return fields;
  }

  get attributes(): Map<string, AttributeSchema> {
    let attrs = this.__store._attributesDefinitionFor(this.modelName);
    return mapFromHash(attrs);
  }

  get relationshipsByName(): Map<string, RelationshipSchema> {
    let relationships = this.__store._relationshipsDefinitionFor(this.modelName);
    return mapFromHash(relationships);
  }

  eachAttribute<T>(callback: (this: T | undefined, key: string, attribute: AttributeSchema) => void, binding?: T) {
    let attrDefs = this.__store._attributesDefinitionFor(this.modelName);
    Object.keys(attrDefs).forEach((key) => {
      callback.call(binding, key, attrDefs[key] as AttributeSchema);
    });
  }

  eachRelationship<T>(
    callback: (this: T | undefined, key: string, relationship: RelationshipSchema) => void,
    binding?: T
  ) {
    let relationshipDefs = this.__store._relationshipsDefinitionFor(this.modelName);
    Object.keys(relationshipDefs).forEach((key) => {
      callback.call(binding, key, relationshipDefs[key] as RelationshipSchema);
    });
  }

  eachTransformedAttribute<T>(
    callback: (this: T | undefined, key: string, relationship: RelationshipSchema) => void,
    binding?: T
  ) {
    let relationshipDefs = this.__store._relationshipsDefinitionFor(this.modelName);
    Object.keys(relationshipDefs).forEach((key) => {
      if (relationshipDefs[key]!.type) {
        callback.call(binding, key, relationshipDefs[key] as RelationshipSchema);
      }
    });
  }
}
