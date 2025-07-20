import type { SchemaService } from '@ember-data/store/types';
import { assert } from '@warp-drive/build-config/macros';
import type { ResourceKey } from '@warp-drive/core-types';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core-types/schema/concepts';
import {
  type ArrayField,
  type DerivedField,
  type FieldSchema,
  type GenericField,
  type HashField,
  isResourceSchema,
  type LegacyAttributeField,
  type LegacyModeFieldSchema,
  type LegacyRelationshipField,
  type ObjectField,
  type ObjectFieldSchema,
  type ObjectSchema,
  type PolarisModeFieldSchema,
  type ResourceSchema,
} from '@warp-drive/core-types/schema/fields';
import { Type } from '@warp-drive/core-types/symbols';

type InternalSchema = {
  original: ResourceSchema | ObjectSchema;
  traits: Set<string>;
  fields: Map<string, FieldSchema>;
  attributes: Record<string, LegacyAttributeField>;
  relationships: Record<string, LegacyRelationshipField>;
};

export class TestSchema implements SchemaService {
  declare _schemas: Map<string, InternalSchema>;
  declare _transforms: Map<string, Transformation>;
  declare _hashFns: Map<string, HashFn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare _derivations: Map<string, Derivation<any, any>>;
  declare _traits: Set<string>;
  declare _assert: Assert | null;

  constructor() {
    this._schemas = new Map();
    this._transforms = new Map();
    this._hashFns = new Map();
    this._derivations = new Map();
    this._assert = null;
  }
  hasTrait(type: string): boolean {
    this._assert?.step('TestSchema:hasTrait');
    return this._traits.has(type);
  }
  resourceTypes(): Readonly<string[]> {
    this._assert?.step('TestSchema:resourceTypes');
    return [...this._schemas.keys()];
  }
  resourceHasTrait(resource: ResourceKey | { type: string }, trait: string): boolean {
    this._assert?.step('TestSchema:resourceHasTrait');
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
    this._assert?.step('TestSchema:resource');
    assert(`No resource registered with name ${resource.type}`, this._schemas.has(resource.type));
    return this._schemas.get(resource.type)!.original;
  }
  registerTransformation<T extends Value = string, PT = unknown>(transformation: Transformation<T, PT>): void {
    this._assert?.step('TestSchema:registerTransformation');
    this._transforms.set(transformation[Type], transformation as Transformation);
  }

  registerDerivation<R, T>(derivation: Derivation<R, T>): void {
    this._assert?.step('TestSchema:registerDerivation');
    this._derivations.set(derivation[Type], derivation);
  }

  registerHashFn<T extends object>(hashFn: HashFn<T>): void {
    this._assert?.step('TestSchema:registerHashFn');
    this._hashFns.set(hashFn[Type], hashFn as HashFn);
  }

  registerResource(schema: ResourceSchema | ObjectSchema): void {
    this._assert?.step('TestSchema:registerResource');
    const fields = new Map<string, FieldSchema>();
    const relationships: Record<string, LegacyRelationshipField> = {};
    const attributes: Record<string, LegacyAttributeField> = {};

    schema.fields.forEach((field: LegacyModeFieldSchema | PolarisModeFieldSchema | ObjectFieldSchema) => {
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

  registerResources(resources: Array<ResourceSchema | ObjectSchema>) {
    this._assert?.step('TestSchema:registerResources');
    resources.forEach((resource) => {
      this.registerResource(resource);
    });
  }

  fields({ type }: { type: string }): InternalSchema['fields'] {
    this._assert?.step('TestSchema:fields');
    const schema = this._schemas.get(type);

    if (!schema) {
      if (this._schemas.size === 0) {
        return new Map();
      }
      throw new Error(`No schema defined for ${type}`);
    }

    return schema.fields;
  }

  hasResource({ type }: { type: string }) {
    this._assert?.step('TestSchema:hasResource');
    return this._schemas.has(type)
      ? true
      : // in tests we intentionally allow "schemaless" resources
        this._schemas.size === 0
        ? true
        : false;
  }
}
