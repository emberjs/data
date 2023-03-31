/* eslint-disable node/no-unpublished-require */
const customDotReporter = require('@ember-data/unpublished-test-infra/src/testem/custom-dot-reporter');

// eslint-disable-next-line no-console
console.log(`\n\nLaunching with ${process.env.TESTEM_CI_LAUNCHER || 'Chrome'}\n\n`);

module.exports = {
  test_page: 'tests/index.html?hidepassed&nocontainer',
  disable_watching: true,
  reporter: customDotReporter,
  launch_in_ci: [process.env.TESTEM_CI_LAUNCHER || 'Chrome'],
  launch_in_dev: [process.env.TESTEM_CI_LAUNCHER || 'Chrome'],
  tap_quiet_logs: true,
  browser_disconnect_timeout: 45,
  browser_start_timeout: 45,
  socket_heartbeat_timeout: 75, // test timeout is 60s, so this needs to be longer
  browser_reconnect_limit: 10,
  socket_server_options: {
    maxHttpBufferSize: 10e7,
  },
  browser_args: {
    Chrome: {
      ci: [
        '--headless',
        '--no-sandbox',
        // '--enable-logging',

        // this may help debug CI in some situations
        // '--enable-logging',

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
        '--disable-3d-apis',
        '--disable-software-rasterizer',
        '--disable-webgl',
        '--disable-remote-fonts',
        '--blink-settings=imagesEnabled=false',
        '--mute-audio',

        // ubuntu-16-core seems to be unhappy with this being set to a non-zero port
        // throws: ERROR:socket_posix.cc(147)] bind() failed: Address already in use (98)
        '--remote-debugging-port=0',
        '--remote-debugging-address=0.0.0.0',
        '--window-size=1440,900',
        '--proxy-bypass-list=*',
        "--proxy-server='direct://'",
      ].filter(Boolean),
      dev: [
        '--headless',
        '--no-sandbox',

        // this may help debug in some situations
        // '--enable-logging',

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
        '--disable-3d-apis',
        '--disable-software-rasterizer',
        '--disable-webgl',
        '--disable-remote-fonts',
        '--blink-settings=imagesEnabled=false',
        '--mute-audio',

        '--remote-debugging-port=9222',
        '--remote-debugging-address=0.0.0.0',
        '--window-size=1440,900',
        '--proxy-bypass-list=*',
        "--proxy-server='direct://'",
      ].filter(Boolean),
    },
    Firefox: {
      ci: ['--headless', '--width=1440', '--height=900'],
      dev: ['--headless', '--width=1440', '--height=900'],
    },
  },
};
