var calculateVersion = require('./calculate-version');
var version = calculateVersion().replace(/^v/, '');
var replace = require('broccoli-string-replace');

module.exports = function configFiles(tree) {
  return replace(tree, {
    files: ['*.{json,js}'],
    pattern: {
      match: /VERSION_STRING_PLACEHOLDER/g,
      replacement: version
    }
  });
};
