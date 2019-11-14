'use strict';

const FilterImports = require.resolve('babel-plugin-filter-imports');
const StripClassCallCheck = require.resolve('babel6-plugin-strip-class-callcheck');
const StripFilteredImports = require.resolve('./transforms/babel-plugin-remove-imports');
const TransformBlockScoping = require.resolve('@babel/plugin-transform-block-scoping');

function uniqueAdd(obj, key, values) {
  const a = (obj[key] = obj[key] || []);

  for (let i = 0; i < values.length; i++) {
    if (a.indexOf(values[i]) === -1) {
      a.push(values[i]);
    }
  }
}

function isProduction(environment) {
  return /production/.test(environment);
}

module.exports = function(environment) {
  let plugins = [];
  const DebugMacros = require('./debug-macros')(environment);
  let filteredImports = {};
  let postTransformPlugins = [];

  if (isProduction(environment)) {
    postTransformPlugins.push([StripClassCallCheck]);
    uniqueAdd(filteredImports, '@ember-data/store/-debug', ['assertPolymorphicType']);
  }

  plugins.push(
    [FilterImports, { imports: filteredImports }],
    [StripFilteredImports, filteredImports],
    [TransformBlockScoping, { throwIfClosureRequired: true }],
    ...DebugMacros
  );

  return { plugins, postTransformPlugins };
};
