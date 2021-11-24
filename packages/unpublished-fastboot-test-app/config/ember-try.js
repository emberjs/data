'use strict';

module.exports = function () {
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
            'ember-fetch': '*',
            '@ember/jquery': null,
          },
        },
      },
      {
        name: 'fastboot-with-jquery',
        npm: {
          devDependencies: {
            'ember-fetch': null,
            '@ember/jquery': '^1.1.0',
            najax: '^1.0.4',
          },
        },
      },
    ],
  };
};
