import { deprecate } from '@ember/debug';

import { ENABLE_LEGACY_SCHEMA_SERVICE } from '@warp-drive/core/build-config/deprecations';
import { assert } from '@warp-drive/core/build-config/macros';

import { recordIdentifierFor } from '../../index.ts';
import type { Store, WarpDriveSignal } from '../../store/-private.ts';
import { createMemo, withSignalStore } from '../../store/-private.ts';
import type { SchemaService as SchemaServiceInterface } from '../../types.ts';
import { getOrSetGlobal } from '../../types/-private.ts';
import type { StableRecordIdentifier } from '../../types/identifier.ts';
import type { ObjectValue, Value } from '../../types/json/raw.ts';
import type { Derivation, HashFn } from '../../types/schema/concepts.ts';
import {
  type ArrayField,
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
  type ObjectField,
  type ObjectSchema,
  type PolarisResourceSchema,
  type ResourceSchema,
  type SchemaArrayField,
  type SchemaObjectField,
} from '../../types/schema/fields.ts';
import { Type } from '../../types/symbols.ts';
import type { WithPartial } from '../../types/utils.ts';
import type { ReactiveResource } from './record.ts';
import { Identifier } from './symbols.ts';

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
const DefaultIdentityField = { name: 'id', kind: '@id' } satisfies IdentityField;

function _constructor(record: ReactiveResource) {
  let state = Support.get(record as WeakKey);
  if (!state) {
    state = {};
    Support.set(record as WeakKey, state);
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
 * reactive resources and arrays.
 */
export interface CAUTION_MEGA_DANGER_ZONE_Extension {
  /**
   * Whether this extension extends the behaviors of objects
   * or of arrays.
   */
  kind: 'object' | 'array';
  /**
   * The name of the extension, to be used when specifying
   * either `objectExtensions` or `arrayExtensions`
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
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  features: Record<string | symbol, unknown> | Function;
}

export type ExtensionDef =
  | {
      kind: 'method';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      fn: Function;
    }
  | {
      kind: 'readonly-value';
      value: unknown;
    }
  | {
      kind: 'mutable-value';
      value: unknown;
    }
  | {
      kind: 'readonly-field';
      get: () => unknown;
    }
  | {
      kind: 'mutable-field';
      get: () => unknown;
      set: (value: unknown) => void;
    }
  | {
      kind: 'writeonly-field';
      set: (value: unknown) => void;
    };

export interface ProcessedExtension {
  kind: 'object' | 'array';
  name: string;
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
export interface ExtensibleField {
  kind: 'schema-object' | 'schema-array' | 'array' | 'object' | 'hasMany';
  options?: {
    objectExtensions?: string[];
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
  scenario: 'resource' | 'object' | 'array'
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

    return schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(field);
  }

  // if we have made it here, we have extensions, lets check if there's
  // a cached version we can use
  const baseExtensions =
    scenario === 'resource' && hasObjectSchema(field)
      ? schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(field)
      : scenario === 'object' && hasObjectSchema(field)
        ? schema.CAUTION_MEGA_DANGER_ZONE_resourceExtensions(field)
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
 * Using this requires registering the PolarisMode derivations
 *
 * ```ts
 * import { registerDerivations } from '@warp-drive/schema-record';
 *
 * registerDerivations(schema);
 * ```
 *
 * @public
 * @param schema
 * @return {PolarisResourceSchema}
 */
export function withDefaults(schema: WithPartial<PolarisResourceSchema, 'identity'>): ResourceSchema {
  schema.identity = schema.identity || DefaultIdentityField;

  // because fields gets iterated in definition order,
  // we add TypeField to the beginning so that it will
  // appear right next to the identity field
  schema.fields.unshift(TypeField);
  schema.fields.push(ConstructorField);
  return schema as PolarisResourceSchema;
}

interface FromIdentityDerivation {
  (record: ReactiveResource, options: { key: 'lid' } | { key: 'type' }, key: string): string;
  (record: ReactiveResource, options: { key: 'id' }, key: string): string | null;
  (record: ReactiveResource, options: { key: '^' }, key: string): StableRecordIdentifier;
  (record: ReactiveResource, options: null, key: string): asserts options;
  (
    record: ReactiveResource,
    options: { key: 'id' | 'lid' | 'type' | '^' } | null,
    key: string
  ): StableRecordIdentifier | string | null;
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
 * @public
 */
export const fromIdentity = ((
  record: ReactiveResource,
  options: { key: 'id' | 'lid' | 'type' | '^' } | null,
  key: string
): StableRecordIdentifier | string | null => {
  const identifier = record[Identifier];
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
 * import { withDefaults } from '@warp-drive/schema-record';
 * ```
 *
 * @public
 * @param {SchemaService} schema
 */
export function registerDerivations(schema: SchemaServiceInterface): void {
  schema.registerDerivation(fromIdentity);
  schema.registerDerivation(_constructor);
}

interface InternalSchema {
  original: ResourceSchema | ObjectSchema;
  traits: Set<string>;
  fields: Map<string, FieldSchema>;
  attributes: Record<string, LegacyAttributeField>;
  relationships: Record<string, LegacyRelationshipField>;
}

export type Transformation<T extends Value = Value, PT = unknown> = {
  serialize(value: PT, options: Record<string, unknown> | null, record: ReactiveResource): T;
  hydrate(value: T | undefined, options: Record<string, unknown> | null, record: ReactiveResource): PT;
  defaultValue?(options: Record<string, unknown> | null, identifier: StableRecordIdentifier): T;
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
      signal = createMemo(record as object, prop, () => {
        return derivation(record, options, prop);
      }) as unknown as WarpDriveSignal; // a total lie, for convenience of reusing the storage
      signals.set(prop, signal);
    }

    return (signal as unknown as () => T)();
  };
  memoizedDerivation[Type] = derivation[Type];
  return memoizedDerivation;
}

interface KindFns {
  belongsTo: {
    get: (store: Store, record: object, resourceKey: StableRecordIdentifier, field: LegacyBelongsToField) => unknown;
    set: (
      store: Store,
      record: object,
      cacheKey: StableRecordIdentifier,
      field: LegacyBelongsToField,
      value: unknown
    ) => void;
  };
  hasMany: {
    get: (store: Store, record: object, resourceKey: StableRecordIdentifier, field: LegacyHasManyField) => unknown;
    set: (
      store: Store,
      record: object,
      cacheKey: StableRecordIdentifier,
      field: LegacyHasManyField,
      value: unknown
    ) => void;
    notify: (store: Store, record: object, cacheKey: StableRecordIdentifier, field: LegacyHasManyField) => boolean;
  };
}

export interface SchemaService {
  doesTypeExist(type: string): boolean;
  attributesDefinitionFor(identifier: { type: string }): InternalSchema['attributes'];
  relationshipsDefinitionFor(identifier: { type: string }): InternalSchema['relationships'];
}

/**
 * A SchemaService designed to work with dynamically registered schemas.
 *
 * @class SchemaService
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare _derivations: Map<string, Derivation<any, any, any>>;
  /** @internal */
  declare _traits: Set<string>;
  /** @internal */
  declare _modes: Map<string, KindFns>;
  /** @internal */
  declare _extensions: {
    object: Map<string, ProcessedExtension>;
    array: Map<string, ProcessedExtension>;
  };
  declare _cachedFieldExtensionsByField: {
    object: Map<object, ProcessedExtension['features'] | null>;
    array: Map<object, ProcessedExtension['features'] | null>;
  };

  constructor() {
    this._schemas = new Map();
    this._transforms = new Map();
    this._hashFns = new Map();
    this._derivations = new Map();
    this._traits = new Set();
    this._modes = new Map();
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
  resourceHasTrait(resource: StableRecordIdentifier | { type: string }, trait: string): boolean {
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
  resource(resource: StableRecordIdentifier | { type: string }): ResourceSchema | ObjectSchema {
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

    schema.fields.forEach((field) => {
      assert(
        `${field.kind} is not valid inside a ResourceSchema's fields.`,
        // @ts-expect-error we are checking for mistakes at runtime
        field.kind !== '@id' && field.kind !== '@hash'
      );
      fields.set(field.name, field);
      if (field.kind === 'attribute') {
        attributes[field.name] = field;
      } else if (field.kind === 'belongsTo' || field.kind === 'hasMany') {
        relationships[field.name] = field;
      }
    });

    const traits = new Set<string>(isResourceSchema(schema) ? schema.traits : []);
    traits.forEach((trait) => {
      this._traits.add(trait);
    });

    const internalSchema: InternalSchema = { original: schema, fields, relationships, attributes, traits };
    this._schemas.set(schema.type, internalSchema);
  }

  registerTransformation<T extends Value = string, PT = unknown>(transformation: Transformation<T, PT>): void {
    this._transforms.set(transformation[Type], transformation as Transformation);
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
    resource: StableRecordIdentifier | { type: string }
  ): null | ProcessedExtension['features'] {
    const schema = this.resource(resource);
    return processExtensions(this, schema, 'resource');
  }

  CAUTION_MEGA_DANGER_ZONE_objectExtensions(field: ExtensibleField): null | ProcessedExtension['features'] {
    return processExtensions(this, field, 'object');
  }

  CAUTION_MEGA_DANGER_ZONE_arrayExtensions(field: ExtensibleField): null | ProcessedExtension['features'] {
    return processExtensions(this, field, 'array');
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
   * See https://github.com/emberjs/data/issues/9534
   *
   * @internal
   */
  _kind<T extends keyof KindFns>(mode: string, kind: T): KindFns[T] {
    assert(`Mode '${mode}' is not registered`, this._modes.has(mode));
    const kinds = this._modes.get(mode)!;
    assert(`Kind '${kind}' is not registered for mode '${mode}'`, kinds[kind]);
    return kinds[kind];
  }

  registerHashFn<T extends object>(hashFn: HashFn<T>): void {
    this._hashFns.set(hashFn[Type], hashFn as HashFn);
  }

  fields({ type }: { type: string }): InternalSchema['fields'] {
    const schema = this._schemas.get(type);

    if (!schema) {
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.fields;
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
