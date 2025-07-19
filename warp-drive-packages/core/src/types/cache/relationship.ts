import type { ResourceKey } from '../identifier.ts';
import type { Links, Meta, PaginationLinks } from '../spec/json-api-raw.ts';

// we request that it be in the stable form already.
export interface ResourceRelationship<T = ResourceKey> {
  data?: T | null;
  meta?: Meta;
  links?: Links;
}

// Note: in v1 data could be a ResourceIdentifier, now
// we request that it be in the stable form already.
export interface CollectionRelationship<T = ResourceKey> {
  data?: T[];
  meta?: Meta;
  links?: PaginationLinks;
}

export type Relationship<T = ResourceKey> = ResourceRelationship<T> | CollectionRelationship<T>;
