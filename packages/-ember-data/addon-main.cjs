'use strict';

const { addonShim } = require('@warp-drive/build-config/addon-shim.cjs');

const addon = addonShim(__dirname);
const pkg = require('./package.json');
if (pkg['ember-addon'].version === 1) {
  delete addon.treeForApp;
}

const included = addon.included;
addon.included = function includedIntercept() {
  // we access this as a side-effect to ember-cli will give us a super call
  const sup = this._super.included;
  if (this.hasBeenCalled) {
    return included?.apply(this, arguments);
  }
  this.hasBeenCalled = true;
  const app = this.app;
  const dirname = app.project.root;
  const { setConfig } = require('@warp-drive/build-config/cjs-set-config.cjs');
  setConfig(app, dirname, Object.assign({}, app.options?.emberData, { ___legacy_support: true }));
  return included?.apply(this, arguments);
};

module.exports = addon;
