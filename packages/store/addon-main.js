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
        LOG_REQUEST_STATUS: false,
        LOG_IDENTIFIERS: false,
        LOG_GRAPH: false,
        LOG_INSTANCE_CACHE: false,
      },
      hostOptions.debug || {}
    );
    let HAS_DEBUG_PACKAGE, HAS_META_PACKAGE;

    try {
      // eslint-disable-next-line node/no-missing-require
      require.resolve('@ember-data/debug', { paths: [process.cwd(), __dirname] });
      HAS_DEBUG_PACKAGE = true;
    } catch {
      HAS_DEBUG_PACKAGE = false;
    }
    try {
      // eslint-disable-next-line node/no-missing-require
      require.resolve('ember-data', { paths: [process.cwd(), __dirname] });
      HAS_META_PACKAGE = true;
    } catch {
      HAS_META_PACKAGE = false;
    }
    const includeDataAdapterInProduction =
      typeof hostOptions.includeDataAdapterInProduction === 'boolean'
        ? hostOptions.includeDataAdapterInProduction
        : HAS_META_PACKAGE;

    const includeDataAdapter = HAS_DEBUG_PACKAGE ? (isProd ? includeDataAdapterInProduction : true) : false;
    const DEPRECATIONS = require('@ember-data/private-build-infra/src/deprecations')(hostOptions.compatWith || null);
    const FEATURES = require('@ember-data/private-build-infra/src/features')(isProd);

    // copy configs forward
    const ownConfig = this.options['@embroider/macros'].setOwnConfig;
    ownConfig.compatWith = hostOptions.compatWith || null;
    ownConfig.debug = debugOptions;
    ownConfig.deprecations = Object.assign(DEPRECATIONS, ownConfig.deprecations || {});
    ownConfig.features = Object.assign({}, FEATURES);
    ownConfig.includeDataAdapter = includeDataAdapter;

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
