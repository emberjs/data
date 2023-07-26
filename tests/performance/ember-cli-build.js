/* eslint node/no-unpublished-require: 'off' */

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    fingerprint: {
      enabled: false,
    },
    emberData: {
      compatWith: '99',
    },
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  const { Webpack } = require('@embroider/webpack');
  const TerserPlugin = require('terser-webpack-plugin');

  return require('@embroider/compat').compatBuild(app, Webpack, {
    //
    // staticAddonTestSupportTrees: true,
    // staticAddonTrees: true,
    // staticHelpers: true,
    // staticModifiers: true,
    // staticComponents: true,
    // splitAtRoutes: ['route.name'], // can also be a RegExp
    packagerOptions: {
      webpackConfig: {
        optimization: {
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  ecma: 2022,
                  passes: 6, // slow, but worth it
                  negate_iife: false,
                  sequences: 30,
                  defaults: true,
                  arguments: false,
                  keep_fargs: false,
                  toplevel: false,
                  unsafe: true,
                  unsafe_comps: true,
                  unsafe_math: true,
                  unsafe_symbols: true,
                  unsafe_proto: true,
                  unsafe_undefined: true,
                  inline: 5,
                  reduce_funcs: false,
                },
                format: { beautify: true },
                toplevel: false,
                sourceMap: false,
                ecma: 2022,
              },
            }),
          ],
        },
      },
    },
    //
    extraPublicTrees: [],
  });
};
