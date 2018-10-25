'use strict';

const path = require('path');
const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const merge = require('broccoli-merge-trees');
const version = require('./lib/version');
const { isInstrumentedBuild } = require('./lib/cli-flags');
const BroccoliDebug = require('broccoli-debug');
const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');

function isProductionEnv() {
  let isProd = /production/.test(process.env.EMBER_ENV);
  let isTest = process.env.EMBER_CLI_TEST_COMMAND;

  return isProd && !isTest;
}

module.exports = {
  name: 'ember-data',

  _prodLikeWarning() {
    let emberEnv = process.env.EMBER_ENV;
    if (emberEnv !== 'production' && /production/.test(emberEnv)) {
      this._warn(
        `Production-like values for EMBER_ENV are deprecated (your EMBER_ENV is "${emberEnv}") and support will be removed in Ember Data 4.0.0. If using ember-cli-deploy, please configure your build using 'production'. Otherwise please set your EMBER_ENV to 'production' for production builds.`
      );
    }
  },

  _warn(message) {
    let chalk = require('chalk');
    let warning = chalk.yellow('WARNING: ' + message);

    if (this.ui && this.ui.writeWarnLine) {
      this.ui.writeWarnLine(message);
    } else if (this.ui) {
      this.ui.writeLine(warning);
    } else {
      // eslint-disable-next-line no-console
      console.log(warning);
    }
  },

  getOutputDirForVersion() {
    let VersionChecker = require('ember-cli-version-checker');
    let checker = new VersionChecker(this);
    let emberCli = checker.for('ember-cli', 'npm');

    let requiresModulesDir = emberCli.satisfies('< 3.0.0');

    return requiresModulesDir ? 'modules' : '';
  },

  init() {
    this._super.init && this._super.init.apply(this, arguments);
    this._prodLikeWarning();
    this.debugTree = BroccoliDebug.buildDebugCallback('ember-data');
    this.options = this.options || {};
  },

  blueprintsPath() {
    return path.join(__dirname, 'blueprints');
  },

  treeForAddon(tree) {
    tree = this.debugTree(tree, 'input');

    let babel = this.addons.find(addon => addon.name === 'ember-cli-babel');

    let treeWithVersion = merge([
      tree,
      version(), // compile the VERSION into the build
    ]);

    let withPrivate = new Funnel(tree, {
      include: ['-private/**'],
    });

    let withoutPrivate = new Funnel(treeWithVersion, {
      exclude: ['-private', isProductionEnv() && !isInstrumentedBuild() ? '-debug' : false].filter(
        Boolean
      ),

      destDir: 'ember-data',
    });

    let privateTree = babel.transpileTree(this.debugTree(withPrivate, 'babel-private:input'), {
      babel: this.buildBabelOptions(),
      'ember-cli-babel': {
        compileModules: false,
      },
    });

    privateTree = this.debugTree(privateTree, 'babel-private:output');

    // use the default options
    let publicTree = babel.transpileTree(this.debugTree(withoutPrivate, 'babel-public:input'));

    publicTree = this.debugTree(publicTree, 'babel-public:output');

    privateTree = new Rollup(privateTree, {
      rollup: {
        input: '-private/index.js',
        output: [
          {
            file: 'ember-data/-private.js',
            format: babel.shouldCompileModules() ? 'amd' : 'es',
            amd: { id: 'ember-data/-private' },
            exports: 'named',
          },
        ],
        external: [
          'ember',
          'ember-inflector',
          'ember-data/version',
          'ember-data/-debug',
          'ember-data/adapters/errors',
          '@ember/ordered-set',
        ],
        // cache: true|false Defaults to true
      },
    });

    privateTree = this.debugTree(privateTree, 'rollup-output');

    let destDir = this.getOutputDirForVersion();

    publicTree = new Funnel(publicTree, { destDir });
    privateTree = new Funnel(privateTree, { destDir });

    return this.debugTree(merge([publicTree, privateTree]), 'final');
  },

  buildBabelOptions() {
    let customPlugins = require('./lib/stripped-build-plugins')(process.env.EMBER_ENV);

    return {
      loose: true,
      plugins: customPlugins.plugins,
      postTransformPlugins: customPlugins.postTransformPlugins,
      exclude: ['transform-block-scoping', 'transform-typeof-symbol'],
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
  },

  cacheKeyForTree(treeType) {
    return calculateCacheKeyForTree(treeType, this);
  },
};
