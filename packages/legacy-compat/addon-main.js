const requireModule = require('@ember-data/private-build-infra/src/utilities/require-module');

const pkg = require('./package.json');

// do our best to detect being present
// Note: when this is not enough, consuming apps may need
// to "hoist" peer-deps or specify us as a direct dependency
// in order to deal with peer-dep bugs in package managers
function detectModule(moduleName) {
  try {
    // package managers have peer-deps bugs where another library
    // bringing a peer-dependency doesn't necessarily result in all
    // versions of the dependent getting the peer-dependency
    //
    // so we resolve from project as well as from our own location
    //
    // eslint-disable-next-line node/no-missing-require
    require.resolve(moduleName, { paths: [process.cwd(), __dirname] });
    return true;
  } catch {
    try {
      // ember-data brings all packages so if present we are present
      //
      // eslint-disable-next-line node/no-missing-require
      require.resolve('ember-data', { paths: [process.cwd(), __dirname] });
      return true;
    } catch {
      return false;
    }
  }
}

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

    const HAS_DEBUG_PACKAGE = detectModule('@ember-data/debug');
    const HAS_META_PACKAGE = detectModule('ember-data');

    const includeDataAdapterInProduction =
      typeof hostOptions.includeDataAdapterInProduction === 'boolean'
        ? hostOptions.includeDataAdapterInProduction
        : HAS_META_PACKAGE;

    const includeDataAdapter = HAS_DEBUG_PACKAGE ? (isProd ? includeDataAdapterInProduction : true) : false;
    const DEPRECATIONS = require('@ember-data/private-build-infra/src/deprecations')(hostOptions.compatWith || null);
    const FEATURES = require('@ember-data/private-build-infra/src/features')(isProd);

    const ALL_PACKAGES = requireModule('@ember-data/private-build-infra/addon/available-packages.ts');
    const MACRO_PACKAGE_FLAGS = Object.assign({}, ALL_PACKAGES.default);
    delete MACRO_PACKAGE_FLAGS['HAS_DEBUG_PACKAGE'];

    Object.keys(MACRO_PACKAGE_FLAGS).forEach((key) => {
      MACRO_PACKAGE_FLAGS[key] = detectModule(MACRO_PACKAGE_FLAGS[key]);
    });

    // copy configs forward
    const ownConfig = this.options['@embroider/macros'].setOwnConfig;
    ownConfig.compatWith = hostOptions.compatWith || null;
    ownConfig.debug = debugOptions;
    ownConfig.deprecations = Object.assign(DEPRECATIONS, ownConfig.deprecations || {});
    ownConfig.features = Object.assign({}, FEATURES);
    ownConfig.includeDataAdapter = includeDataAdapter;
    ownConfig.packages = MACRO_PACKAGE_FLAGS;

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
