const calculateCacheKeyForTree = require('calculate-cache-key-for-tree');

function addonBuildConfigForDataPackage(name) {
  return {
    name,

    isLocalBuild() {
      let appName = this.parent.pkg.name;

      return this.isDevelopingAddon() && appName === 'ember-data';
    },

    buildBabelOptions() {
      let existing = this.options.babel;
      if (!existing || !existing.plugins) {
        console.log(this.name, this.project.appName);
      }
      let customPlugins = require('./stripped-build-plugins')(
        process.env.EMBER_ENV,
        this.isLocalBuild()
      );
      let plugins = existing.plugins.map(plugin => {
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

    included(app) {
      this._super.included.apply(this, arguments);

      this._setupBabelOptions();
    },

    cacheKeyForTree(treeType) {
      return calculateCacheKeyForTree(treeType, this);
    },
  };
}

module.exports = addonBuildConfigForDataPackage;
