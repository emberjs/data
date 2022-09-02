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
export const DEPRECATE_STRING_ARG_SCHEMAS = deprecationState('DEPRECATE_STRING_ARG_SCHEMAS');
export const DEPRECATE_JSON_API_FALLBACK = deprecationState('DEPRECATE_JSON_API_FALLBACK');
export const DEPRECATE_MODEL_REOPEN = deprecationState('DEPRECATE_MODEL_REOPEN');
export const DEPRECATE_EARLY_STATIC = deprecationState('DEPRECATE_EARLY_STATIC');
export const DEPRECATE_CLASSIC = deprecationState('DEPRECATE_CLASSIC');
export const DEPRECATE_HELPERS = deprecationState('DEPRECATE_HELPERS');
export const DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS = deprecationState('DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS');
export const DEPRECATE_V1CACHE_STORE_APIS = deprecationState('DEPRECATE_V1CACHE_STORE_APIS');
export const DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE = deprecationState('DEPRECATE_RELATIONSHIPS_WITHOUT_TYPE');
export const DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC = deprecationState('DEPRECATE_RELATIONSHIPS_WITHOUT_ASYNC');
export const DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE = deprecationState('DEPRECATE_RELATIONSHIPS_WITHOUT_INVERSE');
export const DEPRECATE_V1_RECORD_DATA = deprecationState('DEPRECATE_V1_RECORD_DATA');
export const DEPRECATE_A_USAGE = deprecationState('DEPRECATE_A_USAGE');
export const DEPRECATE_PROMISE_PROXIES = deprecationState('DEPRECATE_PROMISE_PROXIES');
export const DEPRECATE_ARRAY_LIKE = deprecationState('DEPRECATE_ARRAY_LIKE');
export const DEPRECATE_COMPUTED_CHAINS = deprecationState('DEPRECATE_COMPUTED_CHAINS');
export const DEPRECATE_NON_EXPLICIT_POLYMORPHISM = deprecationState('DEPRECATE_NON_EXPLICIT_POLYMORPHISM');
