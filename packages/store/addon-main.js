const path = require('path');

const Funnel = require('broccoli-funnel');

const pkg = require('./package.json');

module.exports = {
  name: pkg.name,

  options: {
    babel: {
      plugins: [require.resolve('@ember-data/private-build-infra/src/transforms/babel-plugin-transform-ext.js')],
    },
  },

  treeForAddon() {
    const assetDir = path.join(__dirname, './dist');
    return this._super.treeForAddon.call(this, new Funnel(assetDir, { include: ['**/*.js'] }));
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
