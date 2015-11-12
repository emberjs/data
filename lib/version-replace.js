var VERSION = require('git-repo-version')(10);
var replace = require('broccoli-string-replace');

module.exports = function configFiles(tree) {
  return replace(tree, {
    files: ['*.{json,js}'],
    pattern: {
      match: /VERSION_STRING_PLACEHOLDER/g,
      replacement: VERSION
    }
  });
};

