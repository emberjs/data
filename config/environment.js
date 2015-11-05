'use strict';

module.exports = function(environment, appConfig) {
  const ENV = { };

  if (environment === 'testing') {
    ENV.EmberENV = {
      RAISE_ON_DEPRECATION: true,
      ENABLE_DS_FILTER: true
    };
  }

  return ENV;
};
