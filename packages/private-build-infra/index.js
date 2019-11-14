function getApp(addon) {
  while (addon && !addon.app) {
    addon = addon.parent;
  }
  if (!addon) {
    throw new Error(`Unable to find the parent application`);
  }
  return addon.app;
}

module.exports = {
  name: require('./package').name,
  treeFor() {
    // Nested addons don't call isEnabled automatically,
    // So this ensures that we return empty trees whenever
    // we are not enabled.
    if (this.isEnabled()) {
      return this._super.treeFor.call(this, ...arguments);
    }
  },
  isEnabled() {
    if (this.__isEnabled !== undefined) {
      return this.__isEnabled;
    }
    const env = getApp(this).env;

    this.__isEnabled = env !== 'production';

    return this.__isEnabled;
  },
};
