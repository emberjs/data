import CURRENT_DEPRECATIONS from './current-deprecations';

function deprecationState(deprecationName: keyof typeof CURRENT_DEPRECATIONS): boolean {
  // if we hit this at runtime and the deprecation exists it is always activated
  return deprecationName in CURRENT_DEPRECATIONS;
}

// deprecations
export const DEPRECATE_CATCH_ALL = deprecationState('DEPRECATE_CATCH_ALL');
export const DEPRECATE_3_12 = deprecationState('DEPRECATE_3_12');
export const DEPRECATE_SAVE_PROMISE_ACCESS = deprecationState('DEPRECATE_SAVE_PROMISE_ACCESS');
export const DEPRECATE_RSVP_PROMISE = deprecationState('DEPRECATE_RSVP_PROMISE');
export const DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS = deprecationState('DEPRECATE_SNAPSHOT_MODEL_CLASS_ACCESS');
export const DEPRECATE_STORE_FIND = deprecationState('DEPRECATE_STORE_FIND');
export const DEPRECATE_HAS_RECORD = deprecationState('DEPRECATE_HAS_RECORD');
export const DEPRECATE_RECORD_WAS_INVALID = deprecationState('DEPRECATE_RECORD_WAS_INVALID');
export const DEPRECATE_STRING_ARG_SCHEMAS = deprecationState('DEPRECATE_STRING_ARG_SCHEMAS');
export const DEPRECATE_JSON_API_FALLBACK = deprecationState('DEPRECATE_JSON_API_FALLBACK');
