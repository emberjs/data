var path = require('path');
var fs = require('fs');
var gitRepoInfo = require('git-repo-info');
var npmGitInfo = require('npm-git-info');

module.exports = function() {
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
};
