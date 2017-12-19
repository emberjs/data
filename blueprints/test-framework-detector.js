var fs = require('fs');
var path = require('path');
const VersionChecker = require('ember-cli-version-checker');

module.exports = function(blueprint) {
  blueprint.supportsAddon = function() {
    return false;
  };

  blueprint.filesPath = function() {
    var type;

    var dependencies = this.project.dependencies();
    if ('ember-qunit' in dependencies) {
      type = 'qunit-rfc-232';

    } else if ('ember-cli-qunit' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (fs.existsSync(this.path + '/qunit-rfc-232-files') && checker.for('ember-cli-qunit', 'npm').gte('4.2.0')) {
        type = 'qunit-rfc-232';
      } else {
        type = 'qunit';
      }

    } else if ('ember-cli-mocha' in dependencies) {
      type = 'mocha';

    } else {
      this.ui.writeLine('Couldn\'t determine test style - using QUnit');
      type = 'qunit';
    }

    return path.join(this.path, type + '-files');
  };

  return blueprint;
};
