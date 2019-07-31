import BelongsToRelationship from '../system/relationships/state/belongs-to';
import ManyRelationship from '../system/relationships/state/has-many';

/**
  @module @ember-data/store
*/

export interface AttributesHash {
  attributes?: {
    [key: string]: any;
  };
}
export interface JsonApiResource {
  id?: string | null;
  type?: string;
  attributes?: AttributesHash;
  relationships?: {
    [key: string]: JsonApiRelationship;
  };
  meta?: any;
}

export interface ExistingResourceIdentifierObject {
  type: string;
  id: string;
  clientId?: string | null;
}

export interface NewResourceIdentifierObject {
  type: string;
  id: string | null;
  clientId: string;
}

export type JsonApiResourceIdentity = ExistingResourceIdentifierObject | NewResourceIdentifierObject;

export interface JsonApiBelongsToRelationship {
  data?: JsonApiResourceIdentity;
  meta?: any;
  links?: {
    [key: string]: string;
  };
  // Private
  _relationship?: BelongsToRelationship;
}
export interface JsonApiHasManyRelationship {
  data?: JsonApiResourceIdentity[];
  meta?: any;
  links?: {
    [key: string]: string;
  };
  // Private
  _relationship?: ManyRelationship;
}

export interface JsonApiValidationError {
  title: string;
  detail: string;
  source: {
    pointer: string;
  };
}

export type JsonApiRelationship = JsonApiBelongsToRelationship | JsonApiHasManyRelationship;
