'use strict';

const FilterImports = require.resolve('babel-plugin-filter-imports');
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
    let filteredImports = {
      '@ember-data/store/-debug': ['assertPolymorphicType'],
    };
    plugins.push([FilterImports, { imports: filteredImports }]);
  }

  plugins.push(...DebugMacros);

  return { plugins, postTransformPlugins };
};
