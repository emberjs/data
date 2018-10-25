'use strict';

const fs = require('fs');

const FilterImports = requireBabelPlugin('babel-plugin-filter-imports');
const FeatureFlags = requireBabelPlugin('babel-plugin-feature-flags');
const StripHeimdall = requireBabelPlugin('babel6-plugin-strip-heimdall');
const StripClassCallCheck = requireBabelPlugin('babel6-plugin-strip-class-callcheck');
const StripFilteredImports = requireBabelPlugin('./transforms/babel-plugin-remove-imports');
const TransformBlockScoping = requireBabelPlugin('@babel/plugin-transform-block-scoping');
const { isInstrumentedBuild } = require('./cli-flags');

function uniqueAdd(obj, key, values) {
  const a = (obj[key] = obj[key] || []);

  for (let i = 0; i < values.length; i++) {
    if (a.indexOf(values[i]) === -1) {
      a.push(values[i]);
    }
  }
}

// ensures that a `baseDir` property is present on the babel plugins
// that we will be using, this prevents ember-cli-babel/broccoli-babel-transpiler
// from opting out of caching (and printing a giant warning)
function requireBabelPlugin(packageName) {
  return require.resolve(packageName);
}

module.exports = function(environment) {
  let featuresJsonPath = __dirname + '/../config/features.json';
  let featuresJson = fs.readFileSync(featuresJsonPath, { encoding: 'utf8' });
  let features = JSON.parse(featuresJson);
  let filteredImports = {};

  // TODO explicitly set all features which are not enabled to `false`, so
  // they are stripped --> make this configurable or pass features
  //
  // for (let feature in features) {
  //   if (features[feature] !== true) {
  //     features[feature] = false;
  //   }
  // }

  let postTransformPlugins = [];
  let plugins = [
    [
      FeatureFlags,
      {
        import: { module: 'ember-data/-private/features' },
        features: features,
      },
    ],
  ];

  if (!isInstrumentedBuild()) {
    plugins.push([StripHeimdall]);
    uniqueAdd(filteredImports, 'ember-data/-debug', ['instrument']);
  } else {
    // eslint-disable-next-line no-console
    console.warn('NOT STRIPPING HEIMDALL');
  }

  if (/production/.test(environment) || isInstrumentedBuild()) {
    postTransformPlugins.push([StripClassCallCheck]);
    uniqueAdd(filteredImports, 'ember-data/-debug', ['assertPolymorphicType']);
  }

  plugins.push(
    [FilterImports, { imports: filteredImports }],
    [StripFilteredImports, filteredImports],
    [TransformBlockScoping, { throwIfClosureRequired: true }]
  );

  return { plugins, postTransformPlugins };
};
