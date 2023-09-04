const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');
const BroccoliDebug = require('broccoli-debug');

const detectModule = require('./utilities/detect-module');

function addonBuildConfigForDataPackage(pkg) {
  return {
    name: pkg.name,

    init() {
      this._super.init && this._super.init.apply(this, arguments);
      // console.log(
      //   'init: ' +
      //     this.name +
      //     ' for ' +
      //     (typeof this.parent.name === 'function' ? this.parent.name() : this.parent.name)
      // );
      this.debugTree = BroccoliDebug.buildDebugCallback(`ember-data:${pkg.name}`);
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
            '@ember-data/request',
            '@ember-data/model',
            '@ember-data/json-api',
            '@ember-data/debug',
            '@ember-data/tracking',
            '@glimmer/tracking',
          ],
        },
      });
    },

    isDevelopingAddon() {
      if (typeof this.parent.name === 'string' && this.parent.name === 'ember-data') {
        return this.parent.isDevelopingAddon();
      }
      return this._super(...arguments);
    },

    shouldIncludeChildAddon(addon) {
      if (addon.name.startsWith('@ember-data/')) {
        if (this.name === 'ember-data' || addon.name === '@ember-data/tracking') {
          return true;
        }

        return false;
      }
      return true;
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
      const hostOptions = options.emberData;
      const debugOptions = Object.assign(
        {
          LOG_PAYLOADS: false,
          LOG_OPERATIONS: false,
          LOG_MUTATIONS: false,
          LOG_NOTIFICATIONS: false,
          LOG_REQUESTS: false,
          LOG_REQUEST_STATUS: false,
          LOG_IDENTIFIERS: false,
          LOG_GRAPH: false,
          LOG_INSTANCE_CACHE: false,
        },
        options.emberData.debug
      );
      options.emberData.debug = debugOptions;

      const HAS_DEBUG_PACKAGE = detectModule(require, '@ember-data/debug', __dirname, pkg);
      const HAS_META_PACKAGE = detectModule(require, 'ember-data', __dirname, pkg);

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
      ownConfig.deprecations = Object.assign(
        DEPRECATIONS,
        ownConfig.deprecations || {},
        hostOptions.deprecations || {}
      );
      ownConfig.features = Object.assign({}, FEATURES);
      ownConfig.includeDataAdapter = includeDataAdapter;

      this._emberDataConfig = ownConfig;
      return ownConfig;
    },
  };
}

module.exports = addonBuildConfigForDataPackage;
