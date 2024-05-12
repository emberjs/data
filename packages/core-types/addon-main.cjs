'use strict';

const { addonV1Shim } = require('@embroider/addon-shim');
const { version, name } = require('./package.json');

const addon = addonV1Shim(__dirname);
addon.options = addon.options || {};
addon.options['@embroider/macros'] = addon.options['@embroider/macros'] || {};
addon.options['@embroider/macros'].setOwnConfig = {
  PKG: { name, version },
};

module.exports = addon;
