import BelongsToRelationship from 'ember-data/-private/system/relationships/state/belongs-to';
import ManyRelationship from 'ember-data/-private/system/relationships/state/has-many';
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
export interface JsonApiResourceIdentity {
  id?: string | null;
  type: string;
  clientId?: string;
}
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
export type JsonApiRelationship = JsonApiBelongsToRelationship | JsonApiHasManyRelationship;
