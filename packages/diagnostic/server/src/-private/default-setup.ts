import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

import { getBrowser, recommendedArgs } from './browsers/index.ts';
import { CustomDotReporter as DefaultReporter } from './reporters/default.ts';
import { getFlags } from './utils/get-flags.ts';

const CI_BROWSER = process.env.CI_BROWSER || 'chrome';
const BROWSER_TAG = CI_BROWSER.toLowerCase() as 'chrome';

const browser = await getBrowser(BROWSER_TAG as 'chrome' | 'chrome-beta' | 'chrome-canary');

let TEST_FAILURES: string | false;
try {
  const filePath = path.join(process.cwd(), './diagnostic-failed-test-log.txt');
  TEST_FAILURES = fs.readFileSync(filePath, { encoding: 'utf-8' });
} catch {
  TEST_FAILURES = false;
}
const FAILURES: string[] = TEST_FAILURES ? TEST_FAILURES.trim().split(',') : [];

// default 13min per-browser test suite run timeout in seconds
const DEFAULT_SUITE_TIMEOUT = 780;
// when using a configured timeout we adjust it down a bit to account for
// to make sure we cleanup before external things cleanup
const SUITE_TIMEOUT_BUFFER = 30;
const SUITE_TIMEOUT = process.env.SUITE_TIMEOUT
  ? Number(process.env.SUITE_TIMEOUT) - SUITE_TIMEOUT_BUFFER
  : DEFAULT_SUITE_TIMEOUT;

export interface LaunchConfig {
  /**
   * The browser to use for testing.
   *
   * Can also be set via process.env.CI_BROWSER
   *
   * @default 'chrome'
   */
  browser: 'chrome' | 'chrome-beta' | 'chrome-canary';
  /**
   * Whether to run the browser in headless mode.
   */
  headless: boolean;
  /**
   * Whether to enable debugging.
   *
   * @default false
   */
  debug: boolean;
  /**
   * Whether to use the cors middleware
   *
   * @default true
   */
  useCors: boolean;
  /**
   * Whether to keep the server running after tests complete.
   *
   * @default false
   */
  serve: boolean;
  /**
   * Whether to disable watching files for changes.
   *
   * @default false
   */
  noWatch: boolean;
  /**
   * Whether to prevent the browser from launching.
   *
   * @default false
   */
  noLaunch: boolean;
  /**
   * Whether to use an existing browser instance.
   *
   * @default true
   */
  useExisting: boolean;
  /**
   * The key file to use for the test server.
   *
   * @default process.env.HOLODECK_SSL_KEY_PATH
   */
  key: string | null;
  /**
   * The certificate file to use for the test server.
   *
   * @default process.env.HOLODECK_SSL_CERT_PATH
   */
  cert: string | null;
  /**
   * The hostname to use for the test server.
   *
   * @default 'localhost'
   */
  hostname: string;
  /**
   * The port to use for the test server.
   *
   * @default null - a number will be chosen automatically
   */
  port: number;
  /**
   * The default port to use for the test server.
   *
   * This functions as a fallback if no port is provided
   * and is primarily meant to be set by config wrappers.
   *
   * @default 7357
   */
  defaultPort: number;
  /**
   * Enable proxying requests to another server, useful
   * for testing against a local backend server.
   *
   * Valid configurations:
   *
   * 1. Simple proxy
   * - { '/api': 'https://localhost:3000' }
   * A request to /api will forward to https://localhost:3000/api
   * A request to /api/v1/users will forward to https://localhost:3000/api/v1/users
   *
   * 2. More advanced Scenarios
   * - Not implemented, open a feature request. We intend to match vite's use of http-proxy-3
   *
   * @default null
   */
  proxy: Record<string, string> | null;
  /**
   * The entry point for the test server.
   *
   * @default './dist-test/tests/index.html'
   */
  entry: string;
  /**
   * The resolved entry point for the test server.
   *
   * @internal
   */
  _realEntry: string | null;
  /**
   * The assets directory for the test server.
   *
   * @default './dist-test'
   */
  assets: string;
  /**
   * The number of parallel test segments
   * to run.
   *
   * @default 1
   */
  parallel: number;
  /**
   * The mode to use for parallel test execution.
   *
   * - 'window': Each test runs in a new window.
   * - 'tab': Each test runs in a new tab.
   * - 'browser': Each test runs in a new browser instance.
   *
   * @default 'window'
   */
  parallelMode: 'window' | 'tab' | 'browser';
  /**
   * Whether to retry failed tests.
   *
   * @default false
   */
  retry: boolean;
  /**
   * The filter to apply to tests.
   *
   * @default false
   */
  filter: string | false;
  /**
   * The reporter to use for test results.
   *
   * @default DefaultReporter
   */
  reporter: DefaultReporter;
  /**
   * The mode to use for test output.
   *
   * Can also be set via process.env.DIAGNOSTIC_REPORTER_MODE
   *
   * @default 'dot'
   */
  mode: 'dot' | 'compact' | 'verbose';
  /**
   * The timeout for each test suite (in seconds)
   *
   * Can also be set via process.env.SUITE_TIMEOUT
   *
   * A buffer of 30 seconds will be subtracted from the timeout
   * to ensure the process has time to complete any remaining tasks
   * and print any available results while shutting down.
   *
   * @default 810
   */
  suiteTimeout: number;
  /**
   * The timeout for browser disconnects (in seconds)
   *
   * @default 15
   */
  browserDisconnectTimeout: number;
  /**
   * The timeout for browser startup (in seconds)
   *
   * @default 15
   */
  browserStartTimeout: number;
  /**
   * The timeout for the websocket heartbeat (in seconds)
   *
   * @default 15
   */
  socketHeartbeatTimeout: number;
  /**
   * Setup when the diagnostic process is starting.
   *
   * This may return additional config to be merged with
   * the provided config.
   *
   * @default null
   */
  setup: (config: {
    port: number;
    hostname: string;
    protocol: 'http' | 'https';
  }) => void | { proxy?: LaunchConfig['proxy'] } | Promise<{ proxy?: LaunchConfig['proxy'] }>;
  /**
   * Cleanup when the diagnostic process is exiting.
   *
   * @default null
   */
  cleanup: () => void | Promise<void>;

  /**
   * Whether to simulate user events (e.g. clicks, typing) in the browser
   * via the devtools protocol.
   *
   * This allows for more realistic testing of user interactions.
   *
   * This feature is not yet implemented.
   *
   * @default false
   */
  useEventSimulation?: boolean;

  /**
   * The launchers to use for the test server.
   *
   * Each launcher is a separate browser instance that will be used to run the tests.
   *
   * Each launcher can be configured with the following options:
   * - command: The command to launch the browser.
   * - args: The arguments to pass to the browser.
   *
   * @default 'chrome' with recommended args
   */
  launchers: {
    [key in 'chrome' | 'chrome-beta' | 'chrome-canary']?: {
      command: string;
      args: string[];
    };
  };
}

export function launchDefaults(overrides: Partial<LaunchConfig> = {}): LaunchConfig {
  const flags = getFlags().filtered;
  Object.assign(overrides, flags);

  const RETRY_TESTS =
    ('retry' in overrides ? overrides.retry : (process.env.CI ?? process.env.RETRY_TESTS)) && FAILURES.length;
  const _parallel =
    process.env.DIAGNOSTIC_PARALLEL && !isNaN(Number(process.env.DIAGNOSTIC_PARALLEL))
      ? Number(process.env.DIAGNOSTIC_PARALLEL)
      : 1;
  const parallel = _parallel > 1 && RETRY_TESTS && FAILURES.length < _parallel * 4 ? 1 : _parallel;

  if (RETRY_TESTS) {
    console.log(
      chalk.grey(
        `⚠️ Retrying ${chalk.bold(chalk.yellow(FAILURES.length))} failed tests: ${chalk.bold(
          chalk.white(FAILURES.join(','))
        )}`
      )
    );
  } else if (FAILURES.length) {
    console.log(
      `⚠️ Found ${chalk.bold(chalk.yellow(FAILURES.length))} previously failed tests: ${chalk.bold(
        chalk.white(FAILURES.join(','))
      )}. Use RETRY_TESTS=1 or --retry/-r to retry them.`
    );
  }
  const DEBUG = Boolean(process.env.DEBUG ?? overrides.debug ?? false);

  const TEST_PAGE_FLAGS = [
    process.env.DEBUG_MEMORY ? 'memory=1' : false,
    process.env.CI || process.env.DEBUG_MEMORY ? 'hideReport=1' : false,
    process.env.DEBUG_PERFORMANCE ? 'performance=1' : false,
    DEBUG ? 'debug=1' : false,
    RETRY_TESTS ? `testId=${FAILURES.join('&testId=')}` : false,
  ].filter(Boolean);

  console.log(
    `\n\nLaunching with ${chalk.bold(chalk.cyan(CI_BROWSER))} (worker count ${chalk.bold(chalk.yellow(parallel))})\n\n`
  );

  const mode =
    (process.env.DIAGNOSTIC_REPORTER_MODE as 'dot' | 'compact' | 'verbose' | undefined) ?? overrides.mode ?? 'dot';

  return {
    browser: browser as 'chrome' | 'chrome-beta' | 'chrome-canary',
    retry: overrides.retry ?? false,
    mode,
    // flag config
    serve: overrides.serve ?? false,
    noWatch: overrides.noWatch ?? false,
    noLaunch: overrides.noLaunch ?? false,
    filter: overrides.filter ?? false,
    debug: overrides.debug ?? false,
    useCors: overrides.useCors ?? true,
    headless: overrides.headless ?? false,
    useExisting: overrides.useExisting ?? true,
    key: overrides.key ?? null,
    cert: overrides.cert ?? null,
    hostname: overrides.hostname ?? 'localhost',
    port: overrides.port ?? 0,
    defaultPort: overrides.defaultPort ?? 7357,
    _realEntry: null,

    /**
     * Enable proxying requests to another server, useful
     * for testing against a local backend server.
     *
     * Valid configurations:
     *
     * 1. Simple proxy
     * - { '/api': 'https://localhost:3000' }
     * A request to /api will forward to https://localhost:3000/api
     * A request to /api/v1/users will forward to https://localhost:3000/api/v1/users
     *
     * 2. More advanced Scenarios
     * - Not implemented, open a feature request. We intend to match vite's use of http-proxy-3
     */
    proxy: overrides.proxy ?? null,

    entry: overrides.entry ?? `./dist-test/tests/index.html?${TEST_PAGE_FLAGS.join('&')}`,
    assets: overrides.assets ?? './dist-test',
    parallel: overrides.parallel ?? parallel,
    parallelMode: overrides.parallelMode ?? 'window', // 'tab' | 'browser' | 'window'

    reporter: overrides.reporter ?? new DefaultReporter({ mode }),

    suiteTimeout: overrides.suiteTimeout ?? SUITE_TIMEOUT,
    browserDisconnectTimeout: overrides.browserDisconnectTimeout ?? 15,
    browserStartTimeout: overrides.browserStartTimeout ?? 15,
    socketHeartbeatTimeout: overrides.socketHeartbeatTimeout ?? 15,

    setup: overrides.setup ?? (() => {}),
    cleanup: overrides.cleanup ?? (() => {}),

    launchers: overrides.launchers ?? {
      [BROWSER_TAG]: {
        command: browser,
        args: recommendedArgs(BROWSER_TAG, overrides),
      },
    },
  };
}
