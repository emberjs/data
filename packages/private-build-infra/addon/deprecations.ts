import CURRENT_DEPRECATIONS from './current-deprecations';

function deprecationState(deprecationName: keyof typeof CURRENT_DEPRECATIONS): boolean {
  // if we hit this at runtime and the deprecation exists it is always activated
  return deprecationName in CURRENT_DEPRECATIONS;
}

// deprecations
export const DEPRECATE_CATCH_ALL = deprecationState('DEPRECATE_CATCH_ALL');
export const DEPRECATE_EVENTED_API_USAGE = deprecationState('DEPRECATE_EVENTED_API_USAGE');
export const DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS = deprecationState('DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS');
export const DEPRECATE_MODEL_TOJSON = deprecationState('DEPRECATE_MODEL_TOJSON');
export const DEPRECATE_LEGACY_TEST_HELPER_SUPPORT = deprecationState('DEPRECATE_LEGACY_TEST_HELPER_SUPPORT');
export const DEPRECATE_LEGACY_TEST_REGISTRATIONS = deprecationState('DEPRECATE_LEGACY_TEST_REGISTRATIONS');
export const DEPRECATE_DEFAULT_SERIALIZER = deprecationState('DEPRECATE_DEFAULT_SERIALIZER');
export const DEPRECATE_DEFAULT_ADAPTER = deprecationState('DEPRECATE_DEFAULT_ADAPTER');
export const DEPRECATE_METHOD_CALLS_ON_DESTROY_STORE = deprecationState('DEPRECATE_METHOD_CALLS_ON_DESTROY_STORE');
export const DEPRECATE_MISMATCHED_INVERSE_RELATIONSHIP_DATA = deprecationState(
  'DEPRECATE_MISMATCHED_INVERSE_RELATIONSHIP_DATA'
);
export const DEPRECATE_BELONGS_TO_REFERENCE_PUSH = deprecationState('DEPRECATE_BELONGS_TO_REFERENCE_PUSH');
export const DEPRECATE_REFERENCE_INTERNAL_MODEL = deprecationState('DEPRECATE_REFERENCE_INTERNAL_MODEL');
export const DEPRECATE_NAJAX = deprecationState('DEPRECATE_NAJAX');
