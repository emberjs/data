// An error relating to a Resource
// Received when attempting to persist
// changes to that resource.
//
// considered "opaque" to the Store itself.
//
// Currently we restrict Errors to being
// shaped in JSON:API format; however,
// this is a restriction we will willingly
// recede if desired. So long as the
// presentation layer and the cache and the
// network layer are in agreement about the
// schema of these Errors, then EmberData
// has no reason to enforce this shape.
export interface ValidationError {
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
  };
}
