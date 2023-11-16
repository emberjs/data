import { getOwner } from '@ember/application';

import type Store from '@ember-data/store';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';
import type { RecordIdentifier } from '@warp-drive/core-types/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@warp-drive/core-types/schema';

import type { FactoryCache, ModelFactory, ModelStore } from './model';
import type Model from './model';
import _modelForMixin from './model-for-mixin';
import { normalizeModelName } from './util';

export class ModelSchemaProvider {
  declare store: ModelStore;
  declare _relationshipsDefCache: Record<string, RelationshipsSchema>;
  declare _attributesDefCache: Record<string, AttributesSchema>;
  declare _fieldsDefCache: Record<string, Map<string, FieldSchema>>;

  constructor(store: ModelStore) {
    this.store = store;
    this._relationshipsDefCache = Object.create(null) as Record<string, RelationshipsSchema>;
    this._attributesDefCache = Object.create(null) as Record<string, AttributesSchema>;
    this._fieldsDefCache = Object.create(null) as Record<string, Map<string, FieldSchema>>;
  }

  fields(identifier: RecordIdentifier | { type: string }): Map<string, FieldSchema> {
    const { type } = identifier;
    let fieldDefs: Map<string, FieldSchema> | undefined = this._fieldsDefCache[type];

    if (fieldDefs === undefined) {
      fieldDefs = new Map();
      this._fieldsDefCache[type] = fieldDefs;

      const attributes = this.attributesDefinitionFor(identifier);
      const relationships = this.relationshipsDefinitionFor(identifier);

      for (const attr of Object.values(attributes)) {
        fieldDefs.set(attr.name, attr);
      }

      for (const rel of Object.values(relationships)) {
        fieldDefs.set(rel.name, rel);
      }
    }

    return fieldDefs;
  }

  // Following the existing RD implementation
  attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
    const { type } = identifier;
    let attributes: AttributesSchema;

    attributes = this._attributesDefCache[type];

    if (attributes === undefined) {
      const modelClass = this.store.modelFor(type);
      const attributeMap = modelClass.attributes;

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
      const modelClass = this.store.modelFor(type) as typeof Model;
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

    const klass = factory.class;

    if (klass.isModel) {
      const hasOwnModelNameSet = klass.modelName && Object.prototype.hasOwnProperty.call(klass, 'modelName');
      if (!hasOwnModelNameSet) {
        Object.defineProperty(klass, 'modelName', { value: type });
      }
    }

    cache[type] = factory;
  }

  return factory;
}
