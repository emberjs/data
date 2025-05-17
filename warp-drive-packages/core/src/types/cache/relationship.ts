import type { StableRecordIdentifier } from '../identifier';
import type { Links, Meta, PaginationLinks } from '../spec/json-api-raw';

// we request that it be in the stable form already.
export interface ResourceRelationship<T = StableRecordIdentifier> {
  data?: T | null;
  meta?: Meta;
  links?: Links;
}

// Note: in v1 data could be a ResourceIdentifier, now
// we request that it be in the stable form already.
export interface CollectionRelationship<T = StableRecordIdentifier> {
  data?: T[];
  meta?: Meta;
  links?: PaginationLinks;
}

export type Relationship<T = StableRecordIdentifier> = ResourceRelationship<T> | CollectionRelationship<T>;
