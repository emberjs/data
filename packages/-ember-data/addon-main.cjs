'use strict';

const { addonShim } = require('@warp-drive/build-config/addon-shim.cjs');

const addon = addonShim(__dirname);
addon.options = addon.options || {};
addon.options['@embroider/macros'] = addon.options['@embroider/macros'] || {};
const pkg = require('./package.json');
addon.options['@embroider/macros'].setOwnConfig = {
  VERSION: pkg.version,
};
if (pkg['ember-addon'].version === 1) {
  delete addon.treeForApp;
}

module.exports = addon;
