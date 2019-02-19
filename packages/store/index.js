'use strict';

module.exports = {
  name: require('./package').name,

  buildBabelOptions() {
    let existing = this.options.babel;
    let customPlugins = require('./lib/stripped-build-plugins')(process.env.EMBER_ENV);
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
};
