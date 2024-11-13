import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { getBrowser, recommendedArgs } from './browsers/index.js';
import launch from './index.js';
import DefaultReporter from './reporters/default.js';
import { getFlags } from './utils/get-flags.js';

const CI_BROWSER = process.env.CI_BROWSER || 'Chrome';
const BROWSER_TAG = CI_BROWSER.toLowerCase();

const browser = await getBrowser(BROWSER_TAG);

let TEST_FAILURES;
try {
  const filePath = path.join(process.cwd(), './diagnostic-failed-test-log.txt');
  TEST_FAILURES = fs.readFileSync(filePath, { encoding: 'utf-8' });
} catch {
  TEST_FAILURES = false;
}
const FAILURES = TEST_FAILURES ? TEST_FAILURES.trim().split(',') : false;

// default 13min per-browser test suite run timeout in seconds
const DEFAULT_SUITE_TIMEOUT = 780;
// when using a configured timeout we adjust it down a bit to account for
// to make sure we cleanup before external things cleanup
const SUITE_TIMEOUT_BUFFER = 30;
const SUITE_TIMEOUT = process.env.SUITE_TIMEOUT
  ? Number(process.env.SUITE_TIMEOUT) - SUITE_TIMEOUT_BUFFER
  : DEFAULT_SUITE_TIMEOUT;

export default async function launchDefault(overrides = {}) {
  const flags = getFlags().filtered;
  Object.assign(overrides, flags);

  const RETRY_TESTS =
    ('retry' in overrides ? overrides.retry : process.env.CI ?? process.env.RETRY_TESTS) && FAILURES.length;
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

  await launch({
    // flag config
    serve: overrides.serve ?? false,
    noLaunch: overrides.noLaunch ?? false,
    filter: overrides.filter ?? false,
    debug: overrides.debug ?? false,
    headless: overrides.headless ?? false,
    useExisting: overrides.useExisting ?? false,

    entry: overrides.entry ?? `./dist-test/tests/index.html?${TEST_PAGE_FLAGS.join('&')}`,
    assets: overrides.assets ?? './dist-test',
    parallel: overrides.parallel ?? parallel,
    parallelMode: overrides.parallelMode ?? 'window', // 'tab' | 'browser' | 'window'

    reporter:
      overrides.reporter ??
      new DefaultReporter({
        mode: process.env.DIAGNOSTIC_REPORTER_MODE || 'dot', // 'dot' | 'compact' | 'verbose'
      }),

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
  });
}
