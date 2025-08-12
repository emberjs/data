import type Store from '@ember-data/store';
import type { ModelSchema } from '@warp-drive/core-types';
import type { Value } from '@warp-drive/core-types/json/raw';
import type {
  TypeFromInstance,
  TypedRecordInstance,
} from '@warp-drive/core-types/record';
import type {
  LegacyAttributeField,
  LegacyRelationshipField,
} from '@warp-drive/core-types/schema/fields';

type KeyOrString<T> = keyof T & string extends never
  ? string
  : keyof T & string;

// if modelFor turns out to be a bottleneck we should replace with a Map
// and clear it during store teardown.
const AvailableShims = new WeakMap<Store, Record<string, ShimModelClass>>();

export function getShimClass<T>(
  store: Store,
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string
): ShimModelClass<T> {
  let shims = AvailableShims.get(store);

  if (!shims) {
    shims = Object.create(null) as Record<string, ShimModelClass>;
    AvailableShims.set(store, shims);
  }

  let shim = shims[modelName];
  if (shim === undefined) {
    shim = shims[modelName] = new ShimModelClass<unknown>(store, modelName);
  }

  return shim;
}

const AttributeKinds = [
  'field',
  'attribute',
  'object',
  'array',
  'schema-object',
  'schema-array',
] as const;

// Mimics the static apis of @ember-data/model
export class ShimModelClass<T = unknown> implements ModelSchema<T> {
  declare __store: Store;
  declare modelName: T extends TypedRecordInstance
    ? TypeFromInstance<T>
    : string;
  constructor(
    store: Store,
    modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string
  ) {
    this.__store = store;
    this.modelName = modelName;
  }

  get fields(): Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'> {
    const fields = new Map<
      KeyOrString<T>,
      'attribute' | 'belongsTo' | 'hasMany'
    >();
    const fieldSchemas = this.__store.schema.fields({ type: this.modelName });

    fieldSchemas.forEach((schema, key) => {
      // @ts-expect-error checking if a string is a valid string
      if (AttributeKinds.includes(schema.kind)) {
        fields.set(key as KeyOrString<T>, 'attribute');
      } else if (schema.kind === 'belongsTo' || schema.kind === 'hasMany') {
        fields.set(key as KeyOrString<T>, schema.kind);
      }
    });

    return fields;
  }

  get attributes(): Map<KeyOrString<T>, LegacyAttributeField> {
    const attrs = new Map<KeyOrString<T>, LegacyAttributeField>();
    const fields = this.__store.schema.fields({ type: this.modelName });

    fields.forEach((schema, key) => {
      if (schema.kind === 'attribute') {
        attrs.set(key as KeyOrString<T>, schema);
        // @ts-expect-error checking if a string is a valid string
      } else if (AttributeKinds.includes(schema.kind)) {
        attrs.set(key as KeyOrString<T>, {
          kind: 'attribute',
          name: key,
          type: null,
          options: (schema.options ?? {}) as Record<string, Value>,
        });
      }
    });

    return attrs;
  }

  get relationshipsByName(): Map<KeyOrString<T>, LegacyRelationshipField> {
    const rels = new Map<KeyOrString<T>, LegacyRelationshipField>();
    const fields = this.__store.schema.fields({ type: this.modelName });

    fields.forEach((schema, key) => {
      if (schema.kind === 'belongsTo' || schema.kind === 'hasMany') {
        rels.set(key as KeyOrString<T>, schema);
      }
    });

    return rels;
  }

  eachAttribute<K extends KeyOrString<T>>(
    callback: (key: K, attribute: LegacyAttributeField) => void,
    binding?: T
  ): void {
    this.attributes.forEach((schema, key) => {
      callback.call(binding, key as K, schema);
    });
  }

  eachRelationship<K extends KeyOrString<T>>(
    callback: (key: K, relationship: LegacyRelationshipField) => void,
    binding?: T
  ): void {
    this.__store.schema
      .fields({ type: this.modelName })
      .forEach((schema, key) => {
        if (schema.kind === 'belongsTo' || schema.kind === 'hasMany') {
          callback.call(binding, key as K, schema);
        }
      });
  }

  eachTransformedAttribute<K extends KeyOrString<T>>(
    callback: (key: K, type: string | null) => void,
    binding?: T
  ): void {
    this.__store.schema
      .fields({ type: this.modelName })
      .forEach((schema, key) => {
        if (schema.kind === 'attribute') {
          const type = schema.type;
          if (type) callback.call(binding, key as K, type);
        }
      });
  }
}

export function modelFor<T extends TypedRecordInstance>(
  this: Store,
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string
): ShimModelClass<T> {
  return getShimClass(this, modelName);
}
