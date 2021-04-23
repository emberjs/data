var path = require('path');
var fs = require('fs');

var createFile = require('broccoli-file-creator');
var gitRepoInfo = require('git-repo-info');
var npmGitInfo = require('npm-git-info');

function calculateVersion() {
  var gitPath = path.join(__dirname, '..', '.git');
  var pkg = require('../package.json');
  var packageVersion = pkg.version;
  var suffix = '';

  var info;
  if (fs.existsSync(gitPath)) {
    info = gitRepoInfo(gitPath);
    if (info.tag) {
      return info.tag.replace(/^v/, '');
    }

    suffix = '+' + info.sha.slice(0, 10);
  } else {
    info = npmGitInfo(pkg);
    if (info.isInstalledAsNpmPackage() && !info.hasVersionInRef()) {
      suffix = '+' + info.abbreviatedSha;
    }
  }

  return packageVersion + suffix;
}

module.exports = function (compatVersion) {
  return createFile(
    'version.js',
    'export default "' +
      calculateVersion() +
      '";\n' +
      (compatVersion ? `export const COMPAT_VERSION = "${compatVersion}";\n` : '')
  );
};
