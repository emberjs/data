'use strict';

const getChannelURL = require('ember-source-channel-url');

module.exports = function() {
  return Promise.all([getChannelURL('release'), getChannelURL('beta'), getChannelURL('canary')]).then(urls => {
    return {
      useYarn: true,
      scenarios: [
        {
          name: 'with-max-transpilation',
          env: {
            TARGET_IE11: true,
          },
          npm: {},
        },
        {
          name: 'with-ember-fetch-no-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': false }),
          },
          npm: {
            devDependencies: {
              'ember-fetch': '^6.5.1',
              '@ember/jquery': null,
            },
          },
        },
        {
          name: 'with-ember-fetch-and-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true }),
          },
          npm: {
            devDependencies: {
              'ember-fetch': '^6.5.1',
              '@ember/jquery': '^1.1.0',
            },
          },
        },
        {
          name: 'with-native-fetch',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': false }),
          },
          npm: {
            devDependencies: {
              'ember-fetch': null,
              '@ember/jquery': null,
            },
          },
        },
        {
          name: 'with-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true }),
          },
          npm: {
            devDependencies: {
              'ember-fetch': null,
              '@ember/jquery': '^1.1.0',
            },
          },
        },
        {
          name: 'ember-lts-3.12',
          npm: {
            devDependencies: {
              'ember-source': '~3.12.0',
            },
          },
        },
        {
          name: 'ember-lts-3.16',
          npm: {
            devDependencies: {
              'ember-source': '~3.16.0',
            },
          },
        },
        {
          name: 'ember-release',
          npm: {
            devDependencies: {
              'ember-source': urls[0],
            },
          },
        },
        {
          name: 'ember-beta',
          npm: {
            devDependencies: {
              'ember-source': urls[1],
            },
          },
        },
        {
          name: 'ember-canary',
          npm: {
            devDependencies: {
              'ember-source': urls[2],
            },
          },
        },
      ],
    };
  });
};
