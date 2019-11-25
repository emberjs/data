import Store from './ds-model-store';
import { RecordIdentifier } from '../ts-interfaces/identifier';
import { get } from '@ember/object';
import { getOwner } from '@ember/application';
import normalizeModelName from './normalize-model-name';
import { RelationshipsSchema, AttributesSchema } from '../ts-interfaces/record-data-schemas';
import require from 'require';
import CoreStore from './core-store';
import { HAS_MODEL_PACKAGE } from '@ember-data/private-build-infra';

type Model = import('@ember-data/model').default;

let _Model;
export function getModel() {
  if (HAS_MODEL_PACKAGE) {
    _Model = _Model || require('@ember-data/model').default;
  }
  return _Model;
}

export class DSModelSchemaDefinitionService {
  private _modelFactoryCache = Object.create(null);
  private _relationshipsDefCache = Object.create(null);
  private _attributesDefCache = Object.create(null);

  constructor(public store: Store) {}

  // Following the existing RD implementation
  attributesDefinitionFor(identifier: RecordIdentifier | string): AttributesSchema {
    let modelName, attributes;
    if (typeof identifier === 'string') {
      modelName = identifier;
    } else {
      modelName = identifier.type;
    }

    attributes = this._attributesDefCache[modelName];

    if (attributes === undefined) {
      let modelClass = this.store.modelFor(modelName);
      let attributeMap = get(modelClass, 'attributes');

      attributes = Object.create(null);
      attributeMap.forEach((meta, name) => (attributes[name] = meta));
      this._attributesDefCache[modelName] = attributes;
    }

    return attributes;
  }

  // Following the existing RD implementation
  relationshipsDefinitionFor(identifier: RecordIdentifier | string): RelationshipsSchema {
    let modelName, relationships;
    if (typeof identifier === 'string') {
      modelName = identifier;
    } else {
      modelName = identifier.type;
    }

    relationships = this._relationshipsDefCache[modelName];

    if (relationships === undefined) {
      let modelClass = this.store.modelFor(modelName);
      relationships = get(modelClass, 'relationshipsObject') || null;
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

/**
 *
 * @param store
 * @param cache modelFactoryCache
 * @param normalizedModelName already normalized modelName
 * @return {*}
 */
export function getModelFactory(store: CoreStore, cache, normalizedModelName: string): Model | null {
  let factory = cache[normalizedModelName];

  if (!factory) {
    let owner = getOwner(store);
    factory = _lookupModelFactory(owner, normalizedModelName);

    if (!factory) {
      //Support looking up mixins as base types for polymorphic relationships
      factory = store._modelForMixin(normalizedModelName);
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

export function _lookupModelFactory(owner, normalizedModelName) {
  return owner.factoryFor(`model:${normalizedModelName}`);
}
