/* jshint node: true */
'use strict';

var path = require('path');

module.exports = {
  name: 'ember-data',

  _warn: function(message) {
    var chalk = require('chalk');
    var warning = chalk.yellow('WARNING: ' + message);

    if (this.ui && this.ui.writeWarnLine) {
      this.ui.writeWarnLine(message);
    } else if (this.ui) {
      this.ui.writeLine(warning);
    } else {
      console.log(warning);
    }
  },

  init: function() {
    var bowerDeps = this.project.bowerDependencies();

    if (bowerDeps['ember-data']) {
      this._warn('Please remove `ember-data` from `bower.json`. As of Ember Data 2.3.0, only the NPM package is needed.');
      this._forceBowerUsage = true;
    } else {
      this._forceBowerUsage = false;
    }

    var VersionChecker = require('ember-cli-version-checker');

    var checker = new VersionChecker(this);
    var dep = checker.for('ember-cli-shims', 'bower');

    if (!dep.satisfies('>= 0.1.0')) {
      this._warn('Using a version of ember-cli-shims prior to 0.1.0 will cause errors while loading Ember Data 2.3+. Please update ember-cli-shims from ' + dep.version + ' to 0.1.0.');
    }
  },

  blueprintsPath: function() {
    return path.join(__dirname, 'blueprints');
  },

  treeForAddon: function(dir) {
    if (this._forceBowerUsage) {
      // Fakes an empty broccoli tree
      return { inputTree: dir, rebuild: function() { return []; } };
    }

    var version      = require('./lib/version');
    var merge        = require('broccoli-merge-trees');

    return this._super.treeForAddon.call(this, merge([version(), dir]));
  },

  included: function(app) {
    this._super.included.apply(this, arguments);

    if (this._forceBowerUsage) {
      this.app.import({
        development: app.bowerDirectory + '/ember-data/ember-data.js',
        production: app.bowerDirectory + '/ember-data/ember-data.prod.js'
      });
    }
  }
};
