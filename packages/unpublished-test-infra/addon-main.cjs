'use strict';

const { addonV1Shim } = require('@embroider/addon-shim');

const addon = addonV1Shim(__dirname);
addon.options = addon.options || {};
addon.options['@embroider/macros'] = addon.options['@embroider/macros'] || {};
addon.options['@embroider/macros'].setOwnConfig = {
  VERSION: require('./package.json').version,
  ASSERT_ALL_DEPRECATIONS: Boolean(process.env.ASSERT_ALL_DEPRECATIONS),
};

module.exports = addon;
