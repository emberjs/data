/* jshint node: true */
'use strict';

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
