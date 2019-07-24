import { BRAND_SYMBOL } from './utils/brand';

/**
  @module @ember-data/store
*/

export interface RelationshipSchema {
  /**
   * @internal
   */
  [BRAND_SYMBOL]: 'RelationshipSchema';
  kind: string;
  type: string;
  key: string;
  options: {
    [key: string]: any;
  };
  name: string;
}

export interface RelationshipsSchema {
  [key: string]: RelationshipSchema;
}

export interface AttributeSchema {
  kind: string;
  name: string;
  options: {
    [key: string]: any;
  };
  type: string;
}

export interface AttributesSchema {
  [key: string]: AttributeSchema;
}
