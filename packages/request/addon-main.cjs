'use strict';

const Funnel = require('broccoli-funnel');
const path = require('path');

module.exports = {
  name: require('./package.json').name,

  treeForVendor() {},
  treeForPublic() {},
  treeForStyles() {},
  treeForAddonStyles() {},
  treeForApp() {},
  treeForAddon() {
    return this._super.treeForAddon.call(this, new Funnel(path.join(__dirname, 'dist')));
  },
};
