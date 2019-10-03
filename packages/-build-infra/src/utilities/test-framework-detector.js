'use strict';

const fs = require('fs');
const path = require('path');
const VersionChecker = require('ember-cli-version-checker');

module.exports = function(blueprint) {
  blueprint.supportsAddon = function() {
    return false;
  };

  blueprint.filesPath = function() {
    let type;

    let dependencies = this.project.dependencies();

    if ('ember-qunit' in dependencies) {
      if (fs.existsSync(blueprint.root + '/qunit-rfc-232-files')) {
        type = 'qunit-rfc-232';
      } else {
        type = 'qunit';
      }
    } else if ('ember-cli-qunit' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (
        fs.existsSync(blueprint.root + '/qunit-rfc-232-files') &&
        checker.for('ember-cli-qunit', 'npm').gte('4.2.0')
      ) {
        type = 'qunit-rfc-232';
      } else {
        type = 'qunit';
      }
    } else if ('ember-mocha' in dependencies) {
      let checker = new VersionChecker(this.project);
      if (fs.existsSync(blueprint.root + '/mocha-rfc-232-files') && checker.for('ember-mocha', 'npm').gte('0.14.0')) {
        type = 'mocha-rfc-232';
      } else {
        type = 'mocha';
      }
    } else if ('ember-cli-mocha' in dependencies) {
      type = 'mocha';
    } else {
      this.ui.writeLine("Couldn't determine test style - using QUnit");
      type = 'qunit';
    }

    return path.join(blueprint.root, type + '-files');
  };

  return blueprint;
};
