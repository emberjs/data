import type { TypedRecordInstance, TypeFromInstance } from '@warp-drive/core-types/record';
import type { AttributeSchema, RelationshipSchema } from '@warp-drive/core-types/schema';

export type KeyOrString<T> = keyof T & string extends never ? string : keyof T & string;

export interface ModelSchema<T = unknown> {
  modelName: T extends TypedRecordInstance ? TypeFromInstance<T> : string;
  fields: Map<KeyOrString<T>, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: Map<KeyOrString<T>, AttributeSchema>;
  relationshipsByName: Map<KeyOrString<T>, RelationshipSchema>;
  eachAttribute<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, attribute: AttributeSchema) => void,
    binding?: T
  ): void;
  eachRelationship<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, relationship: RelationshipSchema) => void,
    binding?: T
  ): void;
  eachTransformedAttribute<K extends KeyOrString<T>>(
    callback: (this: ModelSchema<T>, key: K, type: string | null) => void,
    binding?: T
  ): void;
}
