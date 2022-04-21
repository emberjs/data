import { DEBUG } from '@glimmer/env';

import { DefaultRegistry, ResolvedRegistry } from '@ember-data/types';
import { AttributeFieldsFor, RecordType, RelationshipFieldsFor } from '@ember-data/types/utils';

import { AttributesMap, ModelSchema, RelationshipsMap } from '../../ts-interfaces/ds-model';
import type { AttributeSchema, RelationshipSchema } from '../../ts-interfaces/record-data-schemas';
import type { Dict } from '../../ts-interfaces/utils';
import type Store from '../store';
import WeakCache from '../weak-cache';

const AvailableShims = new WeakCache<Store, Dict<ShimModelClass>>(DEBUG ? 'schema-shims' : '');
AvailableShims._generator = () => {
  return Object.create(null) as Dict<ShimModelClass>;
};
export function getShimClass<R extends ResolvedRegistry, T extends RecordType<R>>(
  store: Store<R>,
  modelName: T
): ShimModelClass<R, T> {
  let shims = AvailableShims.lookup<Store<R>, Dict<ShimModelClass<R, T>>>(store);
  let shim = shims[modelName];
  if (shim === undefined) {
    shim = shims[modelName] = new ShimModelClass(store, modelName);
  }

  return shim;
}

function mapFromHash<T>(hash: Dict<unknown>): T {
  let map = new Map();
  for (let i in hash) {
    if (Object.prototype.hasOwnProperty.call(hash, i)) {
      map.set(i, hash[i]);
    }
  }
  return map as unknown as T;
}

// Mimics the static apis of DSModel
export default class ShimModelClass<
  R extends ResolvedRegistry = DefaultRegistry,
  T extends RecordType<R> = RecordType<R>
> implements ModelSchema<R, T>
{
  // TODO Maybe expose the class here?
  constructor(private __store: Store<R>, public modelName: T) {}

  get fields(): Map<string, 'attribute' | 'belongsTo' | 'hasMany'> {
    let attrs = this.__store._attributesDefinitionFor({ type: this.modelName });
    let relationships = this.__store._relationshipsDefinitionFor({ type: this.modelName });
    let fields = new Map<string, 'attribute' | 'belongsTo' | 'hasMany'>();
    Object.keys(attrs).forEach((key) => fields.set(key, 'attribute'));
    Object.keys(relationships).forEach((key) => fields.set(key, relationships[key]!.kind));
    return fields;
  }

  get attributes(): AttributesMap<R, T> {
    let attrs = this.__store._attributesDefinitionFor({ type: this.modelName });
    return mapFromHash(attrs);
  }

  get relationshipsByName(): RelationshipsMap<R, T> {
    let relationships = this.__store._relationshipsDefinitionFor({ type: this.modelName });
    return mapFromHash(relationships);
  }

  eachAttribute<I>(
    callback: <F extends AttributeFieldsFor<R, T>>(this: I, key: F, meta: AttributeSchema<R, T, F>) => void,
    binding: I
  ): void {
    let attrDefs = this.__store._attributesDefinitionFor({ type: this.modelName });
    const attrKeys = Object.keys(attrDefs) as AttributeFieldsFor<R, T>[];
    attrKeys.forEach(<F extends AttributeFieldsFor<R, T>>(key: F) => {
      callback.call(binding, key, attrDefs[key]);
    });
  }

  eachRelationship<I>(
    callback: <F extends RelationshipFieldsFor<R, T>>(this: I, key: F, meta: RelationshipSchema<R, T, F>) => void,
    binding: I
  ): void {
    let relationshipDefs = this.__store._relationshipsDefinitionFor({ type: this.modelName });
    const relKeys = Object.keys(relationshipDefs) as RelationshipFieldsFor<R, T>[];
    relKeys.forEach(<F extends RelationshipFieldsFor<R, T>>(key: F) => {
      callback.call(binding, key, relationshipDefs[key]);
    });
  }

  eachTransformedAttribute<I>(
    callback: <F extends AttributeFieldsFor<R, T>>(this: I, key: F, attribute: AttributeSchema<R, T, F>) => void,
    binding: I
  ): void {
    let attrDefs = this.__store._attributesDefinitionFor({ type: this.modelName });
    const attrKeys = Object.keys(attrDefs) as AttributeFieldsFor<R, T>[];
    attrKeys.forEach(<F extends AttributeFieldsFor<R, T>>(key: F) => {
      if (attrDefs[key]!.type) {
        callback.call(binding, key, attrDefs[key]);
      }
    });
  }
}
