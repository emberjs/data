import { getOwner } from '@ember/application';
import { deprecate } from '@ember/debug';

import { importSync } from '@embroider/macros';

import type Model from '@ember-data/model';
import { HAS_MODEL_PACKAGE } from '@ember-data/private-build-infra';
import { DEPRECATE_STRING_ARG_SCHEMAS } from '@ember-data/private-build-infra/deprecations';
import type { RecordIdentifier } from '@ember-data/types/q/identifier';
import type { AttributesSchema, RelationshipsSchema } from '@ember-data/types/q/record-data-schemas';

import type Store from '../store-service';
import normalizeModelName from '../utils/normalize-model-name';

type ModelForMixin = (store: Store, normalizedModelName: string) => Model | null;

let _modelForMixin: ModelForMixin;
if (HAS_MODEL_PACKAGE) {
  let _found;
  _modelForMixin = function () {
    if (!_found) {
      _found = (importSync('@ember-data/model/-private') as typeof import('@ember-data/model/-private'))._modelForMixin;
    }
    return _found(...arguments);
  };
}

export class DSModelSchemaDefinitionService {
  declare store: Store;
  declare _relationshipsDefCache;
  declare _attributesDefCache;

  constructor(store: Store) {
    this.store = store;
    this._relationshipsDefCache = Object.create(null);
    this._attributesDefCache = Object.create(null);
  }

  // Following the existing RD implementation
  attributesDefinitionFor(identifier: RecordIdentifier | { type: string }): AttributesSchema {
    let modelName, attributes;
    if (DEPRECATE_STRING_ARG_SCHEMAS) {
      if (typeof identifier === 'string') {
        deprecate(
          `attributesDefinitionFor expects either a record identifier or an argument of shape { type: string }, received a string.`,
          false,
          {
            id: 'ember-data:deprecate-string-arg-schemas',
            for: 'ember-data',
            until: '5.0',
            since: { enabled: '4.5', available: '4.5' },
          }
        );
        modelName = identifier;
      } else {
        modelName = identifier.type;
      }
    } else {
      modelName = identifier.type;
    }

    attributes = this._attributesDefCache[modelName];

    if (attributes === undefined) {
      let modelClass = this.store.modelFor(modelName);
      let attributeMap = modelClass.attributes;

      attributes = Object.create(null);
      attributeMap.forEach((meta, name) => (attributes[name] = meta));
      this._attributesDefCache[modelName] = attributes;
    }

    return attributes;
  }

  // Following the existing RD implementation
  relationshipsDefinitionFor(identifier: RecordIdentifier | { type: string }): RelationshipsSchema {
    let modelName, relationships;
    if (DEPRECATE_STRING_ARG_SCHEMAS) {
      if (typeof identifier === 'string') {
        deprecate(
          `relationshipsDefinitionFor expects either a record identifier or an argument of shape { type: string }, received a string.`,
          false,
          {
            id: 'ember-data:deprecate-string-arg-schemas',
            for: 'ember-data',
            until: '5.0',
            since: { enabled: '4.5', available: '4.5' },
          }
        );
        modelName = identifier;
      } else {
        modelName = identifier.type;
      }
    } else {
      modelName = identifier.type;
    }

    relationships = this._relationshipsDefCache[modelName];

    if (relationships === undefined) {
      let modelClass = this.store.modelFor(modelName);
      relationships = modelClass.relationshipsObject || null;
      this._relationshipsDefCache[modelName] = relationships;
    }

    return relationships;
  }

  doesTypeExist(modelName: string): boolean {
    let normalizedModelName = normalizeModelName(modelName);
    let factory = getModelFactory(this.store, this.store._modelFactoryCache, normalizedModelName);

    return factory !== null;
  }
}

export function getModelFactory(store: Store, cache, normalizedModelName: string): Model | null {
  let factory = cache[normalizedModelName];

  if (!factory) {
    let owner: any = getOwner(store);
    factory = owner.factoryFor(`model:${normalizedModelName}`);

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
