import { AttributeSchema, RelationshipSchema } from './record-data-schemas';

type GenericRecord = Record<string, unknown>;
export interface ModelSchema<T extends object = GenericRecord> {
  modelName: string;
  fields: Map<keyof T & string, 'attribute' | 'belongsTo' | 'hasMany'>;
  attributes: Map<keyof T & string, AttributeSchema>;
  relationshipsByName: Map<keyof T & string, RelationshipSchema>;
  eachAttribute<K extends keyof T & string>(
    callback: (this: ModelSchema<T>, key: K, attribute: AttributeSchema) => void,
    binding?: T
  ): void;
  eachRelationship<K extends keyof T & string>(
    callback: (this: ModelSchema<T>, key: K, relationship: RelationshipSchema) => void,
    binding?: T
  ): void;
  eachTransformedAttribute<K extends keyof T & string>(
    callback: (this: ModelSchema<T>, key: K, type: string | null) => void,
    binding?: T
  ): void;
}
