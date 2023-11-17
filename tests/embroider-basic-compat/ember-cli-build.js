/* eslint n/no-unpublished-require: 'off' */

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    // Add options here
    'ember-cli-babel': {
      enableTypeScriptTransform: true,
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
  return require('@embroider/compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
    compatAdapters: new Map([
      ['@ember-data/active-record', null],
      ['@ember-data/adapter', null],
      ['@ember-data/debug', null],
      ['@ember-data/graph', null],
      ['@ember-data/json-api', null],
      ['@ember-data/legacy-compat', null],
      ['@ember-data/model', null],
      ['@ember-data/record-data', null],
      ['@ember-data/request-utils', null],
      ['@ember-data/request', null],
      ['@ember-data/rest', null],
      ['@ember-data/serializer', null],
      ['@ember-data/store', null],
      ['@ember-data/tracking', null],
      ['ember-data', null],
    ]),
  });
};
