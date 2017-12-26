/* eslint-env node */
module.exports = {
  "framework": "qunit",
  "test_page": "tests/index.html?hidepassed",
  "disable_watching": true,
  "reporter": "dot",
  "launch_in_ci": [
    "Firefox",
    "Chrome"
  ],
  "launch_in_dev": [
    "Firefox",
    "Chrome"
  ],
};
