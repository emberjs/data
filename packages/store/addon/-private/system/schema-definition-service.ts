import { getOwner } from '@ember/application';
import { get } from '@ember/object';

import require from 'require';

import type Model from '@ember-data/model';
import { HAS_MODEL_PACKAGE } from '@ember-data/private-build-infra';

import type { RecordIdentifier } from '../ts-interfaces/identifier';
import type { AttributesSchema, RelationshipsSchema } from '../ts-interfaces/record-data-schemas';
import type Store from './ds-model-store';
import normalizeModelName from './normalize-model-name';

type ModelForMixin = (store: Store, normalizedModelName: string) => Model | null;

let _modelForMixin: ModelForMixin;
if (HAS_MODEL_PACKAGE) {
  let _found;
  _modelForMixin = function () {
    if (!_found) {
      _found = require('@ember-data/model/-private')._modelForMixin;
    }
    return _found(...arguments);
  };
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

export function getModelFactory(store: Store, cache, normalizedModelName: string): Model | null {
  let factory = cache[normalizedModelName];

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

export function _lookupModelFactory(store: Store, normalizedModelName: string): Model | null {
  let owner = getOwner(store);

  return owner.factoryFor(`model:${normalizedModelName}`);
}
