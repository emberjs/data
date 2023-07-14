import { getOwner } from '@ember/application';

import type { DSModelSchema, FactoryCache, ModelFactory, ModelStore } from '@ember-data/types/q/ds-model';
import type { RecordIdentifier } from '@ember-data/types/q/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';

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
      let modelClass = this.store.modelFor(type) as DSModelSchema;
      relationships = modelClass.relationshipsObject || null;
      this._relationshipsDefCache[type] = relationships;
    }

    return relationships;
  }

  doesTypeExist(modelName: string): boolean {
    const type = normalizeModelName(modelName);
    const factory = getModelFactory(this.store, this.store._modelFactoryCache, type);

    return factory !== null;
  }
}

export function buildSchema(store: ModelStore) {
  return new ModelSchemaProvider(store);
}

export function getModelFactory(store: ModelStore, cache: FactoryCache, type: string): ModelFactory | null {
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
