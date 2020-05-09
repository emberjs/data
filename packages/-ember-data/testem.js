const customDotReporter = require('@ember-data/unpublished-test-infra/src/testem/custom-dot-reporter');

const TestIE = process.env.TEST_IE11;
const TestSafari = process.env.TEST_SAFARI;

if (TestIE) {
  // eslint-disable-next-line no-console
  console.log('\n\nLaunching with IE\n\n');
}
if (TestSafari) {
  // eslint-disable-next-line no-console
  console.log('\n\nLaunching with Safari\n\n');
}

function browserPicker() {
  if (TestSafari) {
    return ['Safari'];
  }

  if (TestIE) {
    return ['IE'];
  }

  return ['Chrome'];
}

module.exports = {
  test_page: 'tests/index.html?hidepassed',
  disable_watching: true,
  reporter: customDotReporter,
  launch_in_ci: browserPicker(),
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
