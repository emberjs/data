'use strict';

const fs = require('fs');

const FilterImports = require.resolve('babel-plugin-filter-imports');
const FeatureFlags = require.resolve('babel-plugin-feature-flags');
const StripClassCallCheck = require.resolve('babel6-plugin-strip-class-callcheck');
const StripFilteredImports = require.resolve('./transforms/babel-plugin-remove-imports');
const TransformBlockScoping = require.resolve('@babel/plugin-transform-block-scoping');
const { isInstrumentedBuild, wantsEnabledFeatures, getManuallyEnabledFeatures } = require('./cli-flags');

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

module.exports = function(environment, isLocalBuild) {
  let flagsJsonPath = __dirname + '/../config/in-progress-features.json';
  let flagsJson = fs.readFileSync(flagsJsonPath, { encoding: 'utf8' });
  let inProgressFlags = JSON.parse(flagsJson);
  let filteredImports = {};
  let allowInProgressFeatures = isLocalBuild === true && wantsEnabledFeatures();
  let manuallyEnabled = isLocalBuild ? getManuallyEnabledFeatures() : {};
  let enabledFlags = [];
  let allFlags = Object.assign({}, inProgressFlags, manuallyEnabled);

  for (let flag in allFlags) {
    let state = inProgressFlags[flag];
    /*
     Default anything not `true` (e.g. `null`) feature to `false`
     unless this is a local build and we've set the flags
     to enable something.
    */
    if (manuallyEnabled[flag]) {
      if (state === true) {
        // eslint-disable-next-line no-console
        console.warn('You specified the in-progress-feature "' + flag + '" but it was already active');
      } else if (state === undefined) {
        throw new Error('You specified the in-progress-feature "' + flag + '" but no such flag exists!');
      } else {
        // eslint-disable-next-line no-console
        console.warn('Manually Actived in-progress-feature: ' + flag);
      }
      inProgressFlags[flag] = true;
    } else if (allowInProgressFeatures && state === null) {
      enabledFlags.push(flag);
      inProgressFlags[flag] = true;
    } else if (state !== true) {
      inProgressFlags[flag] = false;
    }
  }

  if (allowInProgressFeatures) {
    if (enabledFlags.length) {
      // eslint-disable-next-line no-console
      console.warn(
        'Enabled the following in-progress-features that specified `null` as their state for this build: ["' +
          enabledFlags.join(', ') +
          '"]'
      );
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        'Attempted to enable all in-progress-features that specify `null` as their state for this build, but there were none.'
      );
    }
  }

  let postTransformPlugins = [];
  let plugins = [
    [
      FeatureFlags,
      {
        import: { module: 'ember-data/-private/features' },
        features: inProgressFlags,
      },
    ],
  ];

  if (isProduction(environment) || isInstrumentedBuild()) {
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
