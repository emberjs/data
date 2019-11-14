'use strict';

const FilterImports = require.resolve('babel-plugin-filter-imports');
const StripClassCallCheck = require.resolve('babel6-plugin-strip-class-callcheck');
const TransformBlockScoping = require.resolve('@babel/plugin-transform-block-scoping');
const uniqueAdd = require('./utilities/unique-add');

function isProduction(environment) {
  return /production/.test(environment);
}

module.exports = function(environment, app) {
  const isProd = isProduction(environment);
  let plugins = [];
  let filteredImports = {};
  const DebugMacros = require('./debug-macros')(app, isProd);
  let postTransformPlugins = [];

  if (isProd) {
    postTransformPlugins.push([StripClassCallCheck]);
    uniqueAdd(filteredImports, '@ember-data/store/-debug', ['assertPolymorphicType']);
  }

  plugins.push(
    [FilterImports, { imports: filteredImports }],
    [TransformBlockScoping, { throwIfClosureRequired: true }],
    ...DebugMacros
  );

  return { plugins, postTransformPlugins };
};
