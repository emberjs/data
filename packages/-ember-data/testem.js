const customDotReporter = require('@ember-data/unpublished-test-infra/src/testem/custom-dot-reporter');

const BrowserLauncher = process.env.TESTEM_CI_LAUNCHER || 'Chrome';
// eslint-disable-next-line no-console
console.log(`\n\nLaunching with ${BrowserLauncher}\n\n`);

module.exports = {
  test_page: 'tests/index.html?hidepassed',
  disable_watching: true,
  reporter: customDotReporter,
  launch_in_ci: [BrowserLauncher],
  launch_in_dev: ['Chrome'],
  browser_start_timeout: 120,
  browser_args: {
    Chrome: {
      ci: [
        '--headless',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--remote-debugging-port=0',
        '--window-size=1440,900',
        '--no-sandbox',
      ],
    },
  },
};
