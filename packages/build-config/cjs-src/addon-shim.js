'use strict';

export function addonShim(dirName, options) {
  const path = require('path');
  const pkg = require(path.join(dirName, './package.json'));

  const isV2Addon = pkg['ember-addon']?.version === 2;
  if (isV2Addon) {
    const { addonV1Shim } = require('@embroider/addon-shim');
    return addonV1Shim(dirName, options);
  }

  const Funnel = require('broccoli-funnel');
  return {
    name: pkg.name,

    treeForVendor() {},
    treeForPublic() {},
    treeForStyles() {},
    treeForAddonStyles() {},
    treeForApp() {},
    treeForAddon() {
      return this._super.treeForAddon.call(this, new Funnel(path.join(dirname, 'dist')));
    },
  };
}
