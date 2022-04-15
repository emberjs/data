'use strict';

const FilterImports = require.resolve('babel-plugin-filter-imports');
const StripClassCallCheck = require.resolve('babel6-plugin-strip-class-callcheck');

function isProduction(environment) {
  return /production/.test(environment);
}

module.exports = function (environment, app, compatVersion) {
  const isProd = isProduction(environment);
  let plugins = [];
  const DebugMacros = require('./debug-macros')(app, isProd, compatVersion);
  let postTransformPlugins = [];

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
