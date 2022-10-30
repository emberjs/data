'use strict';

const StripClassCallCheck = require.resolve('babel6-plugin-strip-class-callcheck');

function isProduction(environment) {
  return /production/.test(environment);
}

module.exports = function (config) {
  let plugins = [];
  const DebugMacros = require('./debug-macros')(config);
  let postTransformPlugins = [];

  const environment = process.env.EMBER_ENV;
  const isProd = isProduction(environment);
  if (isProd) {
    postTransformPlugins.push([StripClassCallCheck]);
  }

  plugins.push(...DebugMacros);

  return { plugins, postTransformPlugins };
};
