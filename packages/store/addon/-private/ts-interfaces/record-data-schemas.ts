import { BRAND_SYMBOL } from './utils/brand';

/**
  @module @ember-data/store
*/

export interface RelationshipSchema {
  /**
   * @internal
   */
  [BRAND_SYMBOL]: 'RelationshipSchema';
  kind: 'belongsTo' | 'hasMany';
  type: string;
  key: string;
  options: {
    [key: string]: any;
  };
  name: string;
  inverse?: string | null;
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
