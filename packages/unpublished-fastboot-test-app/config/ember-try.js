'use strict';

module.exports = function () {
  return {
    useYarn: true,
    scenarios: [
      {
        name: 'fastboot-with-ember-fetch',
        npm: {
          devDependencies: {
            'ember-fetch': '^8.1.1',
          },
        },
      },
    ],
  };
};
