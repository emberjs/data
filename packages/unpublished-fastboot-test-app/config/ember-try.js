'use strict';

module.exports = function() {
  return {
    useYarn: true,
    scenarios: [
      {
        name: 'fastboot-with-ember-fetch',
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
        name: 'fastboot-with-jquery',
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
    ],
  };
};
