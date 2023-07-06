/* eslint-disable node/no-unpublished-require */
'use strict';

const getChannelURL = require('ember-source-channel-url');

module.exports = function () {
  return Promise.all([getChannelURL('release'), getChannelURL('beta'), getChannelURL('canary')]).then((urls) => {
    return {
      usePnpm: true,
      scenarios: [
        {
          name: 'ember-lts-4.4',
          npm: {
            devDependencies: {
              'ember-source': '~4.4.0',
            },
          },
        },
        {
          name: 'ember-lts-4.8',
          npm: {
            devDependencies: {
              'ember-source': '~4.8.0',
            },
          },
        },
        {
          name: 'ember-lts-4.12',
          npm: {
            devDependencies: {
              'ember-source': '~4.12.3',
            },
          },
        },
        {
          name: 'ember-lts-3.28',
          npm: {
            devDependencies: {
              'ember-qunit': '^6.2.0',
              '@ember/test-helpers': '^2.9.4',
              'ember-source': '~3.28.0',
              'ember-cli': '~4.12.0',
            },
          },
        },
        {
          name: 'ember-release',
          npm: {
            devDependencies: {
              'ember-source': urls[0],
              '@glimmer/component': '^1.1.2',
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
