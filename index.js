'use strict';

const path = require('path');
const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const merge = require('broccoli-merge-trees');
const version = require('./lib/version');
const BroccoliDebug = require('broccoli-debug');
const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');
const typescript = require('broccoli-typescript-compiler').typescript;

// allow toggling of heimdall instrumentation
let INSTRUMENT_HEIMDALL = false;
let USE_RECORD_DATA_RFC = false;
let args = process.argv;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--instrument') {
    INSTRUMENT_HEIMDALL = true;
    if (USE_RECORD_DATA_RFC) {
      break;
    }
  } else if (args[i] === '--record-data-rfc-build') {
    USE_RECORD_DATA_RFC = true;
    if (INSTRUMENT_HEIMDALL) {
      break;
    }
  }
}

process.env.INSTRUMENT_HEIMDALL = INSTRUMENT_HEIMDALL;

function isProductionEnv() {
  let isProd = /production/.test(process.env.EMBER_ENV);
  let isTest = process.env.EMBER_CLI_TEST_COMMAND;

  return isProd && !isTest;
}

function isInstrumentedBuild() {
  return INSTRUMENT_HEIMDALL;
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

  config() {
    return {
      emberData: {
        enableRecordDataRFCBuild: USE_RECORD_DATA_RFC,
      },
    };
  },

  blueprintsPath() {
    return path.join(__dirname, 'blueprints');
  },


  typescriptTree(input) {
    // let input = new Funnel(`packages`, {
    //   exclude: ['node-module/**', 'loader/**', 'external-helpers/**'],
    //   destDir: `dist`,
    // });

    let debuggedInput = this.debugTree(input, `get-source-es:input`);

    let nonTypeScriptContents = new Funnel(debuggedInput, {
      srcDir: './',
      exclude: ['**/*.ts'],
    });

    let typescriptContents = new Funnel(debuggedInput, {
      include: ['**/*.ts'],
    });

    let typescriptCompiled = typescript(this.debugTree(typescriptContents, `get-source-es:ts:input`));

    let debuggedCompiledTypescript = this.debugTree(typescriptCompiled, `get-source-es:ts:output`);

    let mergedFinalOutput = merge([nonTypeScriptContents, debuggedCompiledTypescript], {
      overwrite: true,
    });

    return this.debugTree(mergedFinalOutput, `get-source-es:output`);
  },


  treeForAddon(tree) {
    tree = this.debugTree(tree, 'input');
    tree = this.typescriptTree(tree);
    // var filterTypeScript = require('broccoli-typescript-compiler').filterTypeScript;
    // tree = filterTypeScript(tree);

    let babel = this.addons.find(addon => addon.name === 'ember-cli-babel');

    let treeWithVersion = merge([
      tree,
      version(), // compile the VERSION into the build
    ]);

    let corePrivate = new Funnel(tree, {
      include: ['-private/**'],
    });
    let withPrivate;

    if (USE_RECORD_DATA_RFC) {
      withPrivate = new Funnel(tree, {
        srcDir: '-record-data-private',
        destDir: '-private',
      });
    } else {
      withPrivate = new Funnel(tree, {
        srcDir: '-legacy-private',
        destDir: '-private',
      });
    }

    // do not allow overwrite, conflicts should error
    //  overwrite: false is default, but we are being explicit here
    //  since this is very important
    withPrivate = merge([corePrivate, withPrivate], { overwrite: false });

    let withoutPrivate = new Funnel(treeWithVersion, {
      exclude: [
        '-private',
        '-record-data-private',
        '-legacy-private',
        isProductionEnv() && !isInstrumentedBuild() ? '-debug' : false,
      ].filter(Boolean),

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
      exclude: ['transform-es2015-block-scoping', 'transform-es2015-typeof-symbol'],
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
