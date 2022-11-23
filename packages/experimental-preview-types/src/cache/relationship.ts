// Note: in v1 data could be a ResourceIdentifier, now
import type { Value as JSONValue } from 'json-typescript';

import { Links, PaginationLinks } from '@ember-data/types/q/ember-data-json-api';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';

// we request that it be in the stable form already.
export interface ResourceRelationship {
  data?: StableRecordIdentifier | null;
  meta?: Record<string, JSONValue>;
  links?: Links;
}

// Note: in v1 data could be a ResourceIdentifier, now
// we request that it be in the stable form already.
export interface CollectionRelationship {
  data?: StableRecordIdentifier[];
  meta?: Record<string, JSONValue>;
  links?: PaginationLinks;
}

export type Relationship = ResourceRelationship | CollectionRelationship;
