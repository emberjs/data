var path = require('path');
var existsSync = require('exists-sync');
var gitRepoInfo = require('git-repo-info');

module.exports = function() {
  var gitPath = path.join(__dirname, '..', '.git');
  var packageVersion = require('../package.json').version;

  if (existsSync(gitPath)) {
    var info = gitRepoInfo(gitPath);
    if (info.tag) {
      return info.tag.replace(/^v/, '');
    }

    return packageVersion + '+' + info.sha.slice(0, 10);
  } else {
    return packageVersion;
  }
};
