module.exports = function getEnv() {
  const { EMBER_ENV, IS_TESTING, EMBER_CLI_TEST_COMMAND } = process.env;
  const PRODUCTION = EMBER_ENV === 'production';
  const DEBUG = !PRODUCTION;
  const TESTING = DEBUG || Boolean(EMBER_ENV === 'test' || IS_TESTING || EMBER_CLI_TEST_COMMAND);

  return {
    TESTING,
    PRODUCTION,
    DEBUG,
  };
};
