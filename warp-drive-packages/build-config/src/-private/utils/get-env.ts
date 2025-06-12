export function getEnv(forceMode?: 'testing' | 'production' | 'development' | 'debug'): {
  TESTING: boolean;
  PRODUCTION: boolean;
  DEBUG: boolean;
  IS_RECORDING: boolean;
  IS_CI: boolean;
  SHOULD_RECORD: boolean;
} {
  const FORCE_TESTING = forceMode === 'testing' || forceMode === 'development' || forceMode === 'debug';
  const FORCE_DEBUG = forceMode === 'development' || forceMode === 'debug';
  const FORCE_PRODUCTION = forceMode === 'production';

  const { EMBER_ENV, IS_TESTING, EMBER_CLI_TEST_COMMAND, NODE_ENV, CI, IS_RECORDING } = process.env;
  const PRODUCTION = FORCE_PRODUCTION || EMBER_ENV === 'production' || (!EMBER_ENV && NODE_ENV === 'production');
  const DEBUG = FORCE_DEBUG || !PRODUCTION;
  const TESTING = FORCE_TESTING || DEBUG || Boolean(EMBER_ENV === 'test' || IS_TESTING || EMBER_CLI_TEST_COMMAND);
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
