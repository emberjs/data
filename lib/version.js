var calculateVersion = require('./calculate-version');
var createFile = require('broccoli-file-creator');

module.exports = function() {
  return createFile('version.js', 'export default "' + calculateVersion() + '";');
};
