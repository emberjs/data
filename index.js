/* eslint-env node */
'use strict';

var path = require('path');
var SilentError = require('silent-error');

function add(options, name, array) {
  var option = options[name] = options[name] || [];
  option.push.apply(option, array);
}

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
    this._super.init && this._super.init.apply(this, arguments);

    var bowerDeps = this.project.bowerDependencies();

    var VersionChecker = require('ember-cli-version-checker');
    var options = this.options = this.options || {};

    var checker = new VersionChecker(this);
    // prevent errors when ember-cli-shims is no longer required
    var shims = bowerDeps['ember-cli-shims'] && checker.for('ember-cli-shims', 'bower');

    var semver = require('semver');
    var version = require('./package').version;

    if (process.env.EMBER_DATA_SKIP_VERSION_CHECKING_DO_NOT_USE_THIS_ENV_VARIABLE) {
      // Skip for node tests as we can't currently override the version of ember-cli-shims
      // before the test helpers run.
      return;
    }

    if (bowerDeps['ember-data']) {
      this._warn('Please remove `ember-data` from `bower.json`. As of Ember Data 2.3.0, only the NPM package is needed. If you need an ' +
                'earlier version of ember-data (< 2.3.0), you can leave this unchanged for now, but we strongly suggest you upgrade your version of Ember Data ' +
                'as soon as possible.');
      this._forceBowerUsage = true;

      var emberDataBower = checker.for('ember-data', 'bower');

      if (shims && shims.version && !shims.satisfies('< 0.1.0') && emberDataBower.satisfies('< 2.3.0-beta.3')) {
        throw new SilentError('Using a version of ember-cli-shims greater than or equal to 0.1.0 will cause errors while loading Ember Data < 2.3.0-beta.3 Please update ember-cli-shims from ' + shims.version + ' to 0.0.6');
      }

      if (shims && shims.version && !shims.satisfies('>= 0.1.0') && emberDataBower.satisfies('>= 2.3.0-beta.3')) {
        throw new SilentError('Using a version of ember-cli-shims prior to 0.1.0 will cause errors while loading Ember Data 2.3.0-beta.3+. Please update ember-cli-shims from ' + shims.version + ' to 0.1.0.');
      }

    } else {
      // NPM only, but ember-cli-shims does not match
      if (shims && shims.version && !shims.satisfies('>= 0.1.0') && semver.satisfies(version, '^2.3.0-beta.3')) {
        throw new SilentError('Using a version of ember-cli-shims prior to 0.1.0 will cause errors while loading Ember Data 2.3.0-beta.3+. Please update ember-cli-shims from ' + shims.version + ' to 0.1.0.');
      }
    }
  },

  blueprintsPath: function() {
    return path.join(__dirname, 'blueprints');
  },

  treeForApp: function(dir) {
    if (this._forceBowerUsage) {
      // Fake an empty broccoli tree
      return { inputTree: dir, rebuild: function() { return []; } };
    }

    // this._super.treeForApp is undefined in ember-cli (1.13) for some reason.
    // TODO: investigate why treeForApp isn't on _super
    return dir;
  },

  treeForAddon: function(dir) {
    if (this._forceBowerUsage) {
      // Fakes an empty broccoli tree
      return { inputTree: dir, rebuild: function() { return []; } };
    }

    var version   = require('./lib/version');
    var merge     = require('broccoli-merge-trees');

    return this._super.treeForAddon.call(this, merge([
      version(),
      dir
    ]));
  },

  _setupBabelOptions: function() {
    if (this._hasSetupBabelOptions) {
      return;
    }

    this.options.babel = this.options.babel || {};
    add(this.options.babel, 'blacklist', ['es6.modules', 'useStrict']);
    add(this.options.babel, 'plugins', require('./lib/stripped-build-plugins')(process.env.EMBER_ENV));

    this._hasSetupBabelOptions = true;
  },

  included: function(app) {
    this._super.included.apply(this, arguments);

    this._setupBabelOptions();

    if (this._forceBowerUsage) {
      this.app.import({
        development: app.bowerDirectory + '/ember-data/ember-data.js',
        production: app.bowerDirectory + '/ember-data/ember-data.prod.js'
      });
    }
  }
};
