/**
  @module @ember-data/store
*/

export interface RelationshipSchema {
  /**
   * @internal
   */
  kind: 'belongsTo' | 'hasMany';
  type: string; // related type
  key: string; // deprecated version of name
  options: {
    async?: boolean;
    polymorphic?: boolean;
    [key: string]: any;
  };
  name: string; // property key for this relationship
  inverse?: string | null; // property key on the related type (if any)
}

export interface RelationshipsSchema {
  [key: string]: RelationshipSchema | undefined;
}

export interface AttributeSchema {
  kind: 'attribute';
  name: string;
  options: {
    [key: string]: any;
  };
  type: string;
}

export interface AttributesSchema {
  [key: string]: AttributeSchema | undefined;
}
