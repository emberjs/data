export function getEnv(): {
  TESTING: boolean;
  PRODUCTION: boolean;
  DEBUG: boolean;
  IS_RECORDING: boolean;
  IS_CI: boolean;
  SHOULD_RECORD: boolean;
} {
  const { EMBER_ENV, IS_TESTING, EMBER_CLI_TEST_COMMAND, NODE_ENV, CI, IS_RECORDING } = process.env;
  const PRODUCTION = EMBER_ENV === 'production' || (!EMBER_ENV && NODE_ENV === 'production');
  const DEBUG = !PRODUCTION;
  const TESTING = DEBUG || Boolean(EMBER_ENV === 'test' || IS_TESTING || EMBER_CLI_TEST_COMMAND);
  const SHOULD_RECORD = Boolean(!CI || IS_RECORDING);

  return {
    TESTING,
    PRODUCTION,
    DEBUG,
    IS_RECORDING: Boolean(IS_RECORDING),
    IS_CI: Boolean(CI),
    SHOULD_RECORD,
  };
}
