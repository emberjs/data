/**
  @module @ember-data/canary-features
*/

/*
  This list of features is used both at build time (by `@ember-data/-build-infra`)
  and at runtime (by `@ember-data/canary-features`).

  The valid values are:

  - true - The feature is enabled at all times, and cannot be disabled.
  - false - The feature is disabled at all times, and cannot be enabled.
  - null - The feature is disabled by default, but can be enabled at runtime via `EmberDataENV`.
*/
export default {
  SAMPLE_FEATURE_FLAG: null,
  RECORD_DATA_ERRORS: null,
  RECORD_DATA_STATE: null,
  IDENTIFIERS: null,
  REQUEST_SERVICE: null,
};
