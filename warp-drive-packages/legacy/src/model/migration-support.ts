/**
 * This module provides support for migrating away from @ember-data/model
 * to @warp-drive/schema-record.
 *
 * It includes:
 *
 * - A `withDefaults` function to assist in creating a schema in LegacyMode
 * - A `registerDerivations` function to register the derivations necessary to support LegacyMode
 * - A `DelegatingSchemaService` that can be used to provide a schema service that works with both
 *   @ember-data/model and @warp-drive/schema-record simultaneously for migration purposes.
 * - A `WithLegacy` type util that can be used to create a type that includes the legacy
 *   properties and methods of a record.
 *
 * Using LegacyMode features on a SchemaRecord *requires* the use of these derivations and schema
 * additions. LegacyMode is not intended to be a long-term solution, but rather a stepping stone
 * to assist in more rapidly adopting modern WarpDrive features.
 *
 * @module
 */
import type { Store } from '@warp-drive/core';
import { recordIdentifierFor } from '@warp-drive/core';
import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';
import { ARRAY_SIGNAL, notifyInternalSignal } from '@warp-drive/core/store/-private';
import type { SchemaService } from '@warp-drive/core/types';
import { getOrSetGlobal } from '@warp-drive/core/types/-private';
import type { ChangedAttributesHash } from '@warp-drive/core/types/cache';
import type { StableRecordIdentifier } from '@warp-drive/core/types/identifier';
import type { ObjectValue } from '@warp-drive/core/types/json/raw';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core/types/schema/concepts';
import type {
  ArrayField,
  DerivedField,
  FieldSchema,
  GenericField,
  HashField,
  LegacyBelongsToField,
  LegacyHasManyField,
  LegacyResourceSchema,
  ObjectField,
  ObjectSchema,
  ResourceSchema,
} from '@warp-drive/core/types/schema/fields';
import { Type } from '@warp-drive/core/types/symbols';
import type { WithPartial } from '@warp-drive/core/types/utils';

import type { Snapshot } from '../compat/-private.ts';
import { Errors, lookupLegacySupport } from './-private.ts';
import type { MinimalLegacyRecord } from './-private/model-methods.ts';
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
} from './-private/model-methods.ts';
import RecordState from './-private/record-state.ts';
import type BelongsToReference from './-private/references/belongs-to.ts';
import type HasManyReference from './-private/references/has-many.ts';
import { buildSchema } from './-private/schema-provider.ts';
import type { _MaybeBelongsToFields, MaybeHasManyFields } from './-private/type-utils.ts';

export type WithLegacyDerivations<T extends TypedRecordInstance> = T &
  MinimalLegacyRecord & {
    belongsTo: typeof belongsTo;
    hasMany: typeof hasMany;
  };

type AttributesSchema = ReturnType<Exclude<SchemaService['attributesDefinitionFor'], undefined>>;
type RelationshipsSchema = ReturnType<Exclude<SchemaService['relationshipsDefinitionFor'], undefined>>;

interface LegacyModeRecord<T extends TypedRecordInstance> {
  id: string | null;

  serialize(options?: Record<string, unknown>): unknown;
  destroyRecord(options?: Record<string, unknown>): Promise<this>;
  unloadRecord(): void;
  changedAttributes(): ChangedAttributesHash;
  rollbackAttributes(): void;
  _createSnapshot(): Snapshot<T>;
  save(options?: Record<string, unknown>): Promise<this>;
  reload(options?: Record<string, unknown>): Promise<T>;
  belongsTo<K extends _MaybeBelongsToFields<T>>(prop: K): BelongsToReference<T, K>;
  hasMany<K extends MaybeHasManyFields<T>>(prop: K): HasManyReference<T, K>;
  deleteRecord(): void;

  adapterError: unknown;
  constructor: { modelName: TypeFromInstance<T> };
  currentState: RecordState;
  dirtyType: 'deleted' | 'created' | 'updated' | '';
  errors: unknown;
  hasDirtyAttributes: boolean;
  isDeleted: boolean;
  isEmpty: boolean;
  isError: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  isDestroying: boolean;
  isDestroyed: boolean;
  isNew: boolean;
  isSaving: boolean;
  isValid: boolean;
}

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
] as const;

/**
 * A Type utility that enables quickly adding type information for the fields
 * defined by `import { withDefaults } from '@ember-data/model/migration-support'`.
 *
 * Example:
 *
 * ```ts
 * import { withDefaults, WithLegacy } from '@ember-data/model/migration-support';
 * import { Type } from '@warp-drive/core-types/symbols';
 * import type { HasMany } from '@ember-data/model';
 *
 * export const UserSchema = withDefaults({
 *   type: 'user',
 *   fields: [
 *     { name: 'firstName', kind: 'attribute' },
 *     { name: 'lastName', kind: 'attribute' },
 *     { name: 'age', kind: 'attribute' },
 *     { name: 'friends',
 *       kind: 'hasMany',
 *       type: 'user',
 *       options: { inverse: 'friends', async: false }
 *     },
 *     { name: 'bestFriend',
 *       kind: 'belongsTo',
 *       type: 'user',
 *       options: { inverse: null, async: false }
 *     },
 *   ],
 * });
 *
 * export type User = WithLegacy<{
 *   firstName: string;
 *   lastName: string;
 *   age: number;
 *   friends: HasMany<User>;
 *   bestFriend: User | null;
 *   [Type]: 'user';
 * }>
 * ```
 *
 */
export type WithLegacy<T extends TypedRecordInstance> = T & LegacyModeRecord<T>;

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

/**
 * A function which adds the necessary fields to a schema and marks it as
 * being in LegacyMode. This is used to support the legacy features of
 * @ember-data/model while migrating to WarpDrive.
 *
 * Example:
 *
 * ```ts
 * import { withDefaults, WithLegacy } from '@ember-data/model/migration-support';
 * import { Type } from '@warp-drive/core-types/symbols';
 * import type { HasMany } from '@ember-data/model';
 *
 * export const UserSchema = withDefaults({
 *   type: 'user',
 *   fields: [
 *     { name: 'firstName', kind: 'attribute' },
 *     { name: 'lastName', kind: 'attribute' },
 *     { name: 'age', kind: 'attribute' },
 *     { name: 'friends',
 *       kind: 'hasMany',
 *       type: 'user',
 *       options: { inverse: 'friends', async: false }
 *     },
 *     { name: 'bestFriend',
 *       kind: 'belongsTo',
 *       type: 'user',
 *       options: { inverse: null, async: false }
 *     },
 *   ],
 * });
 *
 * export type User = WithLegacy<{
 *   firstName: string;
 *   lastName: string;
 *   age: number;
 *   friends: HasMany<User>;
 *   bestFriend: User | null;
 *   [Type]: 'user';
 * }>
 * ```
 *
 * Using this function require registering the derivations
 * it requires with the schema service.
 *
 * ```ts
 * import { registerDerivations } from '@ember-data/model/migration-support';
 *
 * registerDerivations(schema);
 * ```
 *
 * @param {LegacyResourceSchema} schema The schema to add legacy support to.
 * @return {LegacyResourceSchema} The schema with legacy support added.
 * @public
 */
export function withDefaults(schema: WithPartial<LegacyResourceSchema, 'legacy' | 'identity'>): LegacyResourceSchema {
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
  return schema as LegacyResourceSchema;
}

/**
 * A function which registers the necessary derivations to support
 * the LegacyMode features of @ember-data/model while migrating to WarpDrive.
 *
 * This must be called in order to use the fields added by:
 *
 * ```ts
 * import { withDefaults } from '@ember-data/model/migration-support';
 * ```
 *
 * @param {SchemaService} schema The schema service to register the derivations with.
 * @return {void}
 * @public
 */
export function registerDerivations(schema: SchemaService) {
  schema.registerDerivation(legacySupport);
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  schema._registerMode('@legacy', {
    belongsTo: {
      get(store: Store, record: object, cacheKey: StableRecordIdentifier, field: LegacyBelongsToField) {
        return lookupLegacySupport(record as unknown as MinimalLegacyRecord).getBelongsTo(field.name);
      },
      set(store: Store, record: object, cacheKey: StableRecordIdentifier, field: LegacyBelongsToField, value: unknown) {
        store._join(() => {
          lookupLegacySupport(record as unknown as MinimalLegacyRecord).setDirtyBelongsTo(field.name, value);
        });
      },
    },
    hasMany: {
      get(store: Store, record: object, cacheKey: StableRecordIdentifier, field: LegacyHasManyField) {
        return lookupLegacySupport(record as unknown as MinimalLegacyRecord).getHasMany(field.name);
      },
      set(store: Store, record: object, cacheKey: StableRecordIdentifier, field: LegacyHasManyField, value: unknown[]) {
        store._join(() => {
          const support = lookupLegacySupport(record as unknown as MinimalLegacyRecord);
          const manyArray = support.getManyArray(field.name);

          manyArray.splice(0, manyArray.length, ...value);
        });
      },
      notify(store: Store, record: object, cacheKey: StableRecordIdentifier, field: LegacyHasManyField): boolean {
        const support = lookupLegacySupport(record as unknown as MinimalLegacyRecord);
        const manyArray = support && support._manyArrayCache[field.name];
        const hasPromise = support && (support._relationshipPromisesCache[field.name] as Promise<unknown> | undefined);

        if (manyArray && hasPromise) {
          // do nothing, we will notify the ManyArray directly
          // once the fetch has completed.
          return false;
        }

        if (manyArray) {
          notifyInternalSignal(manyArray[ARRAY_SIGNAL]);

          return true;
        }

        return false;
      },
    },
  });
}

/**
 * A class which provides a schema service that delegates between
 * a primary schema service and one that supports legacy model
 * classes as its schema source.
 *
 * When the primary schema service has a schema for the given
 * resource, it will be used. Otherwise, the fallback schema
 * service will be used.
 *
 * This can be used when incrementally migrating from Models to
 * SchemaRecords by enabling unmigrated Models to continue to
 * provide their own schema information to the application.
 *
 * ```ts
 * import { DelegatingSchemaService } from '@ember-data/model/migration-support';
 * import { SchemaService } from '@warp-drive/schema-record';
 *
 * class AppStore extends Store {
 *   createSchemaService() {
 *     const schema = new SchemaService();
 *     return new DelegatingSchemaService(this, schema);
 *   }
 * }
 * ```
 *
 * All calls to register resources, derivations, transformations, hash functions
 * etc. will be delegated to the primary schema service.
 *
 * @class DelegatingSchemaService
 * @public
 */
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

  isDelegated(resource: StableRecordIdentifier | { type: string }): boolean {
    return !this._preferred.hasResource(resource) && this._secondary.hasResource(resource);
  }

  resourceTypes(): Readonly<string[]> {
    return Array.from(new Set(this._preferred.resourceTypes().concat(this._secondary.resourceTypes())));
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
  resource(resource: StableRecordIdentifier | { type: string }): ResourceSchema | ObjectSchema {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.resource(resource);
    }
    return this._secondary.resource(resource);
  }
  registerResources(schemas: Array<ResourceSchema | ObjectSchema>): void {
    this._preferred.registerResources(schemas);
  }
  registerResource(schema: ResourceSchema | ObjectSchema): void {
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

  /**
   * This is an internal method used to register behaviors for legacy mode.
   * It is not intended for public use.
   *
   * We do think a generalized `kind` registration system would be useful,
   * but we have not yet designed it.
   *
   * See https://github.com/emberjs/data/issues/9534
   *
   * @internal
   */
  _registerMode(mode: string, kinds: unknown): void {
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this._preferred._registerMode(mode, kinds);
  }

  /**
   * This is an internal method used to enable legacy behaviors for legacy mode.
   * It is not intended for public use.
   *
   * We do think a generalized `kind` registration system would be useful,
   * but we have not yet designed it.
   *
   * See https://github.com/emberjs/data/issues/9534
   *
   * @internal
   */
  _kind(mode: string, kind: 'belongsTo' | 'hasMany'): () => unknown {
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this._preferred._kind(mode, kind) as () => unknown;
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
