import { getOwner } from '@ember/application';

import type { RecordIdentifier } from '@warp-drive/core-types/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@warp-drive/core-types/schema';

import type Store from '@ember-data/store';

import type { FactoryCache, ModelFactory, ModelStore } from './model';
import Model from './model';
import _modelForMixin from './model-for-mixin';
import { normalizeModelName } from './util';

export class ModelSchemaProvider {
  declare store: ModelStore;
  declare _relationshipsDefCache: Record<string, RelationshipsSchema>;
  declare _attributesDefCache: Record<string, AttributesSchema>;

  constructor(store: ModelStore) {
    this.store = store;
    this._relationshipsDefCache = Object.create(null) as Record<string, RelationshipsSchema>;
    this._attributesDefCache = Object.create(null) as Record<string, AttributesSchema>;
  }

  // Following the existing RD implementation
  attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
    const { type } = identifier;
    let attributes: AttributesSchema;

    attributes = this._attributesDefCache[type];

    if (attributes === undefined) {
      let modelClass = this.store.modelFor(type);
      let attributeMap = modelClass.attributes;

      attributes = Object.create(null) as AttributesSchema;
      attributeMap.forEach((meta, name) => (attributes[name] = meta));
      this._attributesDefCache[type] = attributes;
    }

    return attributes;
  }

  // Following the existing RD implementation
  relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema {
    const { type } = identifier;
    let relationships: RelationshipsSchema;

    relationships = this._relationshipsDefCache[type];

    if (relationships === undefined) {
      let modelClass = this.store.modelFor(type) as typeof Model;
      relationships = modelClass.relationshipsObject || null;
      this._relationshipsDefCache[type] = relationships;
    }

    return relationships;
  }

  doesTypeExist(modelName: string): boolean {
    const type = normalizeModelName(modelName);
    const factory = getModelFactory(this.store, type);

    return factory !== null;
  }
}

export function buildSchema(store: Store) {
  return new ModelSchemaProvider(store as ModelStore);
}

export function getModelFactory(store: ModelStore, type: string): ModelFactory | null {
  if (!store._modelFactoryCache) {
    store._modelFactoryCache = Object.create(null) as FactoryCache;
  }
  const cache = store._modelFactoryCache;
  let factory: ModelFactory | undefined = cache[type];

  if (!factory) {
    const owner = getOwner(store)!;
    factory = owner.factoryFor(`model:${type}`) as ModelFactory | undefined;

    if (!factory) {
      //Support looking up mixins as base types for polymorphic relationships
      factory = _modelForMixin(store, type);
    }

    if (!factory) {
      // we don't cache misses in case someone wants to register a missing model
      return null;
    }

    let klass = factory.class;

    if (klass.isModel) {
      let hasOwnModelNameSet = klass.modelName && Object.prototype.hasOwnProperty.call(klass, 'modelName');
      if (!hasOwnModelNameSet) {
        Object.defineProperty(klass, 'modelName', { value: type });
      }
    }

    cache[type] = factory;
  }

  return factory;
}
