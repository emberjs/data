const requireModule = require('@ember-data/private-build-infra/src/utilities/require-module');
const getEnv = require('@ember-data/private-build-infra/src/utilities/get-env');
const detectModule = require('@ember-data/private-build-infra/src/utilities/detect-module');

const pkg = require('./package.json');

module.exports = {
  name: pkg.name,

  options: {
    '@embroider/macros': {
      setOwnConfig: {},
    },
  },

  _emberDataConfig: null,
  configureEmberData() {
    if (this._emberDataConfig) {
      return this._emberDataConfig;
    }
    const app = this._findHost();
    const isProd = /production/.test(process.env.EMBER_ENV);
    const hostOptions = app.options?.emberData || {};
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
      hostOptions.debug || {}
    );

    const HAS_DEBUG_PACKAGE = detectModule(require, '@ember-data/debug', __dirname, pkg);
    const HAS_META_PACKAGE = detectModule(require, 'ember-data', __dirname, pkg);

    const includeDataAdapterInProduction =
      typeof hostOptions.includeDataAdapterInProduction === 'boolean'
        ? hostOptions.includeDataAdapterInProduction
        : HAS_META_PACKAGE;

    const includeDataAdapter = HAS_DEBUG_PACKAGE ? (isProd ? includeDataAdapterInProduction : true) : false;
    const DEPRECATIONS = require('@ember-data/private-build-infra/src/deprecations')(hostOptions.compatWith || null);
    const FEATURES = require('@ember-data/private-build-infra/src/features')(isProd);

    const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/virtual-packages/packages.js');
    const MACRO_PACKAGE_FLAGS = Object.assign({}, ALL_PACKAGES.default);
    delete MACRO_PACKAGE_FLAGS['HAS_DEBUG_PACKAGE'];

    Object.keys(MACRO_PACKAGE_FLAGS).forEach((key) => {
      MACRO_PACKAGE_FLAGS[key] = detectModule(require, MACRO_PACKAGE_FLAGS[key], __dirname, pkg);
    });

    // copy configs forward
    const ownConfig = this.options['@embroider/macros'].setOwnConfig;
    ownConfig.compatWith = hostOptions.compatWith || null;
    ownConfig.debug = debugOptions;
    ownConfig.deprecations = Object.assign(DEPRECATIONS, ownConfig.deprecations || {}, hostOptions.deprecations || {});
    ownConfig.features = Object.assign({}, FEATURES, ownConfig.features || {}, hostOptions.features || {});
    ownConfig.includeDataAdapter = includeDataAdapter;
    ownConfig.packages = MACRO_PACKAGE_FLAGS;
    ownConfig.env = getEnv(ownConfig);

    this._emberDataConfig = ownConfig;
    return ownConfig;
  },

  included() {
    this.configureEmberData();
    return this._super.included.call(this, ...arguments);
  },

  treeForVendor() {
    return;
  },
  treeForPublic() {
    return;
  },
  treeForStyles() {
    return;
  },
  treeForAddonStyles() {
    return;
  },
  treeForApp() {
    return;
  },
};
