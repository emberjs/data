// eslint-disable-next-line node/no-unpublished-require
const customDotReporter = require('@ember-data/unpublished-test-infra/src/testem/custom-dot-reporter');

module.exports = {
  test_page: 'tests/index.html?hidepassed&nocontainer',
  disable_watching: true,
  reporter: customDotReporter,
  launch_in_ci: ['Chrome'],
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
