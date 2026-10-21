/**
 * This module provides support for migrating away from @warp-drive/legacy/model
 * to ReactiveResource from @warp-drive/core/reactive.
 *
 * It includes:
 *
 * - A `withDefaults` function to assist in creating a schema in LegacyMode
 * - A `registerDerivations` function to register the derivations necessary to support LegacyMode
 * - A `DelegatingSchemaService` that can be used to provide a schema service that works with both
 *   @warp-drive/legacy/model and @warp-drive/core/reactive simultaneously for migration purposes.
 * - A `WithLegacy` type util that can be used to create a type that includes the legacy
 *   properties and methods of a record.
 *
 * Using LegacyMode features on a ReactiveResource *requires* the use of these derivations and schema
 * additions. LegacyMode is not intended to be a long-term solution, but rather a stepping stone
 * to assist in more rapidly adopting modern WarpDrive features.
 *
 * @summary Legacy helpers for migrating from `Model` to `ReactiveResource`: LegacyMode schema defaults, derivations,
 * types, and a schema service that serves both at once.
 * @module
 */
import { deprecate } from '@ember/debug';

import type { Store } from '@warp-drive/core';
import { recordIdentifierFor } from '@warp-drive/core';
import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';
import type { CAUTION_MEGA_DANGER_ZONE_Extension, ProcessedExtension } from '@warp-drive/core/reactive';
import type { ExtensibleField } from '@warp-drive/core/reactive/-private';
import { Context } from '@warp-drive/core/reactive/-private';
import { notifyInternalSignal } from '@warp-drive/core/signals/-leaked';
import type { PrivateReactiveResourceArray } from '@warp-drive/core/store/-private';
import { assertPrivateStore } from '@warp-drive/core/store/-private';
import type { SchemaService } from '@warp-drive/core/types';
import { getOrSetGlobal } from '@warp-drive/core/types/-private';
import type { ChangedAttributesHash } from '@warp-drive/core/types/cache';
import type { ResourceKey } from '@warp-drive/core/types/identifier';
import type { ObjectValue } from '@warp-drive/core/types/json/raw';
import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core/types/record';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core/types/schema/concepts';
import type {
  ArrayField,
  CacheableFieldSchema,
  DerivedField,
  FieldSchema,
  GenericField,
  HashField,
  IdentityField,
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
  _destroyRecord,
  _reload,
  _save,
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

/**
 * Adds the `Model`-style `belongsTo`/`hasMany` reference methods to a
 * {@link TypedRecordInstance}, for use when migrating a resource from
 * `Model` to a schema-based record while preserving these APIs.
 *
 * @summary Legacy type that adds the `Model`-style `belongsTo` and `hasMany` reference methods to a typed record
 * migrating from `Model` to a schema-based record.
 */
export type WithLegacyDerivations<T extends TypedRecordInstance> = T &
  MinimalLegacyRecord & {
    /**
     * see {@link belongsTo}
     */
    belongsTo: typeof belongsTo;
    /**
     * see {@link hasMany}
     */
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
 * defined by `import { withDefaults } from '@warp-drive/legacy/model/migration-support'`.
 *
 * Example:
 *
 * ```ts
 * import { withDefaults, WithLegacy } from '@warp-drive/legacy/model/migration-support';
 * import { Type } from '@warp-drive/core/types/symbols';
 * import type { HasMany } from '@@warp-drive/legacy/model';
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
 * @summary Legacy type that adds the `Model`-style state flags and methods (`save`, `isNew`, `errors`, etc.) that
 * `withDefaults` provides to a LegacyMode record type.
 */
export type WithLegacy<T extends TypedRecordInstance> = T & LegacyModeRecord<T>;

const LegacySupport = getOrSetGlobal('LegacySupport', new WeakMap<MinimalLegacyRecord, Record<string, unknown>>());

function legacySupport(record: MinimalLegacyRecord, options: ObjectValue | null, prop: string): unknown {
  let state = LegacySupport.get(record);
  if (!state) {
    state = {};
    LegacySupport.set(record, state);
  }
  const suppressDeprecation = Boolean(options && options.suppressDeprecation);

  switch (prop) {
    case '_createSnapshot':
      // FIXME should be deprecated too?
      return createSnapshot;
    case 'adapterError':
      // FIXME should be deprecated too?
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
      return suppressDeprecation ? _destroyRecord : destroyRecord;
    case 'dirtyType':
      return record.currentState.dirtyType;
    case 'errors':
      // FIXME should be deprecated too?
      // @ts-expect-error
      // oxlint-disable-next-line typescript/no-unsafe-call
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
      return suppressDeprecation ? _reload : reload;
    case 'rollbackAttributes':
      return rollbackAttributes;
    case 'save':
      return suppressDeprecation ? _save : save;
    case 'serialize':
      // FIXME should be deprecated too? (is somewhat deprecated via store.serializeRecord)
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
 * @warp-drive/legacy/model while migrating to WarpDrive.
 *
 * Example:
 *
 * ```ts
 * import { withDefaults, WithLegacy } from '@warp-drive/legacy/model/migration-support';
 * import { Type } from '@warp-drive/core/types/symbols';
 * import type { HasMany } from '@warp-drive/legacy/model';
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
 * import { registerDerivations } from '@warp-drive/legacy/model/migration-support';
 *
 * registerDerivations(schema);
 * ```
 *
 * @summary Legacy helper that marks a resource schema as LegacyMode and adds the fields that give its records
 * `Model`-like state and methods.
 * @param schema The schema to add legacy support to.
 * @return The schema with legacy support added.
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
    name: '_isReloading',
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
  schema.objectExtensions = schema.objectExtensions || [];
  schema.objectExtensions.push('deprecated-model-behaviors');
  return schema as LegacyResourceSchema;
}

/**
 * Adds the necessasary fields to the schema for supporting
 * the deprecated request methods on LegacyMode schemas.
 *
 * Use this instead of `withDefaults` to add the fields
 * and behaviors necessary to support Model-Like capabilities.
 *
 * ```ts
 * import { withRestoredDeprecatedModelRequestBehaviors } from '@warp-drive/legacy/model/migration-support';
 *
 * export const UserSchema = withRestoredDeprecatedModelRequestBehaviors({
 *   type: 'user',
 *   fields: [
 *     { name: 'firstName', kind: 'attribute' },
 *     { name: 'lastName', kind: 'attribute' },
 *   ]
 * });
 * ```
 *
 * @summary Legacy alternative to `withDefaults` that makes a LegacyMode schema whose `save`, `reload`, and
 * `destroyRecord` run without deprecation warnings.
 */
export function withRestoredDeprecatedModelRequestBehaviors(
  schema: WithPartial<LegacyResourceSchema, 'legacy' | 'identity'>
): LegacyResourceSchema {
  schema.legacy = true;
  schema.identity = { kind: '@id', name: 'id' };

  LegacyFields.forEach((field) => {
    schema.fields.push({
      type: '@legacy',
      name: field,
      kind: 'derived',
      options: { suppressDeprecation: true },
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
 * the LegacyMode features of @warp-drive/legacy/model while migrating to WarpDrive.
 *
 * This must be called in order to use the fields added by {@link withDefaults} or
 * {@link withRestoredDeprecatedModelRequestBehaviors}.
 *
 * @summary Legacy setup that registers the derivation, relationship behaviors, and extension a schema service needs to
 * support LegacyMode records.
 * @param schema The schema service to register the derivations with.
 * @public
 */
export function registerDerivations(schema: SchemaService): void {
  schema.registerDerivation(legacySupport);
  // @ts-expect-error
  // oxlint-disable-next-line typescript/no-unsafe-call
  schema._registerMode('@legacy', {
    belongsTo: {
      get(store: Store, record: object, cacheKey: ResourceKey, field: LegacyBelongsToField) {
        // FIXME field.name here should likely be field.sourceKey || field.name
        return lookupLegacySupport(record as unknown as MinimalLegacyRecord).getBelongsTo(field.name);
      },
      set(store: Store, record: object, cacheKey: ResourceKey, field: LegacyBelongsToField, value: unknown) {
        assertPrivateStore(store);
        store._join(() => {
          // FIXME field.name here should likely be field.sourceKey || field.name
          lookupLegacySupport(record as unknown as MinimalLegacyRecord).setDirtyBelongsTo(field.name, value);
        });
      },
    },
    hasMany: {
      get(store: Store, record: object, cacheKey: ResourceKey, field: LegacyHasManyField) {
        // FIXME field.name here should likely be field.sourceKey || field.name
        return lookupLegacySupport(record as unknown as MinimalLegacyRecord).getHasMany(field.name);
      },
      set(store: Store, record: object, cacheKey: ResourceKey, field: LegacyHasManyField, value: unknown[]) {
        assertPrivateStore(store);
        store._join(() => {
          const support = lookupLegacySupport(record as unknown as MinimalLegacyRecord);
          // FIXME field.name here should likely be field.sourceKey || field.name
          const manyArray = support.getManyArray(field.name);

          manyArray.splice(0, manyArray.length, ...value);
        });
      },
      notify(store: Store, record: object, cacheKey: ResourceKey, field: LegacyHasManyField): boolean {
        const support = lookupLegacySupport(record as unknown as MinimalLegacyRecord);
        // LegacySupport caches relationships by `sourceKey ?? name`
        const key = field.sourceKey ?? field.name;
        const manyArray = support && support._manyArrayCache[key];
        const hasPromise = support && (support._relationshipPromisesCache[key] as Promise<unknown> | undefined);

        if (manyArray && hasPromise) {
          // do nothing, we will notify the ManyArray directly
          // once the fetch has completed.
          return false;
        }

        if (manyArray) {
          notifyInternalSignal((manyArray as unknown as PrivateReactiveResourceArray)[Context].signal);

          return true;
        }

        return false;
      },
    },
  });

  schema.CAUTION_MEGA_DANGER_ZONE_registerExtension!({
    name: 'deprecated-model-behaviors',
    kind: 'object',
    features: {
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      get isReloading() {
        deprecate(
          `record.isReloading is deprecated, please use store.request and either <Request> or getRequuestState to keep track of the request state instead.`,
          false,
          {
            id: 'warp-drive:deprecate-legacy-request-methods',
            until: '6.0',
            for: '@warp-drive/core',
            url: 'https://warp-drive.io/api/@warp-drive/core/build-config/deprecations/variables/ENABLE_LEGACY_REQUEST_METHODS',
            since: {
              enabled: '5.7',
              available: '5.7',
            },
          }
        );
        // @ts-expect-error
        // oxlint-disable-next-line typescript/no-unsafe-return
        return this._isReloading;
      },
      // oxlint-disable-next-line typescript/no-unsafe-assignment
      set isReloading(v) {
        // @ts-expect-error
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        this._isReloading = v;
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
 * ReactiveResources by enabling unmigrated Models to continue to
 * provide their own schema information to the application.
 *
 * ```ts
 * import { DelegatingSchemaService } from '@warp-drive/legacy/model/migration-support';
 * import { SchemaService } from '@warp-drive/core/reactive';
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
 * @summary Legacy schema service that serves a resource's schema from the primary service when it has one, and
 * otherwise from its `Model` class, for incremental migration.
 * @class DelegatingSchemaService
 * @public
 */
export interface DelegatingSchemaService {
  /**
   * Delegates to whichever of the primary/fallback schema services has a
   * schema for the resource, preferring the primary. See {@link DelegatingSchemaService.isDelegated | isDelegated}.
   */
  attributesDefinitionFor?(resource: ResourceKey | { type: string }): AttributesSchema;
  /**
   * Delegates to whichever of the primary/fallback schema services has a
   * schema for the resource, preferring the primary. See {@link DelegatingSchemaService.isDelegated | isDelegated}.
   */
  relationshipsDefinitionFor?(resource: ResourceKey | { type: string }): RelationshipsSchema;
  /**
   * Whether either the primary or fallback schema service has a schema
   * for the given type.
   */
  doesTypeExist?(type: string): boolean;
}
/**
 * See the {@link DelegatingSchemaService | class documentation above} for usage.
 * @summary Legacy schema service that serves a resource's schema from the primary service when it has one, and
 * otherwise from its `Model` class, for incremental migration.
 */
export class DelegatingSchemaService implements SchemaService {
  /** @internal */
  _preferred!: SchemaService;
  /** @internal */
  _secondary!: SchemaService;

  constructor(store: Store, schema: SchemaService) {
    this._preferred = schema;
    this._secondary = buildSchema(store);
  }

  /**
   * Whether the given resource's schema is being served by the fallback
   * (legacy Model-derived) schema service rather than the primary one.
   */
  isDelegated(resource: ResourceKey | { type: string }): boolean {
    return !this._preferred.hasResource(resource) && this._secondary.hasResource(resource);
  }

  resourceTypes(): Readonly<string[]> {
    return Array.from(new Set(this._preferred.resourceTypes().concat(this._secondary.resourceTypes())));
  }

  hasResource(resource: ResourceKey | { type: string }): boolean {
    return this._preferred.hasResource(resource) || this._secondary.hasResource(resource);
  }
  hasTrait(type: string): boolean {
    if (this._preferred.hasResource({ type })) {
      return this._preferred.hasTrait(type);
    }
    return this._secondary.hasTrait(type);
  }
  resourceHasTrait(resource: ResourceKey | { type: string }, trait: string): boolean {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.resourceHasTrait(resource, trait);
    }
    return this._secondary.resourceHasTrait(resource, trait);
  }
  fields(resource: ResourceKey | { type: string }): Map<string, FieldSchema> {
    if (this._preferred.hasResource(resource)) {
      return this._preferred.fields(resource);
    }
    return this._secondary.fields(resource);
  }
  cacheFields?(resource: { type: string }): Map<string, Exclude<CacheableFieldSchema, IdentityField>> {
    if (this._preferred.hasResource?.(resource)) {
      // @ts-expect-error
      return this._preferred.cacheFields?.(resource);
    }

    // @ts-expect-error
    return this._secondary.cacheFields?.(resource);
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
  resource(resource: ResourceKey | { type: string }): ResourceSchema | ObjectSchema {
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

  CAUTION_MEGA_DANGER_ZONE_hasExtension(ext: { kind: 'object' | 'array'; name: string }): boolean {
    return this._preferred.CAUTION_MEGA_DANGER_ZONE_hasExtension!(ext);
  }

  CAUTION_MEGA_DANGER_ZONE_registerExtension(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void {
    this._preferred.CAUTION_MEGA_DANGER_ZONE_registerExtension!(extension);
  }

  CAUTION_MEGA_DANGER_ZONE_resourceExtensions(
    resource: ResourceKey | { type: string }
  ): null | ProcessedExtension['features'] {
    return this._preferred.CAUTION_MEGA_DANGER_ZONE_resourceExtensions!(resource);
  }

  CAUTION_MEGA_DANGER_ZONE_objectExtensions(
    field: ExtensibleField,
    resolvedType: string | null
  ): null | ProcessedExtension['features'] {
    return this._preferred.CAUTION_MEGA_DANGER_ZONE_objectExtensions!(field, resolvedType);
  }

  CAUTION_MEGA_DANGER_ZONE_arrayExtensions(field: ExtensibleField): null | ProcessedExtension['features'] {
    return this._preferred.CAUTION_MEGA_DANGER_ZONE_arrayExtensions!(field);
  }

  /**
   * This is an internal method used to register behaviors for legacy mode.
   * It is not intended for public use.
   *
   * We do think a generalized `kind` registration system would be useful,
   * but we have not yet designed it.
   *
   * See https://github.com/warp-drive-data/warp-drive/issues/9534
   *
   * @internal
   */
  _registerMode(mode: string, kinds: unknown): void {
    // @ts-expect-error
    // oxlint-disable-next-line typescript/no-unsafe-call
    this._preferred._registerMode(mode, kinds);
  }

  /**
   * This is an internal method used to enable legacy behaviors for legacy mode.
   * It is not intended for public use.
   *
   * We do think a generalized `kind` registration system would be useful,
   * but we have not yet designed it.
   *
   * See https://github.com/warp-drive-data/warp-drive/issues/9534
   *
   * @internal
   */
  _kind(mode: string, kind: 'belongsTo' | 'hasMany'): () => unknown {
    // @ts-expect-error
    // oxlint-disable-next-line typescript/no-unsafe-call
    return this._preferred._kind(mode, kind) as () => unknown;
  }
}

/**
 * @internal
 */
export interface PrivateDelegatingSchemaService extends DelegatingSchemaService {
  _preferred: SchemaService;
  _secondary: SchemaService;
}
function assertPrivate(service: DelegatingSchemaService): asserts service is PrivateDelegatingSchemaService {}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  DelegatingSchemaService.prototype.attributesDefinitionFor = function (resource: ResourceKey | { type: string }) {
    assertPrivate(this);
    if (this._preferred.hasResource(resource)) {
      return this._preferred.attributesDefinitionFor!(resource);
    }

    return this._secondary.attributesDefinitionFor!(resource);
  };
  DelegatingSchemaService.prototype.relationshipsDefinitionFor = function (resource: ResourceKey | { type: string }) {
    assertPrivate(this);
    if (this._preferred.hasResource(resource)) {
      return this._preferred.relationshipsDefinitionFor!(resource);
    }

    return this._secondary.relationshipsDefinitionFor!(resource);
  };
  DelegatingSchemaService.prototype.doesTypeExist = function (type: string) {
    assertPrivate(this);
    return this._preferred.doesTypeExist?.(type) || this._secondary.doesTypeExist?.(type) || false;
  };
}
