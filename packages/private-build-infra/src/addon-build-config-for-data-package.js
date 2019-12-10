const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');
const Funnel = require('broccoli-funnel');
const merge = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');

const rollupPrivateModule = require('./utilities/rollup-private-module');

function isProductionEnv() {
  let isProd = /production/.test(process.env.EMBER_ENV);
  let isTest = process.env.EMBER_CLI_TEST_COMMAND;

  return isProd && !isTest;
}

function addonBuildConfigForDataPackage(PackageName) {
  return {
    name: PackageName,

    init() {
      this._super.init && this._super.init.apply(this, arguments);
      this._prodLikeWarning();
      this.debugTree = BroccoliDebug.buildDebugCallback(`ember-data:${PackageName}`);
      this.options = this.options || {};
    },

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

    _suppressUneededRollupWarnings(message, next) {
      if (message.code === 'CIRCULAR_DEPENDENCY') {
        return;
      } else if (message.code === 'NON_EXISTENT_EXPORT') {
        // ignore ts-interface imports
        if (message.message.indexOf(`/ts-interfaces/`) !== -1) {
          return;
        }
      } else if (message.code === 'UNRESOLVED_IMPORT') {
        if (!this.isDevelopingAddon()) {
          // don't print these for consumers
          return;
        } else {
          const chalk = require('chalk');
          // make warning actionable
          // eslint-disable-next-line no-console
          console.log(
            chalk.yellow(
              `\n\n⚠️  Add ${chalk.white(
                message.source
              )} to the array returned by externalDependenciesForPrivateModule in index.js of ${chalk.white(
                this.name
              )}\n\n`
            )
          );
          throw message.message;
        }
      }
      next(message);
    },

    shouldIncludeChildAddon(addon) {
      if (addon.name.startsWith('@ember-data')) {
        if (this.name === 'ember-data' || addon.name === '@ember-data/canary-features') {
          return true;
        }

        return false;
      }
      return true;
    },

    getOutputDirForVersion() {
      let VersionChecker = require('ember-cli-version-checker');
      let checker = new VersionChecker(this);
      let emberCli = checker.for('ember-cli', 'npm');

      let requiresModulesDir = emberCli.satisfies('< 3.0.0');

      return requiresModulesDir ? 'modules' : '';
    },

    buildBabelOptions() {
      let babelOptions = this.options.babel || {};
      let existingPlugins = babelOptions.plugins || [];
      let compatVersion = this.getEmberDataConfig().compatWith || null;

      let customPlugins = require('./stripped-build-plugins')(process.env.EMBER_ENV, this._findHost(), compatVersion);
      let plugins = existingPlugins.map(plugin => {
        return Array.isArray(plugin) ? plugin : [plugin];
      });
      plugins = plugins.concat(customPlugins.plugins);

      return {
        loose: true,
        plugins,
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

    included() {
      this._super.included.apply(this, arguments);

      this._setupBabelOptions();
    },

    cacheKeyForTree(treeType) {
      return calculateCacheKeyForTree(treeType, this);
    },

    externalDependenciesForPrivateModule() {
      return [];
    },

    treeForAddon(tree) {
      if (process.env.EMBER_DATA_ROLLUP_PRIVATE === 'false' || this.shouldRollupPrivate !== true) {
        return this._super.treeForAddon.call(this, tree);
      }

      tree = this.debugTree(tree, 'input');
      this._setupBabelOptions();

      let babel = this.addons.find(addon => addon.name === 'ember-cli-babel');

      let privateTree = rollupPrivateModule(tree, {
        packageName: PackageName,
        babelCompiler: babel,
        babelOptions: this.options.babel,
        onWarn: this._suppressUneededRollupWarnings.bind(this),
        externalDependencies: this.externalDependenciesForPrivateModule(),
        destDir: this.getOutputDirForVersion(),
      });

      let withoutPrivate = new Funnel(tree, {
        exclude: ['-private', isProductionEnv() ? '-debug' : false].filter(Boolean),

        destDir: PackageName,
      });

      // use the default options
      let publicTree = babel.transpileTree(this.debugTree(withoutPrivate, 'babel-public:input'));
      publicTree = this.debugTree(publicTree, 'babel-public:output');

      let destDir = this.getOutputDirForVersion();

      publicTree = new Funnel(publicTree, { destDir });

      return this.debugTree(merge([publicTree, privateTree]), 'final');
    },

    _emberDataConfig: null,
    getEmberDataConfig() {
      if (this._emberDataConfig) {
        return this._emberDataConfig;
      }
      const app = this._findHost();

      let options = (app.options = app.options || {});
      options.emberData = options.emberData || {};

      return options.emberData;
    },
  };
}

module.exports = addonBuildConfigForDataPackage;
