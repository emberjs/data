// Super naive normalizer for testing purposes
export function normalize(value) {
  return value
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/s$/, '')
    .toLowerCase();
}
