'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { maybeEmbroider } = require('@embroider/test-setup');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config');

  let app = new EmberApp(defaults, {});

  /**
   * TODO: find another way to set this config,
   *       because the most modern of apps will not have a compat build
   */
  setConfig(app, __dirname, {
    compatWith: process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null,
  });

  return maybeEmbroider(app);
};
