import { deprecate, warn } from '@ember/debug';

import { ENFORCE_STRICT_RESOURCE_FINALIZATION } from '@warp-drive/build-config/canary-features';
import { DEBUG } from '@warp-drive/build-config/env';
import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import { recordIdentifierFor } from '../../index.ts';
import { createInternalMemo, type WarpDriveSignal, withSignalStore } from '../../signals/-private.ts';
import type { Store } from '../../store/-private.ts';
import type { SchemaService as SchemaServiceInterface } from '../../types.ts';
import { getOrSetGlobal } from '../../types/-private.ts';
import type { ResourceKey } from '../../types/identifier.ts';
import type { ObjectValue, Value } from '../../types/json/raw.ts';
import type { Derivation, HashFn } from '../../types/schema/concepts.ts';
import {
  type ArrayField,
  type CacheableFieldSchema,
  type CollectionField,
  type DerivedField,
  type FieldSchema,
  type GenericField,
  type HashField,
  type IdentityField,
  isResourceSchema,
  type LegacyAttributeField,
  type LegacyBelongsToField,
  type LegacyHasManyField,
  type LegacyRelationshipField,
  type LegacyResourceSchema,
  type LinksModeBelongsToField,
  type LinksModeHasManyField,
  type ObjectField,
  type ObjectSchema,
  type PolarisResourceSchema,
  type ResourceField,
  type ResourceSchema,
  type SchemaArrayField,
  type SchemaObjectField,
  type Trait,
  isRelationshipKind,
} from '../../types/schema/fields.ts';
import { Type } from '../../types/symbols.ts';
import type { WithPartial } from '../../types/utils.ts';
import { getFieldCacheKeyStrict, isNonIdentityCacheableField } from './fields/get-field-key.ts';
import type { ReactiveResource } from './record.ts';
import { Context } from './symbols.ts';

const Support = getOrSetGlobal('Support', new WeakMap<WeakKey, Record<string, unknown>>());

const ConstructorField = {
  type: '@constructor',
  name: 'constructor',
  kind: 'derived',
} satisfies DerivedField;
const TypeField = {
  type: '@identity',
  name: '$type',
  kind: 'derived',
  options: { key: 'type' },
} satisfies DerivedField;
const IdentifierField = {
  type: '@identity',
  name: '$key',
  kind: 'derived',
  options: { key: '^' },
} satisfies DerivedField;
const DefaultIdentityField = { name: 'id', kind: '@id' } satisfies IdentityField;

function _constructor(record: ReactiveResource) {
  let state = Support.get(record);
  if (!state) {
    state = {};
    Support.set(record, state);
  }

  return (state._constructor = state._constructor || {
    name: `ReactiveResource<${recordIdentifierFor(record).type}>`,
    get modelName() {
      assert(`record.constructor.modelName is not available outside of legacy mode`, false);
      return undefined;
    },
  });
}
_constructor[Type] = '@constructor';

/**
 * Extensions allow providing non-schema driven behaviors to
 * ReactiveResources, ReactiveArrays, and ReactiveObjects.
 *
 * This should only be used for temporary migration purposes
 * to the new schema system when migrating from either Model
 * or ModelFragments.
 *
 * @summary Registers named methods, getters, and values to add to ReactiveResources, ReactiveObjects,
 * or ReactiveArrays; meant only as a temporary aid when migrating from Model or ModelFragments.
 */
export interface CAUTION_MEGA_DANGER_ZONE_Extension {
  /**
   * Whether this extension extends the behaviors of objects
   * (both ReactiveObjects and ReactiveResources) or of arrays.
   */
  kind: 'object' | 'array';
  /**
   * The name of the extension, to be used when specifying
   * either `objectExtensions` or `arrayExtensions` on the
   * field, ResourceSchema or ObjectSchema
   */
  name: string;
  /**
   * An object with iterable keys whose values are the getters
   * or methods to expose on the object or array.
   *
   * or
   *
   * A constructable such as a Function or Class whose prototype
   * will be iterated with getOwnPropertyNames.
   *
   * Examples:
   *
   * **An Object with methods**
   *
   * ```ts
   * store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
   *    kind: 'object',
   *    name: 'do-thing-1',
   *    features: {
   *      doThingOne(this: { street: string }) {
   *        return `do-thing-1:${this.street}`;
   *      },
   *      doThingTwo(this: { street: string }) {
   *        return `do-thing-1:${this.street}`;
   *      },
   *    },
   *  });
   * ```
   *
   * **A class with getters, methods and decorated fields**
   *
   * ```ts
   * class Features {
   *   sayHello() {
   *     return 'hello!';
   *   }
   *
   *   @tracked trackedField = 'initial tracked value';
   *
   *   get realName() {
   *     const self = this as unknown as { name: string };
   *     return self.name;
   *   }
   *   set realName(v: string) {
   *     const self = this as unknown as { name: string };
   *     self.name = v;
   *   }
   *
   *   get greeting() {
   *     const self = this as unknown as { name: string };
   *     return `hello ${self.name}!`;
   *   }
   *
   *   @computed('name')
   *   get salutation() {
   *     const self = this as unknown as { name: string };
   *     return `salutations ${self.name}!`;
   *   }
   *
   *   @cached
   *   get helloThere() {
   *     const self = this as unknown as { name: string };
   *     return `Well Hello There ${self.name}!`;
   *   }
   * }
   *
   * // non-decorated fields dont appear on class prototypes as they are instance only
   * // @ts-expect-error
   * Features.prototype.untrackedField = 'initial untracked value';
   *
   * store.schema.CAUTION_MEGA_DANGER_ZONE_registerExtension({
   *   kind: 'object',
   *   name: 'my-ext',
   *   features: Features,
   * });
   * ```
   *
   */
  // oxlint-disable-next-line typescript/no-unsafe-function-type
  features: Record<string | symbol, unknown> | Function;
}

/**
 * Describes one feature added to a resource by a schema extension, as
 * classified by {@link processExtension} from the property descriptor it
 * was declared with (a method, a plain value, or a getter/setter pair).
 *
 * @summary One normalized feature of a schema extension, tagged by kind as a method, a readonly or
 * mutable value, or a getter/setter accessor.
 */
export type ExtensionDef =
  | {
      /** A callable feature, installed as a method. */
      kind: 'method';
      /** The function to invoke when the feature is called. */
      // oxlint-disable-next-line typescript/no-unsafe-function-type
      fn: Function;
    }
  | {
      /** A plain, non-writable data feature. */
      kind: 'readonly-value';
      /** The value to expose for the feature. */
      value: unknown;
    }
  | {
      /** A plain, writable data feature. */
      kind: 'mutable-value';
      /** The value to expose for the feature. */
      value: unknown;
    }
  | {
      /** An accessor feature with only a getter. */
      kind: 'readonly-field';
      /** Computes the feature's value. */
      get: () => unknown;
    }
  | {
      /** An accessor feature with both a getter and a setter. */
      kind: 'mutable-field';
      /** Computes the feature's value. */
      get: () => unknown;
      /** Assigns the feature's value. */
      set: (value: unknown) => void;
    }
  | {
      /** An accessor feature with only a setter. */
      kind: 'writeonly-field';
      /** Assigns the feature's value. */
      set: (value: unknown) => void;
    };

/**
 * The result of {@link processExtension} normalizing a
 * {@link CAUTION_MEGA_DANGER_ZONE_Extension} into a lookup of its features
 * by name.
 *
 * @summary A registered schema extension normalized into its kind, name, and a map of its features
 * keyed by property name.
 */
export interface ProcessedExtension {
  /** Whether this extension applies to objects/resources or to arrays. */
  kind: 'object' | 'array';
  /** The name the extension was registered under. */
  name: string;
  /** Each feature the extension exposes, keyed by its property name. */
  features: Map<string | symbol, ExtensionDef>;
}

const BannedKeys = ['constructor', '__proto__'];

function processExtension(extension: CAUTION_MEGA_DANGER_ZONE_Extension): ProcessedExtension {
  const { kind, name } = extension;
  const features = new Map<string | symbol, ExtensionDef>();
  const baseFeatures =
    typeof extension.features === 'function'
      ? (extension.features.prototype as Record<string | symbol, unknown>)
      : extension.features;
  for (const key of Object.getOwnPropertyNames(baseFeatures)) {
    if (BannedKeys.includes(key)) continue;

    const decl = Object.getOwnPropertyDescriptor(baseFeatures, key);
    assert(`Expected to find a declaration for ${key} on extension ${name}`, decl);
    if (decl.value) {
      const { value } = decl as { value: unknown };
      features.set(
        key,
        typeof value === 'function'
          ? {
              kind: 'method',
              fn: value,
            }
          : decl.writable
            ? {
                kind: 'mutable-value',
                value,
              }
            : {
                kind: 'readonly-value',
                value,
              }
      );
      continue;
    }

    if (decl.get || decl.set) {
      const { get, set } = decl as { get?: () => unknown; set?: (v: unknown) => void };
      features.set(
        key,
        // prettier-ignore
        get && set ? { kind: 'mutable-field', get, set }
          : get ? { kind: 'readonly-field', get }
          : { kind: 'writeonly-field', set: set! }
      );
      continue;
    }

    assert(`The feature ${key} on extension ${name} is of an unknown variety.`);
  }

  return {
    kind,
    name,
    features,
  };
}
/**
 * A field (or schema) capable of declaring `objectExtensions` and/or
 * `arrayExtensions` to mix registered {@link CAUTION_MEGA_DANGER_ZONE_Extension}
 * features onto it.
 */
export interface ExtensibleField {
  /** The kind of field, only some of which support extensions. */
  kind: 'schema-object' | 'schema-array' | 'array' | 'object' | 'hasMany';
  /** Configures which registered extensions to mix onto this field. */
  options?: {
    /** Names of registered object extensions to mix onto this field. */
    objectExtensions?: string[];
    /** Names of registered array extensions to mix onto this field. */
    arrayExtensions?: string[];
  };
}

function getExt(
  extCache: { object: Map<string | symbol, ProcessedExtension>; array: Map<string | symbol, ProcessedExtension> },
  type: 'array' | 'object',
  extName: string | symbol
): null | ProcessedExtension['features'] {
  const ext = extCache[type].get(extName);
  assert(`expected to have an extension named ${String(extName)} available for ${type}s`, ext);
  return ext?.features ?? null;
}

function hasObjectSchema(
  field: ObjectSchema | ResourceSchema | SchemaArrayField | SchemaObjectField | ExtensibleField
): field is SchemaArrayField | SchemaObjectField {
  return 'kind' in field && (field.kind === 'schema-array' || field.kind === 'schema-object');
}

function pretendIsResourceOrObjectSchema(
  field: ObjectSchema | ResourceSchema | ExtensibleField
): asserts field is ObjectSchema | LegacyResourceSchema {}

function processExtensions(
  schema: SchemaService,
  field: ExtensibleField | ObjectSchema | ResourceSchema,
  scenario: 'resource' | 'object' | 'array',
  resolvedType: string | null
) {
  // if we're looking up extensions for a resource, there is no
  // merging required so if we have no objectExtensions
  // we are done.
  if (scenario === 'resource') {
    pretendIsResourceOrObjectSchema(field);
    if (!('objectExtensions' in field || !field.objectExtensions?.length)) {
      return null;
    }
  }

  const type = scenario === 'resource' ? 'object' : scenario;
  const extCache = schema._extensions;
  const fieldCache = schema._cachedFieldExtensionsByField;

  if (fieldCache[type].has(field)) {
    return fieldCache[type].get(field)!;
  }

  // prettier-ignore
  const extensions =
    (
      scenario === 'resource' ? (field as { objectExtensions?: string[] }).objectExtensions
      : scenario === 'object' ? (field as ExtensibleField).options?.objectExtensions
      : (field as ExtensibleField).options?.arrayExtensions
    ) || null;

  // if we are a resource scenario, we know from the first check we do have extensions
  // if we are an object scenario, we can now return the resource scenario.
  // if we are an array scenario, there is nothing more to process.
  if (!extensions) {
    if (scenario === 'array') return null;

    if (!hasObjectSchema(field)) {
      return null;
    }

    return schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(
      resolvedType ? { type: resolvedType } : (field as { type: string })
    );
  }

  // if we have made it here, we have extensions, lets check if there's
  // a cached version we can use
  const baseExtensions =
    scenario === 'resource' && hasObjectSchema(field)
      ? schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(field as { type: string })
      : scenario === 'object' && hasObjectSchema(field)
        ? schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(
            resolvedType ? { type: resolvedType } : (field as { type: string })
          )
        : null;

  if (!baseExtensions && extensions.length === 1) {
    const value = getExt(extCache, type, extensions[0]);
    fieldCache[type].set(field, value);
    return value;
  }

  const features = new Map<string | symbol, ExtensionDef>(baseExtensions);
  for (const extName of extensions) {
    const value = getExt(extCache, type, extName);
    if (value) {
      for (const [feature, desc] of value) {
        features.set(feature, desc);
      }
    }
  }

  const value = features.size ? features : null;
  fieldCache[type].set(field, value);

  return value;
}

/**
 * Utility for constructing a ResourceSchema with the recommended
 * fields for the PolarisMode experience.
 *
 * The [ResourceSchemas](/guides/the-manual/schemas/resources/) guide shows how to
 * create a schema with it.
 *
 * Using this requires registering the PolarisMode derivations
 *
 * ```ts
 * import { registerDerivations } from '@warp-drive/core/reactive';
 *
 * registerDerivations(schema);
 * ```
 *
 * @summary Adds the default `id` identity plus `$key`, `$type`, and `constructor` derived fields to a
 * PolarisMode resource schema.
 * @public
 * @param schema
 * @return {PolarisResourceSchema}
 */
export function withDefaults(schema: WithPartial<PolarisResourceSchema, 'identity'>): PolarisResourceSchema {
  schema.identity = schema.identity || DefaultIdentityField;

  // because fields gets iterated in definition order,
  // we add TypeField to the beginning so that it will
  // appear right next to the identity field
  schema.fields.unshift(TypeField);
  schema.fields.unshift(IdentifierField);
  schema.fields.push(ConstructorField);
  return schema as PolarisResourceSchema;
}

interface FromIdentityDerivation {
  (record: ReactiveResource, options: { key: 'lid' } | { key: 'type' }, key: string): string;
  (record: ReactiveResource, options: { key: 'id' }, key: string): string | null;
  (record: ReactiveResource, options: { key: '^' }, key: string): ResourceKey;
  (record: ReactiveResource, options: null, key: string): asserts options;
  (
    record: ReactiveResource,
    options: { key: 'id' | 'lid' | 'type' | '^' } | null,
    key: string
  ): ResourceKey | string | null;
  [Type]: '@identity';
}

/**
 * A derivation that computes its value from the
 * record's identity.
 *
 * It can be used via a derived field definition like:
 *
 * ```ts
 * {
 *   kind: 'derived',
 *   name: 'id',
 *   type: '@identity',
 *   options: { key: 'id' }
 * }
 * ```
 *
 * Valid keys are `'id'`, `'lid'`, `'type'`, and `'^'`.
 *
 * `^` returns the entire identifier object.
 *
 * @summary The `@identity` derivation, which reads a record's `id`, `lid`, `type`, or whole resource key
 * for use in derived fields.
 * @public
 */
export const fromIdentity = ((
  record: ReactiveResource,
  options: { key: 'id' | 'lid' | 'type' | '^' } | null,
  key: string
): ResourceKey | string | null => {
  const context = record[Context];
  const identifier = context.resourceKey;
  assert(`Cannot compute @identity for a record without an identifier`, identifier);
  assert(
    `Expected to receive a key to compute @identity, but got ${String(options)}`,
    options?.key && ['lid', 'id', 'type', '^'].includes(options.key)
  );

  return options.key === '^' ? identifier : identifier[options.key];
}) as unknown as FromIdentityDerivation;
fromIdentity[Type] = '@identity';

/**
 * Registers the default derivations for records that want
 * to use the PolarisMode defaults provided by
 *
 * ```ts
 * import { withDefaults } from '@warp-drive/core/reactive';
 * ```
 *
 * The [Derivations](/guides/the-manual/schemas/derivations#about-built-in-derivations)
 * guide explains when you need to call it.
 *
 * @summary Registers the `@identity` and `@constructor` derivations that schemas built with
 * `withDefaults` depend on.
 * @public
 */
export function registerDerivations(schema: SchemaServiceInterface): void {
  schema.registerDerivation(fromIdentity);
  schema.registerDerivation(_constructor);
}

/**
 * A relationship field capable of declaring `options.as`, marking it as a
 * concrete implementation of an abstract polymorphic type.
 */
type AbstractTypeImplementerField =
  | LegacyBelongsToField
  | LegacyHasManyField
  | LinksModeBelongsToField
  | LinksModeHasManyField
  | ResourceField
  | CollectionField;

function isAbstractTypeImplementerField(field: FieldSchema): field is AbstractTypeImplementerField {
  return isRelationshipKind(field.kind);
}

function isLegacyRelationshipField(field: FieldSchema): field is LegacyRelationshipField {
  return field.kind === 'belongsTo' || field.kind === 'hasMany';
}

/**
 * A relationship field contributed to an abstract type's schema, along with
 * the name of the type that contributed it (either a concrete implementer,
 * via `options.as`, or the abstract type's own schema), for use in assertion
 * messages when two contributions disagree on shape.
 */
interface AbstractFieldContribution {
  field: AbstractTypeImplementerField;
  source: string;
}

/**
 * Reduces a field to a plain object with a fixed key order, covering every
 * option any relationship-implementer field can declare, so two fields can
 * be compared for exact equality via `JSON.stringify` regardless of the key
 * order the schema author happened to write them in.
 *
 * `options.as` is included and is *not* special-cased: every contributor to
 * a given field name on an abstract type - including the abstract type's
 * own schema, if it has one - is expected to declare `as` equal to that
 * abstract type's own name. This is redundant/self-referential for the
 * abstract type's own schema, but required for consistency: relationship
 * resolution elsewhere (e.g. `inverse` name-matching) does not itself
 * validate `as`, so a field with a missing or incorrect `as` can otherwise
 * be silently pulled into a relationship it never declared it implements.
 */
function comparableAbstractFieldShape(field: FieldSchema): unknown {
  const { kind, name, type, sourceKey, options } = field as {
    kind: string;
    name: string;
    type?: string;
    sourceKey?: string;
    options?: {
      as?: string;
      async?: boolean;
      inverse?: string | null;
      polymorphic?: boolean;
      linksMode?: boolean;
      resetOnRemoteUpdate?: boolean;
      arrayExtensions?: string[];
    };
  };
  return {
    kind,
    name,
    type,
    sourceKey,
    options: {
      as: options?.as,
      async: options?.async,
      inverse: options?.inverse,
      polymorphic: options?.polymorphic,
      linksMode: options?.linksMode,
      resetOnRemoteUpdate: options?.resetOnRemoteUpdate,
      arrayExtensions: options?.arrayExtensions,
    },
  };
}

/**
 * Asserts that two contributions to the same field name on an abstract
 * polymorphic type - whether from two different concrete implementers, or
 * from an implementer and the abstract type's own schema - declare an
 * identical shape: `kind`, `type`, and every option, including `as` (which
 * every contributor, the abstract type's own schema included, must declare
 * equal to `abstractType`). A mismatch here (e.g. one implementer's field
 * being a `hasMany` while another's is a `belongsTo`, the two disagreeing on
 * `inverse`/`async`/`polymorphic`, or one omitting or misdeclaring `as`)
 * cannot be resolved by picking one side arbitrarily, since that would
 * silently leave whichever side lost the mismatch pointing at a relationship
 * whose true shape differs from what its own schema declared.
 */
function assertConsistentAbstractFieldShape(
  abstractType: string,
  fieldName: string,
  existing: { field: FieldSchema; source: string },
  incoming: { field: FieldSchema; source: string }
): void {
  // This function exists solely to support the `assert()` call below - there
  // is no other work here with an effect in production. Since `assert()`'s
  // own babel-macro stripping only removes the call expression itself, not
  // the (comparatively expensive, involving `JSON.stringify`) computation of
  // its arguments, guard the whole body so none of it survives in production
  // builds, matching how `assertPolymorphicType`/`assertInheritedSchema` and
  // their call sites are gated in `assert-polymorphic-type.ts`.
  if (DEBUG) {
    const existingShape = comparableAbstractFieldShape(existing.field);
    const incomingShape = comparableAbstractFieldShape(incoming.field);
    assert(
      `Expected the relationship '${fieldName}' on the abstract polymorphic type '${abstractType}' to be declared identically everywhere it is implemented (including 'options.as', which every contributor - the abstract type's own schema included - must declare equal to '${abstractType}'), but '${existing.source}' declares it as:\n\n${JSON.stringify(existingShape, null, 2)}\n\nwhile '${incoming.source}' declares it as:\n\n${JSON.stringify(incomingShape, null, 2)}\n\nAll concrete implementers of an abstract type - and the abstract type's own schema, if it has one - must declare an identical shape for any relationship field they share.`,
      JSON.stringify(existingShape) === JSON.stringify(incomingShape)
    );
  }
}

interface InternalSchema {
  original: ResourceSchema | ObjectSchema;
  finalized: boolean;
  traits: Set<string>;
  fields: Map<string, FieldSchema>;
  cacheFields: Map<string, Exclude<CacheableFieldSchema, IdentityField>>;
  attributes: Record<string, LegacyAttributeField>;
  relationships: Record<string, LegacyRelationshipField>;
}

/**
 * Defines how to convert a `GenericField`, `ObjectField`, or `ArrayField`
 * between the raw value `T` stored in the cache and the presentation value
 * `PT` exposed on the record.
 *
 * @summary A registered converter between a field's raw cache value and the value exposed on the
 * record, with optional default.
 */
export type Transformation<T extends Value = Value, PT = unknown> = {
  /** Converts the presentation value into the raw value to store in the cache. */
  serialize(value: PT, options: Record<string, unknown> | null, record: ReactiveResource): T;
  /** Converts the raw cache value into its presentation value. */
  hydrate(value: T | undefined, options: Record<string, unknown> | null, record: ReactiveResource): PT;
  /** Computes the value to use when the cache has no value for the field. */
  defaultValue?(options: Record<string, unknown> | null, identifier: ResourceKey): T;
  /** The name under which this transformation is registered and looked up. */
  [Type]: string;
};

/**
 * Wraps a derivation in a new function with Derivation signature but that looks
 * up the value in the cache before recomputing.
 *
 * @internal
 */
function makeCachedDerivation<R, T, FM extends ObjectValue | null>(
  derivation: Derivation<R, T, FM>
): Derivation<R, T, FM> {
  const memoizedDerivation = (record: R, options: FM, prop: string): T => {
    const signals = withSignalStore(record as object);
    let signal = signals.get(prop);
    if (!signal) {
      signal = createInternalMemo(signals, record as object, prop, () => {
        return derivation(record, options, prop);
      }) as unknown as WarpDriveSignal; // a total lie, for convenience of reusing the storage
    }

    return (signal as unknown as () => T)();
  };
  memoizedDerivation[Type] = derivation[Type];
  return memoizedDerivation;
}

interface KindFns {
  belongsTo: {
    get: (store: Store, record: object, resourceKey: ResourceKey, field: LegacyBelongsToField) => unknown;
    set: (store: Store, record: object, cacheKey: ResourceKey, field: LegacyBelongsToField, value: unknown) => void;
  };
  hasMany: {
    get: (store: Store, record: object, resourceKey: ResourceKey, field: LegacyHasManyField) => unknown;
    set: (store: Store, record: object, cacheKey: ResourceKey, field: LegacyHasManyField, value: unknown) => void;
    notify: (store: Store, record: object, cacheKey: ResourceKey, field: LegacyHasManyField) => boolean;
  };
}

export interface SchemaService {
  doesTypeExist(type: string): boolean;
  attributesDefinitionFor(identifier: { type: string }): InternalSchema['attributes'];
  relationshipsDefinitionFor(identifier: { type: string }): InternalSchema['relationships'];
}

interface InternalTrait {
  name: string;
  mode: 'legacy' | 'polaris';
  fields: Map<string, FieldSchema>;
  traits: string[];
}

/**
 * A SchemaService designed to work with dynamically registered schemas.
 *
 * The [Schemas](/guides/the-manual/schemas/) guide shows how to register schemas
 * with it, and [Advanced Store Configuration](/guides/configuration/advanced#add-a-source-for-schema-for-your-data)
 * shows how to give a store one.
 *
 * @summary The default schema service, which stores resource and object schemas, traits, derivations,
 * transformations, hash functions and extensions registered at runtime.
 * @public
 */
export class SchemaService implements SchemaServiceInterface {
  /** @internal */
  declare _schemas: Map<string, InternalSchema>;
  /** @internal */
  declare _transforms: Map<string, Transformation>;
  /** @internal */
  declare _hashFns: Map<string, HashFn>;
  /** @internal */
  // oxlint-disable-next-line typescript/no-explicit-any
  declare _derivations: Map<string, Derivation<any, any, any>>;
  /** @internal */
  declare _traits: Map<string, InternalTrait>;
  /** @internal */
  declare _modes: Map<string, KindFns>;
  /**
   * Tracks, per abstract type, the relationship fields that concrete
   * implementers have contributed via `options.as`, along with the type
   * that contributed each one (for assertion messages). This is
   * independent of whatever schema (synthesized or user-registered)
   * currently occupies `_schemas` for that type, so that these fields
   * survive regardless of the order in which the abstract type's
   * implementers and its own (optional) concrete schema are registered.
   *
   * @internal
   */
  declare _abstractImplementerFields: Map<string, Map<string, AbstractFieldContribution>>;
  /** @internal */
  declare _extensions: {
    object: Map<string, ProcessedExtension>;
    array: Map<string, ProcessedExtension>;
  };
  /** @internal */
  declare _cachedFieldExtensionsByField: {
    object: Map<object, ProcessedExtension['features'] | null>;
    array: Map<object, ProcessedExtension['features'] | null>;
  };

  constructor() {
    this._schemas = new Map();
    this._transforms = new Map();
    this._hashFns = new Map();
    this._derivations = new Map();
    this._traits = new Map();
    this._modes = new Map();
    this._abstractImplementerFields = new Map();
    this._extensions = {
      object: new Map(),
      array: new Map(),
    };
    this._cachedFieldExtensionsByField = {
      object: new Map(),
      array: new Map(),
    };
  }

  resourceTypes(): Readonly<string[]> {
    return Array.from(this._schemas.keys());
  }

  hasTrait(type: string): boolean {
    return this._traits.has(type);
  }
  resourceHasTrait(resource: ResourceKey | { type: string }, trait: string): boolean {
    return this._schemas.get(resource.type)!.traits.has(trait);
  }
  transformation(field: GenericField | ObjectField | ArrayField | { type: string }): Transformation {
    const kind = 'kind' in field ? field.kind : '<unknown kind>';
    const name = 'name' in field ? field.name : '<unknown name>';
    assert(
      `'${kind}' fields cannot be transformed. Only fields of kind 'field' 'object' or 'array' can specify a transformation. Attempted to find '${field.type ?? '<unknown type>'}' on field '${name}'.`,
      !('kind' in field) || ['field', 'object', 'array'].includes(kind)
    );
    assert(
      `Expected the '${kind}' field '${name}' to specify a transformation via 'field.type', but none was present`,
      field.type
    );
    assert(
      `No transformation registered with name '${field.type}' for '${kind}' field '${name}'`,
      this._transforms.has(field.type)
    );
    return this._transforms.get(field.type)!;
  }
  derivation(field: DerivedField | { type: string }): Derivation {
    const kind = 'kind' in field ? field.kind : '<unknown kind>';
    const name = 'name' in field ? field.name : '<unknown name>';
    assert(
      `The '${kind}' field '${name}' is not derived and so cannot be used to lookup a derivation`,
      !('kind' in field) || kind === 'derived'
    );
    assert(
      `Expected the '${kind}' field '${name}' to specify a derivation via 'field.type', but no value was present`,
      field.type
    );
    assert(
      `No '${field.type}' derivation registered for use by the '${kind}' field '${name}'`,
      this._derivations.has(field.type)
    );
    return this._derivations.get(field.type)!;
  }
  hashFn(field: HashField | { type: string }): HashFn {
    const kind = 'kind' in field ? field.kind : '<unknown kind>';
    const name = 'name' in field ? field.name : '<unknown name>';
    assert(
      `The '${kind}' field '${name}' is not a HashField and so cannot be used to lookup a hash function`,
      !('kind' in field) || kind === '@hash'
    );
    assert(
      `Expected the '${kind}' field '${name}' to specify a hash function via 'field.type', but no value was present`,
      field.type
    );
    assert(
      `No '${field.type}' hash function is registered for use by the '${kind}' field '${name}'`,
      this._hashFns.has(field.type)
    );
    return this._hashFns.get(field.type)!;
  }
  resource(resource: ResourceKey | { type: string }): ResourceSchema | ObjectSchema {
    assert(`No resource registered with name '${resource.type}'`, this._schemas.has(resource.type));
    return this._schemas.get(resource.type)!.original;
  }
  registerResources(schemas: Array<ResourceSchema | ObjectSchema>): void {
    schemas.forEach((schema) => {
      this.registerResource(schema);
    });
  }
  registerResource(schema: ResourceSchema | ObjectSchema): void {
    const fields = new Map<string, FieldSchema>();
    const relationships: Record<string, LegacyRelationshipField> = {};
    const attributes: Record<string, LegacyAttributeField> = {};
    const abstractImplementations: AbstractTypeImplementerField[] = [];

    for (const field of schema.fields) {
      assert(
        `${field.kind} is not valid inside a ResourceSchema's fields.`,
        // @ts-expect-error we are checking for mistakes at runtime
        field.kind !== '@id' && field.kind !== '@hash'
      );
      fields.set(field.name, field);
      if (field.kind === 'attribute') {
        attributes[field.name] = field;
      } else if (isAbstractTypeImplementerField(field)) {
        // the `relationships` map is the legacy (Model-era) view of the schema
        // and only ever contains belongsTo/hasMany fields.
        if (isLegacyRelationshipField(field)) {
          relationships[field.name] = field;
        }
        if (field.options?.as) {
          abstractImplementations.push(field);
        }
      }
    }

    // This type may already be known as an abstract polymorphic type,
    // implemented by other concrete types via `options.as`, from before it
    // ever had a schema of its own (see `_registerAbstractTypeImplementation`).
    // Carry those previously-contributed fields forward so that registering
    // a "real" schema for the type - whenever that happens to occur - never
    // erases the relationships its implementers depend on.
    const implementerFields = this._abstractImplementerFields.get(schema.type);
    if (implementerFields) {
      for (const [name, contribution] of implementerFields) {
        const ownField = fields.get(name);
        if (!ownField) {
          fields.set(name, contribution.field);
          if (isLegacyRelationshipField(contribution.field)) {
            relationships[name] = contribution.field;
          }
        } else if (DEBUG) {
          assertConsistentAbstractFieldShape(schema.type, name, contribution, { field: ownField, source: schema.type });
        }
      }
    }

    const cacheFields = null as unknown as Map<string, Exclude<CacheableFieldSchema, IdentityField>>;
    const traits = new Set<string>(isResourceSchema(schema) ? schema.traits : []);
    const finalized = traits.size === 0;
    const internalSchema: InternalSchema = {
      original: schema,
      finalized,
      fields,
      cacheFields,
      relationships,
      attributes,
      traits,
    };

    if (traits.size === 0) {
      internalSchema.cacheFields = getCacheFields(internalSchema);
    }

    this._schemas.set(schema.type, internalSchema);

    // A relationship field's `as` option marks it as a valid concrete
    // implementer of an abstract polymorphic type (e.g. `as: 'commentable'`).
    // That abstract type may never be given its own schema by the user - it
    // may exist only to be implemented by concrete types like this one - or
    // it may already have (or later receive) a schema of its own, e.g. if it
    // turns out to also be a real, directly-resolvable resource. Either way,
    // ensure it has a schema with this field present, so that it behaves
    // like any other registered resource (`hasResource`, `fields`, etc.)
    // instead of requiring special-casing wherever abstract relationship
    // types are resolved.
    for (const field of abstractImplementations) {
      this._registerAbstractTypeImplementation(field, schema.type);
    }
  }

  /** @internal */
  private _registerAbstractTypeImplementation(field: AbstractTypeImplementerField, implementer: string): void {
    const abstractType = field.options!.as!;

    let implementerFields = this._abstractImplementerFields.get(abstractType);
    if (!implementerFields) {
      implementerFields = new Map();
      this._abstractImplementerFields.set(abstractType, implementerFields);
    }

    // Unlike the original approach this replaced, `as` is *not* stripped here:
    // the field as synthesized onto the abstract type's own schema keeps
    // `options.as === abstractType`, redundant/self-referential as that is.
    // This keeps every contributor - implementers and the abstract type's
    // own schema alike - declaring the same thing, which is what
    // `assertConsistentAbstractFieldShape` checks, and it is also what lets
    // `assertPolymorphicType` (which reads a field's declared `as` off
    // whatever `schema.fields()` serves for its type) correctly permit the
    // abstract type itself to be pushed directly into this relationship.
    const abstractField = { ...field };
    const contribution: AbstractFieldContribution = { field: abstractField, source: implementer };

    // all concrete implementations of an abstract type are required to
    // share the same shape for the field that implements it, so the first
    // one registered is as good a canonical source as any - but a later,
    // differently-shaped one is almost certainly a mistake rather than an
    // intentional override, so we catch it rather than silently ignoring it.
    const existingImplementer = implementerFields.get(field.name);
    if (existingImplementer) {
      if (DEBUG) {
        assertConsistentAbstractFieldShape(abstractType, field.name, existingImplementer, contribution);
      }
      return;
    }
    implementerFields.set(field.name, contribution);

    let abstractSchema = this._schemas.get(abstractType);
    if (!abstractSchema) {
      abstractSchema = {
        original: {
          legacy: true,
          identity: { kind: '@id', name: 'id' },
          type: abstractType,
          fields: [],
        },
        finalized: true,
        fields: new Map(),
        cacheFields: new Map(),
        relationships: {},
        attributes: {},
        traits: new Set(),
      };
      this._schemas.set(abstractType, abstractSchema);
    }

    const existingAbstractField = abstractSchema.fields.get(field.name);
    if (existingAbstractField) {
      if (DEBUG) {
        assertConsistentAbstractFieldShape(
          abstractType,
          field.name,
          { field: existingAbstractField, source: abstractType },
          contribution
        );
      }
      return;
    }

    abstractSchema.fields.set(field.name, abstractField);
    if (isLegacyRelationshipField(abstractField)) {
      abstractSchema.relationships[field.name] = abstractField;
    }

    // If the schema is mid-finalization (traits pending), finalizeResource
    // will recompute cacheFields from the current `fields` map anyway; avoid
    // doing so prematurely from a partially-resolved set of fields.
    if (abstractSchema.finalized) {
      abstractSchema.cacheFields = getCacheFields(abstractSchema);
    }
  }

  /**
   * Registers a {@link Trait} for use by resource schemas.
   *
   * Traits are re-usable collections of fields that can be composed to
   * build up a resource schema. Often they represent polymorphic behaviors
   * a resource should exhibit.
   *
   * When we finalize a resource, we walk its traits and apply their fields
   * to the resource's fields. All specified traits must be registered by
   * this time or an error will be thrown.
   *
   * Traits are applied left-to-right, with traits of traits being applied in the same
   * way. Thus for the most part, application of traits is a post-order graph traversal
   * problem.
   *
   * A trait is only ever processed once. If multiple traits (A, B, C) have the same
   * trait (D) as a dependency, D will be included only once when first encountered by
   * A.
   *
   * If a cycle exists such that trait A has trait B which has Trait A, trait A will
   * be applied *after* trait B in production. In development a cycle error will be thrown.
   *
   * Fields are finalized on a "last wins principle". Thus traits appearing higher in
   * the tree and further to the right of a traits array take precedence, with the
   * resource's fields always being applied last and winning out.
   *
   * @public
   */
  registerTrait(trait: Trait): void {
    const internalTrait = Object.assign({}, trait, { fields: new Map() }) as InternalTrait;
    for (const field of trait.fields) {
      internalTrait.fields.set(field.name, field);
    }
    this._traits.set(trait.name, internalTrait);
  }

  registerTransformation<T extends Value = string, PT = unknown>(transformation: Transformation<T, PT>): void {
    this._transforms.set(transformation[Type], transformation);
  }

  registerDerivation<R, T, FM extends ObjectValue | null>(derivation: Derivation<R, T, FM>): void {
    this._derivations.set(derivation[Type], makeCachedDerivation(derivation));
  }

  CAUTION_MEGA_DANGER_ZONE_registerExtension(extension: CAUTION_MEGA_DANGER_ZONE_Extension): void {
    assert(
      `an extension named ${extension.name} for ${extension.kind} already exists!`,
      !this._extensions[extension.kind].has(extension.name)
    );
    this._extensions[extension.kind].set(extension.name, processExtension(extension));
  }

  CAUTION_MEGA_DANGER_ZONE_resourceExtensions(
    resource: ResourceKey | { type: string }
  ): null | ProcessedExtension['features'] {
    const schema = this.resource(resource);
    return processExtensions(this, schema, 'resource', null);
  }

  CAUTION_MEGA_DANGER_ZONE_objectExtensions(
    field: ExtensibleField,
    resolvedType: string | null
  ): null | ProcessedExtension['features'] {
    return processExtensions(this, field, 'object', resolvedType);
  }

  CAUTION_MEGA_DANGER_ZONE_arrayExtensions(field: ExtensibleField): null | ProcessedExtension['features'] {
    return processExtensions(this, field, 'array', null);
  }

  CAUTION_MEGA_DANGER_ZONE_hasExtension(ext: { kind: 'object' | 'array'; name: string }): boolean {
    return this._extensions[ext.kind].has(ext.name);
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
  _registerMode(mode: string, kinds: KindFns): void {
    assert(`Mode '${mode}' is already registered`, !this._modes.has(mode));
    this._modes.set(mode, kinds);
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
  _kind<T extends keyof KindFns>(mode: string, kind: T): KindFns[T] {
    assert(`Mode '${mode}' is not registered`, this._modes.has(mode));
    const kinds = this._modes.get(mode)!;
    assert(`Kind '${kind}' is not registered for mode '${mode}'`, kinds[kind]);
    return kinds[kind];
  }

  /**
   * Registers a {@link HashFn} for use with a {@link HashField} for
   * either {@link ObjectSchema} identity or polymorphic type calculation.
   *
   * @public
   */
  registerHashFn<T extends object>(hashFn: HashFn<T>): void {
    this._hashFns.set(hashFn[Type], hashFn as HashFn);
  }

  fields({ type }: { type: string }): InternalSchema['fields'] {
    const schema = this._schemas.get(type);
    assert(`No schema defined for ${type}`, schema);

    if (!schema.finalized) {
      finalizeResource(this, schema);
    }

    return schema.fields;
  }

  cacheFields({ type }: { type: string }): InternalSchema['cacheFields'] {
    const schema = this._schemas.get(type);
    assert(`No schema defined for ${type}`, schema);

    if (!schema.finalized) {
      finalizeResource(this, schema);
    }

    return schema.cacheFields;
  }

  hasResource(resource: { type: string }): boolean {
    return this._schemas.has(resource.type);
  }
}

if (ENABLE_LEGACY_SCHEMA_SERVICE) {
  SchemaService.prototype.attributesDefinitionFor = function ({
    type,
  }: {
    type: string;
  }): InternalSchema['attributes'] {
    deprecate(`Use \`schema.fields({ type })\` instead of \`schema.attributesDefinitionFor({ type })\``, false, {
      id: 'ember-data:schema-service-updates',
      until: '6.0',
      for: 'ember-data',
      since: {
        available: '4.13',
        enabled: '5.4',
      },
    });
    const schema = this._schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.attributes;
  };

  SchemaService.prototype.relationshipsDefinitionFor = function ({
    type,
  }: {
    type: string;
  }): InternalSchema['relationships'] {
    deprecate(`Use \`schema.fields({ type })\` instead of \`schema.relationshipsDefinitionFor({ type })\``, false, {
      id: 'ember-data:schema-service-updates',
      until: '6.0',
      for: 'ember-data',
      since: {
        available: '4.13',
        enabled: '5.4',
      },
    });
    const schema = this._schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.relationships;
  };

  SchemaService.prototype.doesTypeExist = function (type: string): boolean {
    deprecate(`Use \`schema.hasResource({ type })\` instead of \`schema.doesTypeExist(type)\``, false, {
      id: 'ember-data:schema-service-updates',
      until: '6.0',
      for: 'ember-data',
      since: {
        available: '4.13',
        enabled: '5.4',
      },
    });
    return this._schemas.has(type);
  };
}

/**
 * When we finalize a resource, we walk its traits and apply their fields
 * to the resource's fields.
 *
 * Traits are applied left-to-right, with traits of traits being applied in the same
 * way. Thus for the most part, application of traits is a post-order graph traversal
 * problem.
 *
 * A trait is only ever processed once. If multiple traits (A, B, C) have the same
 * trait (D) as a dependency, D will be included only once when first encountered by
 * A.
 *
 * If a cycle exists such that trait A has trait B which has Trait A, trait A will
 * be applied *after* trait B in production. In development a cycle error will be thrown.
 *
 * Fields are finalized on a "last wins principle". Thus traits appearing higher in
 * the tree and further to the right of a traits array take precedence, with the
 * resource's fields always being applied last and winning out.
 */
function finalizeResource(schema: SchemaService, resource: InternalSchema): void {
  const fields: Map<string, FieldSchema> = new Map();
  const seen: Set<InternalTrait> = new Set();

  for (const traitName of resource.traits) {
    const trait = schema._traits.get(traitName);
    assert(
      `The trait ${traitName} MUST be supplied before the resource ${resource.original.type} can be finalized for use.`,
      trait
    );

    walkTrait(schema, trait, fields, seen, resource.original.type, DEBUG ? [] : null);
  }

  mergeMap(fields, resource.fields);
  resource.fields = fields;
  resource.cacheFields = getCacheFields(resource);
  resource.finalized = true;
}

function getCacheFields(resource: InternalSchema) {
  const { fields } = resource;
  const cacheFields = new Map<string, Exclude<CacheableFieldSchema, IdentityField>>();
  for (const [key, value] of fields) {
    if (isNonIdentityCacheableField(value)) {
      assert(
        `The sourceKey '${value.sourceKey}' for the field '${key}' on ${resource.original.type} is invalid because it matches the name of an existing field`,
        !value.sourceKey || value.sourceKey === key || !fields.has(value.sourceKey)
      );
      const cacheKey = getFieldCacheKeyStrict(value);
      cacheFields.set(cacheKey, value);
    }
  }
  return cacheFields;
}

function walkTrait(
  schema: SchemaService,
  trait: InternalTrait,
  fields: Map<string, FieldSchema>,
  seen: Set<InternalTrait>,
  type: string,
  debugPath: string[] | null
): void {
  if (seen.has(trait)) {
    // if the trait is in the current path, we throw a cycle error in dev.
    if (DEBUG) {
      if (debugPath!.includes(trait.name)) {
        throw new Error(
          `CycleError: The Trait '${trait.name}' utilized by the Resource '${type}' includes the following circular reference "${debugPath!.join(' > ')} > ${trait.name}"`
        );
      }
    }
    return;
  }
  const ownPath = DEBUG ? [...debugPath!, trait.name] : null;

  // immediately mark as seen to prevent cycles
  // further down the tree from looping back
  seen.add(trait);

  // first apply any child traits
  if (trait.traits?.length) {
    for (const traitName of trait.traits) {
      const subtrait = schema._traits.get(traitName);
      if (ENFORCE_STRICT_RESOURCE_FINALIZATION) {
        assert(
          `The trait ${traitName} used by the trait ${trait.name} MUST be supplied before the resource ${type} can be finalized for use.`,
          subtrait
        );
      } else {
        warn(
          `The trait ${traitName} used by the trait ${trait.name} MUST be supplied before the resource ${type} can be finalized for use.`,
          !!subtrait,
          {
            id: 'warp-drive:missing-trait-schema-for-resource',
          }
        );
      }
      if (!subtrait) continue;
      walkTrait(schema, subtrait, fields, seen, type, ownPath);
    }
  }

  // then apply our own fields
  mergeMap(fields, trait.fields);
}

function mergeMap(base: Map<string, unknown>, toApply: Map<string, unknown>) {
  for (const [key, value] of toApply) {
    base.set(key, value);
  }
}
