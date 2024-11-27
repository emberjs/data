'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = async function (defaults) {
  const { setConfig } = await import('@warp-drive/build-config');
  const { macros } = await import('@warp-drive/build-config/babel-macros');

  const app = new EmberApp(defaults, {
    babel: {
      // this ensures that the same build-time code stripping that is done
      // for library packages is also done for our tests and dummy app
      plugins: [...macros()],
    },
    'ember-cli-babel': {
      throwUnlessParallelizable: true,
      enableTypeScriptTransform: true,
    },
  });

  setConfig(app, __dirname, {
    compatWith: process.env.EMBER_DATA_FULL_COMPAT ? '99.0' : null,
    deprecations: {
      DISABLE_6X_DEPRECATIONS: false,
    },
  });

  app.import('node_modules/@warp-drive/diagnostic/dist/styles/dom-reporter.css');

  return app.toTree();
};
