const customDotReporter = require('@ember-data/unpublished-test-infra/src/testem/custom-dot-reporter');

let BROWSER_PATHS = {};
try {
  // if puppeteer is available, use the chrome it provides
  BROWSER_PATHS.chrome = require('puppeteer').executablePath();
} catch (e) {}

const TestIE = process.env.TEST_IE11;

if (TestIE) {
  // eslint-disable-next-line no-console
  console.log('\n\nLaunching with IE\n\n');
}
module.exports = {
  test_page: 'tests/index.html?hidepassed',
  disable_watching: true,
  reporter: customDotReporter,
  launch_in_ci: TestIE ? ['IE'] : ['Chrome'],
  launch_in_dev: ['Chrome'],
  browser_start_timeout: 120,
  browser_paths: BROWSER_PATHS,
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
