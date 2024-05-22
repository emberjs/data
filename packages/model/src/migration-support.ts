import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { SchemaService } from '@ember-data/store/types';
import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { ObjectValue } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core-types/schema/concepts';
import type { ArrayField, DerivedField, FieldSchema, GenericField, HashField, ObjectField, ResourceSchema } from '@warp-drive/core-types/schema/fields';
import { Type } from '@warp-drive/core-types/symbols';
import type { WithPartial } from '@warp-drive/core-types/utils';

import { Errors } from './-private';
import type { MinimalLegacyRecord } from './-private/model-methods';
import {
  belongsTo,
  changedAttributes,
  createSnapshot,
  deleteRecord,
  destroyRecord,
  hasMany,
  reload,
  rollbackAttributes,
  save,
  serialize,
  unloadRecord,
} from './-private/model-methods';
import RecordState from './-private/record-state';
import { buildSchema } from './hooks';

type AttributesSchema = ReturnType<Exclude<SchemaService['attributesDefinitionFor'], undefined>>;
type RelationshipsSchema = ReturnType<Exclude<SchemaService['relationshipsDefinitionFor'], undefined>>;

// 'isDestroying', 'isDestroyed'
const LegacyFields = [
  '_createSnapshot',
  'adapterError',
  'belongsTo',
  'changedAttributes',
  'constructor',
  'currentState',
  'deleteRecord',
  'destroyRecord',
  'dirtyType',
  'errors',
  'hasDirtyAttributes',
  'hasMany',
  'isDeleted',
  'isEmpty',
  'isError',
  'isLoaded',
  'isLoading',
  'isNew',
  'isSaving',
  'isValid',
  'reload',
  'rollbackAttributes',
  'save',
  'serialize',
  'unloadRecord',
];

const LegacySupport = getOrSetGlobal('LegacySupport', new WeakMap<MinimalLegacyRecord, Record<string, unknown>>());

function legacySupport(record: MinimalLegacyRecord, options: ObjectValue | null, prop: string): unknown {
  let state = LegacySupport.get(record);
  if (!state) {
    state = {};
    LegacySupport.set(record, state);
  }

  switch (prop) {
    case '_createSnapshot':
      return createSnapshot;
    case 'adapterError':
      return record.currentState.adapterError;
    case 'belongsTo':
      return belongsTo;
    case 'changedAttributes':
      return changedAttributes;
    case 'constructor':
      return (state._constructor = state._constructor || {
        isModel: true,
        name: `Record<${recordIdentifierFor(record).type}>`,
        modelName: recordIdentifierFor(record).type,
      });
    case 'currentState':
      return (state.recordState = state.recordState || new RecordState(record));
    case 'deleteRecord':
      return deleteRecord;
    case 'destroyRecord':
      return destroyRecord;
    case 'dirtyType':
      return record.currentState.dirtyType;
    case 'errors':
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return (state.errors = state.errors || Errors.create({ __record: record }));
    case 'hasDirtyAttributes':
      return record.currentState.isDirty;
    case 'hasMany':
      return hasMany;
    case 'isDeleted':
      return record.currentState.isDeleted;
    case 'isEmpty':
      return record.currentState.isEmpty;
    case 'isError':
      return record.currentState.isError;
    case 'isLoaded':
      return record.currentState.isLoaded;
    case 'isLoading':
      return record.currentState.isLoading;
    case 'isNew':
      return record.currentState.isNew;
    case 'isSaving':
      return record.currentState.isSaving;
    case 'isValid':
      return record.currentState.isValid;
    case 'reload':
      return reload;
    case 'rollbackAttributes':
      return rollbackAttributes;
    case 'save':
      return save;
    case 'serialize':
      return serialize;
    case 'unloadRecord':
      return unloadRecord;
    default:
      assert(`${prop} is not a supported legacy field`, false);
  }
}
legacySupport[Type] = '@legacy';

export function withDefaults(schema: WithPartial<ResourceSchema, 'legacy' | 'identity'>): ResourceSchema {
  schema.legacy = true;
  schema.identity = { kind: '@id', name: 'id' };

  LegacyFields.forEach((field) => {
    schema.fields.push({
      type: '@legacy',
      name: field,
      kind: 'derived',
    });
  });
  schema.fields.push({
    name: 'isReloading',
    kind: '@local',
    type: 'boolean',
    options: { defaultValue: false },
  });
  schema.fields.push({
    name: 'isDestroying',
    kind: '@local',
    type: 'boolean',
    options: { defaultValue: false },
  });
  schema.fields.push({
    name: 'isDestroyed',
    kind: '@local',
    type: 'boolean',
    options: { defaultValue: false },
  });
  return schema as ResourceSchema;
}

export function registerDerivations(schema: SchemaService) {
  schema.registerDerivation(legacySupport);
}

export interface DelegatingSchemaService {
  attributesDefinitionFor?(resource: StableRecordIdentifier | { type: string }): AttributesSchema;
  relationshipsDefinitionFor?(resource: StableRecordIdentifier | { type: string }): RelationshipsSchema;
  doesTypeExist?(type: string): boolean;
}
export class DelegatingSchemaService implements SchemaService {
  _preferred!: SchemaService;
  _secondary!: SchemaService;

  constructor(store: Store, schema: SchemaService) {
    this._preferred = schema;
    this._secondary = buildSchema(store);
  }
  hasResource(resource: StableRecordIdentifier | { type: string }): boolean {
    return this._preferred.hasResource(resource) || this._secondary.hasResource(resource);
  }
  hasTrait(type: string): boolean {
    if (this._preferred.hasResource({ type })) {
      return this._preferred.hasTrait(type);
    }
    return this._secondary.hasTrait(type);
  }
  resourceHasTrait(resource: StableRecordIdentifier | { type: string }, trait: string): boolean {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.resourceHasTrait(resource, trait);
    }
    return this._secondary.resourceHasTrait(resource, trait);
  }
  fields(resource: StableRecordIdentifier | { type: string }): Map<string, FieldSchema> {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.fields(resource);
    }
    return this._secondary.fields(resource);
  }
  transformation(field: GenericField | ObjectField | ArrayField | { type: string }): Transformation {
    return this._preferred.transformation(field);
  }
  hashFn(field: HashField | { type: string }): HashFn {
    return this._preferred.hashFn(field);
  }
  derivation(field: DerivedField | { type: string }): Derivation {
    return this._preferred.derivation(field);
  }
  resource(resource: StableRecordIdentifier | { type: string }): ResourceSchema {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.resource(resource);
    }
    return this._secondary.resource(resource);
  }
  registerResources(schemas: ResourceSchema[]): void {
    this._preferred.registerResources(schemas);
  }
  registerResource(schema: ResourceSchema): void {
    this._preferred.registerResource(schema);
  }
  registerTransformation(transform: Transformation): void {
    this._preferred.registerTransformation(transform);
  }
  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void {
    this._preferred.registerDerivation(derivation);
  }
  registerHashFn(hashFn: HashFn): void {
    this._preferred.registerHashFn(hashFn);
  }
}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  DelegatingSchemaService.prototype.attributesDefinitionFor = function (
    resource: StableRecordIdentifier | { type: string }
  ) {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.attributesDefinitionFor!(resource);
    }

    return this._secondary.attributesDefinitionFor!(resource);
  };
  DelegatingSchemaService.prototype.relationshipsDefinitionFor = function (
    resource: StableRecordIdentifier | { type: string }
  ) {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.relationshipsDefinitionFor!(resource);
    }

    return this._secondary.relationshipsDefinitionFor!(resource);
  };
  DelegatingSchemaService.prototype.doesTypeExist = function (type: string) {
    return this._preferred.doesTypeExist?.(type) || this._secondary.doesTypeExist?.(type) || false;
  };
}
