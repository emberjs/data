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
  });

  app.import('node_modules/@warp-drive/diagnostic/dist/styles/dom-reporter.css');

  setConfig(app, __dirname, {
    deprecations: {
      DEPRECATE_STORE_EXTENDS_EMBER_OBJECT: false,
    },
  });

  const { Webpack } = require('@embroider/webpack');
  // const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
  // const path = require('path');

  return require('@embroider/compat').compatBuild(app, Webpack, {
    staticAddonTestSupportTrees: true,
    staticAddonTrees: true,
    staticHelpers: true,
    staticModifiers: true,
    staticComponents: true,
    staticEmberSource: true,
    // splitAtRoutes: [], // can also be a RegExp
    packagerOptions: {
      webpackConfig: {
        devtool: 'source-map',
        optimization: {
          // minimize: true,
          moduleIds: 'named',
        },
        plugins: [
          // new BundleAnalyzerPlugin({
          //   generateStatsFile: true,
          //   openAnalyzer: true,
          //   statsFilename: path.join(
          //     process.cwd(),
          //     'concat-stats-for',
          //     'my-stats.json',
          //   ),
          // }),
        ],
      },
    },
  });
};
