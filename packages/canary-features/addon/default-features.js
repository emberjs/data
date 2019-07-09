// -build-infra/src/features consumes this variable to
// populate the default features
// we export it from its own file to avoid
// requiring @ember/polyfills for the esm require
export const DEFAULT_FEATURES = {
  SAMPLE_FEATURE_FLAG: null,
  RECORD_DATA_ERRORS: null,
  RECORD_DATA_STATE: null,
};
