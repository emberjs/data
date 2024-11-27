/* eslint-disable n/no-unpublished-require */
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const TestemReporter = require('./custom-dot-reporter');

let TEST_FAILURES;
try {
  const filePath = path.join(__dirname, '../failed-test-log.txt');
  TEST_FAILURES = fs.readFileSync(filePath, { encoding: 'utf-8' });
} catch {
  TEST_FAILURES = false;
}
const FAILURES = TEST_FAILURES ? TEST_FAILURES.trim().split(',') : false;
if (FAILURES) {
  console.log(`Retrying ${FAILURES.length} failed tests: ${FAILURES.join(',')}`);
}

console.log(
  `\n\nLaunching with ${process.env.CI_BROWSER || 'Chrome'} (worker count ${
    process.env.EMBER_EXAM_SPLIT_COUNT || process.env.EXAM_PARALLEL_COUNT || 1
  })\n\n`
);
const TEST_PAGE_FLAGS = [
  'hidepassed',
  'nocontainer',
  process.env.DEBUG_MEMORY ? 'debugMemory' : false,
  process.env.CI || process.env.DEBUG_MEMORY ? 'disableHtmlReporter' : false,
  process.env.DEBUG_PERFORMANCE ? 'debugPerformance' : false,
  process.env.GC_BREATHE_TIME ? `gcBreatheTime=${process.env.GC_BREATHE_TIME}` : false,
  FAILURES ? `testId=${FAILURES.join('&testId=')}` : false,
].filter(Boolean);

// default 10min per-browser test suite run timeout in seconds
const DEFAULT_BROWSER_TIMEOUT = 600;
// when using a configured timeout we adjust it down a bit to account for
// to make sure we cleanup before external things cleanup
const BROWSER_TIMEOUT_BUFFER = 30;
const BROWSER_TIMEOUT = process.env.BROWSER_TIMEOUT
  ? Number(process.env.BROWSER_TIMEOUT) - BROWSER_TIMEOUT_BUFFER
  : DEFAULT_BROWSER_TIMEOUT;

module.exports = {
  framework: 'qunit',
  test_page: `tests/index.html?${TEST_PAGE_FLAGS.join('&')}`,
  disable_watching: true,
  launch_in_ci: [process.env.CI_BROWSER || 'Chrome'],
  launch_in_dev: ['Chrome'],
  tap_quiet_logs: true,
  // timeout for the total suite run in this browser in seconds
  timeout: BROWSER_TIMEOUT,

  // these may help debug CI in some situations
  // debug: true,
  // chrome_stderr_info_only: true,
  reporter: TestemReporter,
  parallel: process.env.EMBER_EXAM_SPLIT_COUNT || process.env.EXAM_PARALLEL_COUNT,
  browser_disconnect_timeout: 45,
  browser_start_timeout: 45,
  client_decycle_depth: 10,
  socket_heartbeat_timeout: 75, // test timeout is 60s, so this needs to be longer
  browser_reconnect_limit: 10,
  // See https://github.com/testem/testem/issues/1021#issuecomment-1186607152
  socket_server_options: {
    maxHttpBufferSize: 10e7,
  },
  browser_args: {
    Chrome: {
      ci: [
        '--headless=new',
        '--no-sandbox',

        // this may help debug CI in some situations
        '--enable-logging=stderr',
        '--v=1',

        // when debugging memory usage this gives us better data
        process.env.DEBUG_MEMORY ? '--enable-precise-memory-info' : false,
        process.env.DEBUG_MEMORY ? '--js-flags="--allow-natives-syntax --expose-gc"' : false,

        // these prevent user account
        // and extensions from mucking with things
        '--incognito',
        '--bwsi',

        // On Ubuntu this dev-shm-usage speeds you up on bigger machines
        // and slows you down on smaller. We are on a bigger CI box now.
        // '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-translate',
        '--disable-3d-apis',
        '--disable-software-rasterizer',
        '--disable-webgl',
        // '--disable-web-security',
        '--disable-remote-fonts',
        '--blink-settings=imagesEnabled=false',
        '--mute-audio',

        // ubuntu-16-core seems to be unhappy with this being set to a non-zero port
        // throws: ERROR:socket_posix.cc(147)] bind() failed: Address already in use (98)
        '--remote-debugging-port=0',
        '--remote-debugging-address=0.0.0.0',
        '--window-size=1440,900',
        '--no-proxy-server',
        '--proxy-bypass-list=*',
        "--proxy-server='direct://'",
      ].filter(Boolean),
      dev: [
        '--headless=new',
        '--no-sandbox',

        // this may help debug CI in some situations
        '--enable-logging=stderr',
        '--v=1',

        // when debugging memory usage this gives us better data
        process.env.DEBUG_MEMORY ? '--enable-precise-memory-info' : false,
        process.env.DEBUG_MEMORY ? '--js-flags="--allow-natives-syntax --expose-gc"' : false,

        // these prevent user account
        // and extensions from mucking with things
        '--incognito',
        '--bwsi',

        // On Ubuntu this dev-shm-usage speeds you up on bigger machines
        // and slows you down on smaller. We are on a bigger CI box now.
        // '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-translate',
        '--disable-3d-apis',
        '--disable-software-rasterizer',
        '--disable-webgl',
        // '--disable-web-security',
        '--disable-remote-fonts',
        '--blink-settings=imagesEnabled=false',
        '--mute-audio',

        // ubuntu-16-core seems to be unhappy with this being set to a non-zero port
        // throws: ERROR:socket_posix.cc(147)] bind() failed: Address already in use (98)
        '--remote-debugging-port=0',
        '--remote-debugging-address=0.0.0.0',
        '--window-size=1440,900',
        '--no-proxy-server',
        '--proxy-bypass-list=*',
        "--proxy-server='direct://'",
      ],
    },
  },
};
