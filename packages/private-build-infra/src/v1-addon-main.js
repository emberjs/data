const path = require('path');

const Funnel = require('broccoli-funnel');

module.exports = module.exports = function (pkg) {
  return {
    name: pkg.name,

    options: {
      babel: {
        plugins: [require.resolve('./transforms/babel-plugin-transform-ext.js')],
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
};
