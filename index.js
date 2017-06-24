/* eslint-env node */
'use strict';

const path = require('path');
const SilentError = require('silent-error');
const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const Babel = require('broccoli-babel-transpiler');
const merge = require('broccoli-merge-trees');
const semver = require('semver');
const version = require('./lib/version');
const BroccoliDebug = require('broccoli-debug');

// allow toggling of heimdall instrumentation
let INSTRUMENT_HEIMDALL = false;
let args = process.argv;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--instrument') {
    INSTRUMENT_HEIMDALL = true;
    break;
  }
}
const NOOP_TREE = function(dir) {
  return { inputTree: dir, rebuild() { return []; } };
};

process.env.INSTRUMENT_HEIMDALL = INSTRUMENT_HEIMDALL;

function isProductionEnv() {
  let isProd = /production/.test(process.env.EMBER_ENV);
  let isTest = process.env.EMBER_CLI_TEST_COMMAND;

  return isProd && !isTest;
}

module.exports = {
  name: 'ember-data',

  _warn(message) {
    let chalk = require('chalk');
    let warning = chalk.yellow('WARNING: ' + message);

    if (this.ui && this.ui.writeWarnLine) {
      this.ui.writeWarnLine(message);
    } else if (this.ui) {
      this.ui.writeLine(warning);
    } else {
      console.log(warning);
    }
  },

  init() {
    this._super.init && this._super.init.apply(this, arguments);

    this.debugTree = BroccoliDebug.buildDebugCallback('ember-data');

    let bowerDeps = this.project.bowerDependencies();

    let VersionChecker = require('ember-cli-version-checker');
    let options = this.options = this.options || {};

    let checker = new VersionChecker(this);
    // prevent errors when ember-cli-shims is no longer required
    let shims = bowerDeps['ember-cli-shims'] && checker.for('ember-cli-shims', 'bower');

    let version = require('./package').version;

    if (process.env.EMBER_DATA_SKIP_VERSION_CHECKING_DO_NOT_USE_THIS_ENV_VARIABLE) {
      // Skip for node tests as we can't currently override the version of ember-cli-shims
      // before the test helpers run.
      return;
    }

    let hasShims = !!shims;
    let shimsHasEmberDataShims = hasShims && shims.satisfies('< 0.1.0');
    let emberDataNPMWithShimsIncluded = semver.satisfies(version, '^2.3.0-beta.3');

    if (bowerDeps['ember-data']) {
      this._warn('Please remove `ember-data` from `bower.json`. As of Ember Data 2.3.0, only the NPM package is needed. If you need an ' +
                'earlier version of ember-data (< 2.3.0), you can leave this unchanged for now, but we strongly suggest you upgrade your version of Ember Data ' +
                'as soon as possible.');
      this._forceBowerUsage = true;

      let emberDataBower = checker.for('ember-data', 'bower');
      let emberDataBowerWithShimsIncluded = emberDataBower.satisfies('>= 2.3.0-beta.3');

      if (hasShims && !shimsHasEmberDataShims && !emberDataBowerWithShimsIncluded) {
        throw new SilentError('Using a version of ember-cli-shims greater than or equal to 0.1.0 will cause errors while loading Ember Data < 2.3.0-beta.3 Please update ember-cli-shims from ' + shims.version + ' to 0.0.6');
      }

      if (hasShims && shimsHasEmberDataShims && !emberDataBowerWithShimsIncluded) {
        throw new SilentError('Using a version of ember-cli-shims prior to 0.1.0 will cause errors while loading Ember Data 2.3.0-beta.3+. Please update ember-cli-shims from ' + shims.version + ' to 0.1.0.');
      }

    } else {
      // NPM only, but ember-cli-shims does not match
      if (hasShims && shimsHasEmberDataShims && emberDataNPMWithShimsIncluded) {
        throw new SilentError('Using a version of ember-cli-shims prior to 0.1.0 will cause errors while loading Ember Data 2.3.0-beta.3+. Please update ember-cli-shims from ' + shims.version + ' to 0.1.0.');
      }
    }
  },

  blueprintsPath() {
    return path.join(__dirname, 'blueprints');
  },

  treeForApp(dir) {
    if (this._forceBowerUsage) { return NOOP_TREE(dir); }

    // this._super.treeForApp is undefined in ember-cli (1.13) for some reason.
    // TODO: investigate why treeForApp isn't on _super
    return dir;
  },

  treeForAddon(tree) {
    if (this._forceBowerUsage) { return NOOP_TREE(tree); }

    tree = this.debugTree(tree, 'input');

    let babel = this.addons.find(addon => addon.name === 'ember-cli-babel');

    let treeWithVersion = merge([
      tree,
      version() // compile the VERSION into the build
    ]);

    let withPrivate    = new Funnel(tree, { include: ['-private/**'] });
    let withoutPrivate = new Funnel(treeWithVersion, {
      exclude: [
        '-private',
        isProductionEnv() ? '-debug' : false
      ].filter(Boolean),

      destDir: 'ember-data'
    });

    let privateTree = babel.transpileTree(this.debugTree(withPrivate, 'babel-private:input'), {
      babel: this.buildBabelOptions(),
      'ember-cli-babel': {
        compileModules: false
      }
    });

    privateTree = this.debugTree(privateTree, 'babel-private:output');

    // use the default options
    let publicTree = babel.transpileTree(this.debugTree(withoutPrivate, 'babel-public:input'));

    publicTree = this.debugTree(publicTree, 'babel-public:output');

    privateTree = new Rollup(privateTree, {
      rollup: {
        entry: '-private/index.js',
        targets: [
          { dest: 'ember-data/-private.js', format: babel.shouldCompileModules() ? 'amd' : 'es', moduleId: 'ember-data/-private' }
        ],
        external: [
          'ember',
          'ember-inflector',
          'ember-data/version',
          'ember-data/-debug',
          'ember-data/adapters/errors'
        ]
        // cache: true|false Defaults to true
      }
    });

    privateTree = this.debugTree(privateTree, 'rollup-output');

    // the output of treeForAddon is required to be modules/<your files>
    publicTree  = new Funnel(publicTree,  { destDir: 'modules' });
    privateTree = new Funnel(privateTree, { destDir: 'modules' });

    return this.debugTree(merge([
      publicTree,
      privateTree
    ]), 'final');
  },

  buildBabelOptions() {
    let customPlugins = require('./lib/stripped-build-plugins')(process.env.EMBER_ENV);

    return {
      loose: true,
      plugins: customPlugins.plugins,
      postTransformPlugins: customPlugins.postTransformPlugins,
      exclude: [
        'transform-es2015-block-scoping',
        'transform-es2015-typeof-symbol'
      ]
    };
  },

  _setupBabelOptions() {
    if (this._hasSetupBabelOptions) {
      return;
    }

    this.options.babel = this.buildBabelOptions();

    this._hasSetupBabelOptions = true;
  },

  included(app) {
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

