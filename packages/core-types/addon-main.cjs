'use strict';

const { addonShim } = require('@warp-drive/build-config/addon-shim.cjs');
const { version, name } = require('./package.json');

const addon = addonShim(__dirname);
addon.options = addon.options || {};
addon.options['@embroider/macros'] = addon.options['@embroider/macros'] || {};
addon.options['@embroider/macros'].setOwnConfig = {
  PKG: { name, version },
};

module.exports = addon;
