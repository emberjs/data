var path = require('path');

module.exports = function(blueprint) {
  blueprint.supportsAddon = function() {
    return false;
  };

  blueprint.filesPath = function() {
    var type;

    if ('ember-cli-mocha' in this.project.addonPackages) {
      type = 'mocha';
    } else if ('ember-cli-qunit' in this.project.addonPackages) {
      type = 'qunit';
    } else {
      this.ui.writeLine('Couldn\'t determine test style - using QUnit');
      type = 'qunit';
    }

    return path.join(this.path, type + '-files');
  };

  return blueprint;
};
