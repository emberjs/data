import { getOwner } from '@ember/application';

import require from 'require';

import { HAS_MODEL_PACKAGE } from '@ember-data/private-build-infra';

import { SchemaDefinitionService } from '../ts-interfaces/schema-definition-service';
import normalizeModelName from './normalize-model-name';

type Dict<T> = import('../ts-interfaces/utils').Dict<T>;
type InternalModel = import('ember-data/-private').InternalModel;
type DSModelSchema = import('../ts-interfaces/ds-model').DSModelSchema;
type RelationshipsSchema = import('../ts-interfaces/record-data-schemas').RelationshipsSchema;
type AttributesSchema = import('../ts-interfaces/record-data-schemas').AttributesSchema;
type RecordIdentifier = import('../ts-interfaces/identifier').RecordIdentifier;
type Store = import('./core-store').default;
type ModelForMixin = (store: Store, normalizedModelName: string) => ModelFactory | null;

let _modelForMixin: ModelForMixin;
if (HAS_MODEL_PACKAGE) {
  let _found: ModelForMixin | undefined;
  _modelForMixin = function (store: Store, normalizedModelName: string): ModelFactory | null {
    if (!_found) {
      _found = require('@ember-data/model/-private')._modelForMixin as ModelForMixin;
    }
    return _found(store, normalizedModelName);
  };
}

export type CreateOptions = {
  store: Store;
  container?: null;
  _internalModel: InternalModel;
  [key: string]: unknown;
};
export type ModelFactory = { class: DSModelSchema; create<T>(createOptions: CreateOptions): T };

export class DSModelSchemaDefinitionService implements SchemaDefinitionService {
  private _modelFactoryCache = Object.create(null);
  private _relationshipsDefCache = Object.create(null);
  private _attributesDefCache = Object.create(null);

  constructor(public store: Store) {}

  // Following the existing RD implementation
  attributesDefinitionFor(identifier: RecordIdentifier | string): AttributesSchema {
    let modelName: string, attributes: AttributesSchema;
    if (typeof identifier === 'string') {
      modelName = identifier;
    } else {
      modelName = identifier.type;
    }

    attributes = this._attributesDefCache[modelName];

    if (attributes === undefined) {
      let schema = this.store.modelFor(modelName);
      let attributeMap = schema.attributes;

      attributes = Object.create(null);
      attributeMap.forEach((meta, name) => (attributes[name] = meta));
      this._attributesDefCache[modelName] = attributes;
    }

    return attributes;
  }

  // Following the existing RD implementation
  relationshipsDefinitionFor(identifier: RecordIdentifier | string): RelationshipsSchema {
    let modelName: string, relationships: RelationshipsSchema;
    if (typeof identifier === 'string') {
      modelName = identifier;
    } else {
      modelName = identifier.type;
    }

    relationships = this._relationshipsDefCache[modelName];

    if (relationships === undefined) {
      let modelClass = this.store.modelFor(modelName) as DSModelSchema;
      relationships = modelClass.relationshipsObject || {};
      this._relationshipsDefCache[modelName] = relationships;
    }

    return relationships;
  }

  doesTypeExist(modelName: string): boolean {
    let normalizedModelName = normalizeModelName(modelName);
    let factory = getModelFactory(this.store, this._modelFactoryCache, normalizedModelName);

    return factory !== null;
  }
}

export function getModelFactory(
  store: Store,
  cache: Dict<ModelFactory>,
  normalizedModelName: string
): ModelFactory | null {
  let factory: ModelFactory | null = cache[normalizedModelName] || null;

  if (!factory) {
    factory = _lookupModelFactory(store, normalizedModelName);

    if (!factory && HAS_MODEL_PACKAGE) {
      //Support looking up mixins as base types for polymorphic relationships
      factory = _modelForMixin(store, normalizedModelName);
    }

    if (!factory) {
      // we don't cache misses in case someone wants to register a missing model
      return null;
    }

    let klass = factory.class;

    if (klass.isModel) {
      let hasOwnModelNameSet = klass.modelName && Object.prototype.hasOwnProperty.call(klass, 'modelName');
      if (!hasOwnModelNameSet) {
        Object.defineProperty(klass, 'modelName', { value: normalizedModelName });
      }
    }

    cache[normalizedModelName] = factory;
  }

  return factory;
}

export function _lookupModelFactory(store: Store, normalizedModelName: string): ModelFactory | null {
  let owner = getOwner(store);

  return owner.factoryFor(`model:${normalizedModelName}`) || null;
}
