'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { compatBuild } = require('@embroider/compat');

module.exports = async function (defaults) {
  const { buildOnce } = await import('@embroider/vite');
  const { setConfig } = await import('@warp-drive/build-config');
  const app = new EmberApp(defaults, {});

  setConfig(app, __dirname, {
    compatWith: '99',
    debug: {
      // LOG_NOTIFICATIONS: true,
      // LOG_INSTANCE_CACHE: true,
      // LOG_METRIC_COUNTS: true,
      // __INTERNAL_LOG_NATIVE_MAP_SET_COUNTS: true,
      // DEBUG_RELATIONSHIP_NOTIFICATIONS: true,
    },
  });

  return compatBuild(app, buildOnce);
};
