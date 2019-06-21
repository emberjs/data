module.exports = {
  timeout: 5000,
  reporter: 'spec',
  spec: [
    'node-tests/blueprints/**/*-test.js',
    'node-tests/acceptance/**/*-test.js',
    'node-tests/unit/**/*-test.js',
  ],
};
