const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');
const Funnel = require('broccoli-funnel');
const merge = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');
const version = require('./create-version-module');
const { isInstrumentedBuild } = require('./cli-flags');
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

    _suppressCircularDependencyWarnings(message, next) {
      if (message.code !== 'CIRCULAR_DEPENDENCY') {
        next(message);
      }
    },

    getOutputDirForVersion() {
      let VersionChecker = require('ember-cli-version-checker');
      let checker = new VersionChecker(this);
      let emberCli = checker.for('ember-cli', 'npm');

      let requiresModulesDir = emberCli.satisfies('< 3.0.0');

      return requiresModulesDir ? 'modules' : '';
    },

    isLocalBuild() {
      let appName = this.parent.pkg.name;

      return this.isDevelopingAddon() && appName === PackageName;
    },

    buildBabelOptions() {
      let babelOptions = this.options.babel || {};
      let existingPlugins = babelOptions.plugins || [];
      let customPlugins = require('./stripped-build-plugins')(process.env.EMBER_ENV, this.isLocalBuild());
      let plugins = existingPlugins.map(plugin => {
        return Array.isArray(plugin) ? plugin : [plugin];
      });
      plugins = plugins.concat(customPlugins.plugins).concat(require('./debug-macros')(process.env.EMBER_ENV));

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
      if (this.shouldRollupPrivate !== true) {
        return this._super.treeForAddon.call(this, tree);
      }

      tree = this.debugTree(tree, 'input');
      this._setupBabelOptions();

      let babel = this.addons.find(addon => addon.name === 'ember-cli-babel');

      let treeWithVersion = merge([
        tree,
        version(), // compile the VERSION into the build
      ]);

      let privateTree = rollupPrivateModule(tree, {
        packageName: PackageName,
        babelCompiler: babel,
        babelOptions: this.options.babel,
        onWarn: this._suppressCircularDependencyWarnings,
        externalDependencies: this.externalDependenciesForPrivateModule(),
        destDir: this.getOutputDirForVersion(),
      });

      let withoutPrivate = new Funnel(treeWithVersion, {
        exclude: ['-private', isProductionEnv() && !isInstrumentedBuild() ? '-debug' : false].filter(Boolean),

        destDir: PackageName,
      });

      // use the default options
      let publicTree = babel.transpileTree(this.debugTree(withoutPrivate, 'babel-public:input'));
      publicTree = this.debugTree(publicTree, 'babel-public:output');

      let destDir = this.getOutputDirForVersion();

      publicTree = new Funnel(publicTree, { destDir });

      return this.debugTree(merge([publicTree, privateTree]), 'final');
    },
  };
}

module.exports = addonBuildConfigForDataPackage;
