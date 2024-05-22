import type { SchemaService } from '@ember-data/store/types';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Value } from '@warp-drive/core-types/json/raw';
import type { Derivation, HashFn, Transformation } from '@warp-drive/core-types/schema/concepts';
import type {
  FieldSchema,
  LegacyAttributeField,
  LegacyRelationshipSchema,
  ResourceSchema,
} from '@warp-drive/core-types/schema/fields';
import { Type } from '@warp-drive/core-types/symbols';

type InternalSchema = {
  original: ResourceSchema;
  traits: Set<string>;
  fields: Map<string, FieldSchema>;
  attributes: Record<string, LegacyAttributeField>;
  relationships: Record<string, LegacyRelationshipSchema>;
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
  resourceHasTrait(resource: StableRecordIdentifier | { type: string }, trait: string): boolean {
    this._assert?.step('TestSchema:resourceHasTrait');
    return this._schemas.get(resource.type)!.traits.has(trait);
  }
  transformation(name: string): Transformation {
    this._assert?.step('TestSchema:transformation');
    assert(`No transformation registered with name ${name}`, this._transforms.has(name));
    return this._transforms.get(name)!;
  }
  derivation(name: string): Derivation {
    this._assert?.step('TestSchema:derivation');
    assert(`No derivation registered with name ${name}`, this._derivations.has(name));
    return this._derivations.get(name)!;
  }
  resource(resource: StableRecordIdentifier | { type: string }): ResourceSchema {
    this._assert?.step('TestSchema:resource');
    assert(`No resource registered with name ${resource.type}`, this._schemas.has(resource.type));
    return this._schemas.get(resource.type)!.original;
  }
  hashFn(name: string): HashFn {
    this._assert?.step('TestSchema:hashFn');
    assert(`No hash function registered with name ${name}`, this._hashFns.has(name));
    return this._hashFns.get(name)!;
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

  registerResource(schema: ResourceSchema): void {
    this._assert?.step('TestSchema:registerResource');
    const fields = new Map<string, FieldSchema>();
    const relationships: Record<string, LegacyRelationshipSchema> = {};
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

    const traits = new Set<string>(schema.traits);
    traits.forEach((trait) => {
      this._traits.add(trait);
    });

    const internalSchema: InternalSchema = { original: schema, fields, relationships, attributes, traits };
    this._schemas.set(schema.type, internalSchema);
  }

  registerResources(resources: ResourceSchema[]) {
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
