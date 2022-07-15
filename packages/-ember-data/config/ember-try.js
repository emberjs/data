'use strict';

const getChannelURL = require('ember-source-channel-url');

module.exports = function () {
  return Promise.all([getChannelURL('release'), getChannelURL('beta'), getChannelURL('canary')]).then((urls) => {
    return {
      useYarn: true,
      scenarios: [
        {
          name: 'with-ember-fetch-no-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': false }),
          },
          npm: {
            devDependencies: {
              'ember-fetch': '*',
              '@ember/jquery': null,
            },
          },
        },
        {
          name: 'with-ember-fetch-and-jquery',
          npm: {
            devDependencies: {
              'ember-fetch': '*',
              '@ember/jquery': '^2.0.0',
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
          npm: {
            devDependencies: {
              'ember-fetch': null,
              '@ember/jquery': '^2.0.0',
            },
          },
        },
        {
          name: 'ember-lts-4.4',
          npm: {
            devDependencies: {
              'ember-source': '~4.4.0',
            },
          },
        },
        {
          name: 'ember-lts-3.28',
          npm: {
            devDependencies: {
              'ember-source': '~3.28.0',
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
