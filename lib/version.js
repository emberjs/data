var createFile = require('broccoli-file-creator');

var version;

try {
  version = require('git-repo-version')(10);
} catch (e) {
  version = require('../package').version;
}

module.exports = function() {
  return createFile('version.js', 'export default "' + version + '";');
};
