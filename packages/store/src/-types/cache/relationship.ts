import { Links, Meta, PaginationLinks } from '../q/ember-data-json-api';
import { StableRecordIdentifier } from '../q/identifier';

// we request that it be in the stable form already.
export interface ResourceRelationship {
  data?: StableRecordIdentifier | null;
  meta?: Meta;
  links?: Links;
}

// Note: in v1 data could be a ResourceIdentifier, now
// we request that it be in the stable form already.
export interface CollectionRelationship {
  data?: StableRecordIdentifier[];
  meta?: Meta;
  links?: PaginationLinks;
}

export type Relationship = ResourceRelationship | CollectionRelationship;
