'use strict';

module.exports = function(environment, appConfig) {
  const ENV = { };

  if (environment === 'testing') {
    ENV.RAISE_ON_DEPRECATION = true;
    ENV.ENABLE_DS_FILTER = true;
  }

  return ENV;
};
