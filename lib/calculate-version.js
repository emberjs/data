var path = require('path');
var existsSync = require('exists-sync');
var gitRepoInfo = require('git-repo-info');
var npmGitInfo = require('npm-git-info');

module.exports = function() {
  var gitPath = path.join(__dirname, '..', '.git');
  var package = require('../package.json');
  var packageVersion = package.version;
  var suffix = '';

  if (existsSync(gitPath)) {
    var info = gitRepoInfo(gitPath);
    if (info.tag) {
      return info.tag.replace(/^v/, '');
    }

    suffix = '+' + info.sha.slice(0, 10);
  } else {
    var info = npmGitInfo(package);
    if (info.isInstalledAsNpmPackage() && !info.hasVersionInRef()) {
      suffix = '+' + info.abbreviatedSha;
    }
  }

  return packageVersion + suffix;
};
