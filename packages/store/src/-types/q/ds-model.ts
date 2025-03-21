import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core-types/record';
import type { LegacyAttributeField, LegacyRelationshipField } from '@warp-drive/core-types/schema/fields';

export type KeyOrString<T> = keyof T & string extends never ? string : keyof T & string;

/**
 * Minimum subset of static schema methods and properties on the
 * "model" class.
 *
 * Only used when using the legacy schema-service implementation
 * for @ember-data/model or when wrapping schema for legacy
 * Adapters/Serializers.
 *
 * @typedoc
 */
export interface ModelSchema<T = unknown> {
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;
  fields: Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: Map<KeyOrString<T>, LegacyAttributeField>;
  relationshipsByName: Map<KeyOrString<T>, LegacyRelationshipField>;
  eachAttribute<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, attribute: LegacyAttributeField) => void,
    binding?: T
  ): void;
  eachRelationship<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, relationship: LegacyRelationshipField) => void,
    binding?: T
  ): void;
  eachTransformedAttribute<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, type: string | null) => void,
    binding?: T
  ): void;
}
