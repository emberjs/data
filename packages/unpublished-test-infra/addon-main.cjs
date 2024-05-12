'use strict';

const { addonShim } = require('@warp-drive/build-config/addon-shim');

const addon = addonShim(__dirname);
addon.options = addon.options || {};
addon.options['@embroider/macros'] = addon.options['@embroider/macros'] || {};
addon.options['@embroider/macros'].setOwnConfig = {
  VERSION: require('./package.json').version,
  ASSERT_ALL_DEPRECATIONS: Boolean(process.env.ASSERT_ALL_DEPRECATIONS),
};

module.exports = addon;
