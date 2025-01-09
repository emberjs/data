// Super naive normalizer for testing purposes
module.exports = {
  normalize: function (value) {
    return value
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .replace(/s$/, '')
      .toLowerCase();
  },
};
