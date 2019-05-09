'use strict';

const getChannelURL = require('ember-source-channel-url');

module.exports = function() {
  return Promise.all([getChannelURL('release'), getChannelURL('beta'), getChannelURL('canary')]).then(urls => {
    return {
      useYarn: true,
      scenarios: [
        {
          name: 'default',
          npm: {},
        },
        {
          name: 'with-ember-fetch',
          npm: {
            devDependencies: {
              'ember-fetch': '^6.5.1',
            },
          },
        },
        {
          name: 'with-max-transpilation',
          env: {
            TARGET_IE11: true,
          },
          npm: {},
        },
        {
          name: 'default-with-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true }),
          },
          npm: {},
        },
        {
          name: 'ember-lts-3.8',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true }),
          },
          npm: {
            devDependencies: {
              '@ember/jquery': '^0.6.0',
              'ember-source': '~3.8.0',
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
          name: 'ember-release-with-jquery',
          env: {
            EMBER_OPTIONAL_FEATURES: JSON.stringify({ 'jquery-integration': true }),
          },
          npm: {
            devDependencies: {
              '@ember/jquery': '^0.6.0',
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
