import { getOwner } from '@ember/application';
import { deprecate } from '@ember/debug';

import type Store from '@ember-data/store';
import type { SchemaService } from '@ember-data/store/types';
import {
  DEPRECATE_STRING_ARG_SCHEMAS,
  DISABLE_6X_DEPRECATIONS,
  ENABLE_LEGACY_SCHEMA_SERVICE,
} from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/build-config/macros';
import type { RecordIdentifier, StableRecordIdentifier } from '@warp-drive/core-types/identifier';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core-types/schema/concepts';
import type {
  ArrayField,
  DerivedField,
  GenericField,
  HashField,
  LegacyAttributeField,
  LegacyFieldSchema,
  LegacyRelationshipSchema,
  ObjectField,
  ResourceSchema,
} from '@warp-drive/core-types/schema/fields';

import type { FactoryCache, Model, ModelFactory, ModelStore } from './model';
import _modelForMixin from './model-for-mixin';
import { normalizeModelName } from './util';

type AttributesSchema = ReturnType<Exclude<SchemaService['attributesDefinitionFor'], undefined>>;
type RelationshipsSchema = ReturnType<Exclude<SchemaService['relationshipsDefinitionFor'], undefined>>;

type InternalSchema = {
  schema: ResourceSchema;
  fields: Map<string, LegacyAttributeField | LegacyRelationshipSchema>;
  attributes: Record<string, LegacyAttributeField>;
  relationships: Record<string, LegacyRelationshipSchema>;
};

export interface ModelSchemaProvider {
  attributesDefinitionFor(resource: RecordIdentifier | { type: string }): AttributesSchema;

  relationshipsDefinitionFor(resource: RecordIdentifier | { type: string }): RelationshipsSchema;

  doesTypeExist(type: string): boolean;
}
export class ModelSchemaProvider implements SchemaService {
  declare store: ModelStore;
  declare _schemas: Map<string, InternalSchema>;
  declare _typeMisses: Set<string>;

  constructor(store: ModelStore) {
    this.store = store;
    this._schemas = new Map();
    this._typeMisses = new Set();
  }

  hasTrait(type: string): boolean {
    assert(`hasTrait is not available with @ember-data/model's SchemaService`);
    return false;
  }
  resourceHasTrait(resource: StableRecordIdentifier | { type: string }, trait: string): boolean {
    assert(`resourceHasTrait is not available with @ember-data/model's SchemaService`);
    return false;
  }
  transformation(field: GenericField | ObjectField | ArrayField | { type: string }): Transformation {
    assert(`transformation is not available with @ember-data/model's SchemaService`);
  }
  derivation(field: DerivedField | { type: string }): Derivation {
    assert(`derivation is not available with @ember-data/model's SchemaService`);
  }
  hashFn(field: HashField | { type: string }): HashFn {
    assert(`hashFn is not available with @ember-data/model's SchemaService`);
  }
  resource(resource: StableRecordIdentifier | { type: string }): ResourceSchema {
    const type = normalizeModelName(resource.type);

    if (!this._schemas.has(type)) {
      this._loadModelSchema(type);
    }

    return this._schemas.get(type)!.schema;
  }
  registerResources(schemas: ResourceSchema[]): void {
    assert(`registerResources is not available with @ember-data/model's SchemaService`);
  }
  registerResource(schema: ResourceSchema): void {
    assert(`registerResource is not available with @ember-data/model's SchemaService`);
  }
  registerTransformation(transform: Transformation): void {
    assert(`registerTransformation is not available with @ember-data/model's SchemaService`);
  }
  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void {
    assert(`registerDerivation is not available with @ember-data/model's SchemaService`);
  }
  registerHashFn(hashFn: HashFn): void {
    assert(`registerHashFn is not available with @ember-data/model's SchemaService`);
  }
  _loadModelSchema(type: string) {
    const modelClass = this.store.modelFor(type) as typeof Model;
    const attributeMap = modelClass.attributes;

    const attributes = Object.create(null) as AttributesSchema;
    attributeMap.forEach((meta, name) => (attributes[name] = meta));
    const relationships = modelClass.relationshipsObject || null;
    const fields = new Map<string, LegacyAttributeField | LegacyRelationshipSchema>();

    for (const attr of Object.values(attributes)) {
      fields.set(attr.name, attr);
    }

    for (const rel of Object.values(relationships)) {
      fields.set(rel.name, rel);
    }

    const schema: ResourceSchema = {
      legacy: true,
      identity: { name: 'id', kind: '@id' },
      type,
      fields: Array.from(fields.values()),
    };

    const internalSchema: InternalSchema = {
      schema,
      attributes,
      relationships,
      fields,
    };

    this._schemas.set(type, internalSchema);

    return internalSchema;
  }

  fields(resource: RecordIdentifier | { type: string }): Map<string, LegacyFieldSchema> {
    const type = normalizeModelName(resource.type);

    if (!this._schemas.has(type)) {
      this._loadModelSchema(type);
    }

    return this._schemas.get(type)!.fields;
  }

  hasResource(resource: { type: string }): boolean {
    const type = normalizeModelName(resource.type);

    if (this._schemas.has(type)) {
      return true;
    }

    if (this._typeMisses.has(type)) {
      return false;
    }

    const factory = getModelFactory(this.store, type);
    const exists = factory !== null;

    if (!exists) {
      this._typeMisses.add(type);
      return false;
    }

    return true;
  }
}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  ModelSchemaProvider.prototype.doesTypeExist = function (type: string): boolean {
    deprecate(
      `Use \`schema.hasResource({ type })\` instead of \`schema.doesTypeExist(type)\``,
      /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
      {
        id: 'ember-data:schema-service-updates',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '4.13',
          enabled: '5.4',
        },
      }
    );
    return this.hasResource({ type });
  };

  ModelSchemaProvider.prototype.attributesDefinitionFor = function (
    resource: RecordIdentifier | { type: string }
  ): AttributesSchema {
    let rawType: string;
    if (DEPRECATE_STRING_ARG_SCHEMAS) {
      if (typeof resource === 'string') {
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
        rawType = resource;
      } else {
        rawType = resource.type;
      }
    } else {
      rawType = resource.type;
    }

    deprecate(
      `Use \`schema.fields({ type })\` instead of \`schema.attributesDefinitionFor({ type })\``,
      /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
      {
        id: 'ember-data:schema-service-updates',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '4.13',
          enabled: '5.4',
        },
      }
    );
    const type = normalizeModelName(rawType);

    if (!this._schemas.has(type)) {
      this._loadModelSchema(type);
    }

    return this._schemas.get(type)!.attributes;
  };

  ModelSchemaProvider.prototype.relationshipsDefinitionFor = function (
    resource: RecordIdentifier | { type: string }
  ): RelationshipsSchema {
    let rawType: string;
    if (DEPRECATE_STRING_ARG_SCHEMAS) {
      if (typeof resource === 'string') {
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
        rawType = resource;
      } else {
        rawType = resource.type;
      }
    } else {
      rawType = resource.type;
    }

    deprecate(
      `Use \`schema.fields({ type })\` instead of \`schema.relationshipsDefinitionFor({ type })\``,
      /* inline-macro-config */ DISABLE_6X_DEPRECATIONS,
      {
        id: 'ember-data:schema-service-updates',
        until: '6.0',
        for: 'ember-data',
        since: {
          available: '4.13',
          enabled: '5.4',
        },
      }
    );
    const type = normalizeModelName(rawType);

    if (!this._schemas.has(type)) {
      this._loadModelSchema(type);
    }

    return this._schemas.get(type)!.relationships;
  };
}

export function buildSchema(store: Store): SchemaService {
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
