const path = require('path');

const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');
const Funnel = require('broccoli-funnel');
const merge = require('broccoli-merge-trees');
const BroccoliDebug = require('broccoli-debug');
const VersionChecker = require('ember-cli-version-checker');

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
      // console.log(
      //   'init: ' +
      //     this.name +
      //     ' for ' +
      //     (typeof this.parent.name === 'function' ? this.parent.name() : this.parent.name)
      // );
      this._prodLikeWarning();
      this.debugTree = BroccoliDebug.buildDebugCallback(`ember-data:${PackageName}`);
      this.options = this.options || {};
      Object.assign(this.options, {
        '@embroider/macros': {
          setOwnConfig: {},
        },
        'ember-cli-babel': {
          enableTypeScriptTransform: true,
        },
        autoImport: {
          exclude: [
            '@ember/string',
            'ember-inflector',
            '@ember-data/store',
            '@ember-data/adapter',
            '@ember-data/serializer',
            '@ember-data/model',
            '@ember-data/json-api',
            '@ember-data/debug',
            '@ember-data/canary-features',
            '@ember-data/tracking',
            '@glimmer/tracking',
          ],
        },
      });
    },

    _prodLikeWarning() {
      let emberEnv = process.env.EMBER_ENV;
      if (emberEnv !== 'production' && /production/.test(emberEnv)) {
        this._warn(
          `Production-like values for EMBER_ENV are deprecated (your EMBER_ENV is "${emberEnv}") and support will be removed in Ember Data 4.0.0. If using ember-cli-deploy, please configure your build using 'production'. Otherwise please set your EMBER_ENV to 'production' for production builds.`
        );
      }
    },

    isDevelopingAddon() {
      if (typeof this.parent.name === 'string' && this.parent.name === 'ember-data') {
        return this.parent.isDevelopingAddon();
      }
      return this._super(...arguments);
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
        // ignore type imports
        if (message.message.indexOf(`@ember-data/types`) !== -1) {
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
        if (
          this.name === 'ember-data' ||
          addon.name === '@ember-data/canary-features' ||
          addon.name === '@ember-data/tracking'
        ) {
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
      let config = this.getEmberDataConfig();

      let customPlugins = require('./stripped-build-plugins')(config);
      let plugins = existingPlugins.map((plugin) => {
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

      const host = this._findHost();
      const name = this.name;
      const options = host.options['@embroider/macros']?.setConfig?.[name];

      if (options) {
        Object.assign(this.options['@embroider/macros'].setOwnConfig, options);
      }

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

      let babel = this.addons.find((addon) => addon.name === 'ember-cli-babel');
      let externalDeps = this.externalDependenciesForPrivateModule();

      const host = this._findHost();

      // don't print this for consumers
      if (this.isDevelopingAddon()) {
        // eslint-disable-next-line no-console
        console.log(
          `Rolling up ${this.name} private modules with the following external dependencies: ['${externalDeps.join(
            "', '"
          )}']`
        );
      }
      let checker = new VersionChecker(this.project);
      let emberVersion = checker.for('ember-source');
      let analyzer = this.registry.load('js').find((plugin) => plugin.name === 'ember-auto-import-analyzer');

      let privateTree = rollupPrivateModule(tree, {
        packageName: PackageName,
        babelCompiler: babel,
        babelOptions: this.options.babel,
        emberVersion: emberVersion,
        emberCliBabelOptions: host.options && host.options['ember-cli-babel'] ? host.options['ember-cli-babel'] : {},
        onWarn: this._suppressUneededRollupWarnings.bind(this),
        externalDependencies: this.externalDependenciesForPrivateModule(),
        destDir: this.getOutputDirForVersion(),
        analyzer,
      });

      let withoutPrivate = new Funnel(tree, {
        exclude: ['-private', isProductionEnv() ? '-debug' : false].filter(Boolean),

        destDir: PackageName,
      });

      // use the default options
      let publicTree = babel.transpileTree(this.debugTree(withoutPrivate, 'babel-public:input'));
      publicTree = this.debugTree(publicTree, 'babel-public:output');

      if (analyzer) {
        publicTree = analyzer.toTree.call(analyzer, publicTree, undefined, undefined, { treeType: 'addon' });
      }

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
      const isProd = /production/.test(process.env.EMBER_ENV);

      let options = (app.options = app.options || {});
      options.emberData = options.emberData || {};
      options.emberData.debug = options.emberData.debug || {};
      const debugOptions = Object.assign(
        {
          LOG_PAYLOADS: false,
          LOG_OPERATIONS: false,
          LOG_MUTATIONS: false,
          LOG_NOTIFICATIONS: false,
          LOG_REQUEST_STATUS: false,
          LOG_IDENTIFIERS: false,
          LOG_GRAPH: false,
          LOG_INSTANCE_CACHE: false,
        },
        options.emberData.debug
      );
      options.emberData.debug = debugOptions;
      let HAS_DEBUG_PACKAGE, HAS_META_PACKAGE;

      try {
        // eslint-disable-next-line node/no-missing-require
        require.resolve('@ember-data/debug', { paths: [process.cwd(), path.join(__dirname, '../')] });
        HAS_DEBUG_PACKAGE = true;
      } catch {
        HAS_DEBUG_PACKAGE = false;
      }
      try {
        // eslint-disable-next-line node/no-missing-require
        require.resolve('ember-data', { paths: [process.cwd(), path.join(__dirname, '../')] });
        HAS_META_PACKAGE = true;
      } catch {
        HAS_META_PACKAGE = false;
      }
      options.emberData.includeDataAdapterInProduction =
        typeof options.emberData.includeDataAdapterInProduction === 'boolean'
          ? options.emberData.includeDataAdapterInProduction
          : HAS_META_PACKAGE;

      const includeDataAdapter = HAS_DEBUG_PACKAGE
        ? isProd
          ? options.emberData.includeDataAdapterInProduction
          : true
        : false;
      options.emberData.includeDataAdapter = includeDataAdapter;

      const DEPRECATIONS = require('./deprecations')(options.emberData.compatWith || null);
      const FEATURES = require('./features')(isProd);
      options.emberData.__DEPRECATIONS = DEPRECATIONS;
      options.emberData.__FEATURES = FEATURES;

      // copy configs forward
      const ownConfig = this.options['@embroider/macros'].setOwnConfig;
      ownConfig.compatWith = options.emberData.compatWith || null;
      ownConfig.debug = debugOptions;
      ownConfig.deprecations = Object.assign(DEPRECATIONS, ownConfig.deprecations || {});
      ownConfig.features = Object.assign({}, FEATURES);
      ownConfig.includeDataAdapter = includeDataAdapter;

      this._emberDataConfig = ownConfig;
      return ownConfig;
    },
  };
}

module.exports = addonBuildConfigForDataPackage;
