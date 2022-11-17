/* eslint node/no-unpublished-require: 'off' */

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

function _fixDeps(hash) {
  hash &&
    Object.keys(hash).forEach((key) => {
      let val = hash[key];
      if (val.startsWith('workspace:')) {
        hash[key] = val.replace('workspace:', '');
      }
    });
}

function fixDependencies(pkg) {
  _fixDeps(pkg.peerDependencies);
  _fixDeps(pkg.dependencies);
  return pkg;
}

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    // Add options here
    'ember-cli-babel': {
      enableTypeScriptTransform: true,
    },
  });

  const V1Addon = require('@embroider/compat').V1Addon;
  // const customHooks = ['treeForAddon', 'init', 'included', 'treeForAddonTestSupport', 'shouldIncludeChildAddon'];
  class DataAddon extends V1Addon {
    customizes(...names) {
      return super.customizes(...names);
      // return super.customizes(...names.filter((n) => !customHooks.includes(n)));
    }

    get packageJSON() {
      // active-model-adapter has an unstated peer dependency on ember-data. The
      // old build system allowed this kind of sloppiness, the new world does not.
      return fixDependencies(super.packageJSON);
    }
  }

  let compatAdapters = new Map();
  compatAdapters.set('ember-data', DataAddon);
  compatAdapters.set('@ember-data/store', DataAddon);
  compatAdapters.set('@ember-data/model', DataAddon);
  compatAdapters.set('@ember-data/adapter', DataAddon);
  compatAdapters.set('@ember-data/serializer', DataAddon);
  compatAdapters.set('@ember-data/record-data', DataAddon);
  compatAdapters.set('@ember-data/private-build-infra', DataAddon);
  compatAdapters.set('@ember-data/debug', DataAddon);

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
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],

    // Allows you to override how specific addons will build. Like:
    //
    //   import V1Addon from '@embroider/compat'; let compatAdapters = new Map();
    //   compatAdapters.set('some-addon', class extends V1Addon {// do stuff here:
    //   see examples in ./compat-adapters
    //   });
    //
    // This should be understood as a temporary way to keep yourself from getting
    // stuck, not an alternative to actually fixing upstream. For the most part,
    // the real solution will be converting the addon in question to natively
    // publish as v2.
    //
    // We ship with some default compatAdapters to fix otherwise incompatible
    // behaviors in popular addons. You can override the default adapters by
    // setting your own value here (including null to completely disable it).
    compatAdapters,
  });
};
