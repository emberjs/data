'use strict';

const { addonShim } = require('@warp-drive/build-config/addon-shim.cjs');

const addon = addonShim(__dirname);
const pkg = require('./package.json');
if (pkg['ember-addon'].version === 1) {
  delete addon.treeForApp;
}

function findApp(addon) {
  let current = addon;
  let app;

  // Keep iterating upward until we don't have a grandparent.
  // Has to do this grandparent check because at some point we hit the project.
  do {
    app = current.app || app;
  } while (current.parent.parent && (current = current.parent));

  return app;
}

const included = addon.included;
addon.included = function includedIntercept() {
  // we access this as a side-effect to ember-cli will give us a super call
  const sup = this._super.included;
  if (this.hasBeenCalled) {
    return included?.apply(this, arguments);
  }
  this.hasBeenCalled = true;
  const app = findApp(this);
  const dirname = app.project.root;
  const { setConfig } = require('@warp-drive/build-config/cjs-set-config.cjs');
  setConfig(app, dirname, Object.assign({}, app.options?.emberData, { ___legacy_support: true }));
  return included?.apply(this, arguments);
};

module.exports = addon;
