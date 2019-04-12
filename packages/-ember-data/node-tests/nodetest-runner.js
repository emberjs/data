'use strict';

/* eslint-disable no-console, no-process-exit */

if (/^win/.test(require('os').platform())) {
  // don't run these tests in windows right now, they don't work
  process.exit(0);
}

var glob = require('glob');
var Mocha = require('mocha');
var RSVP = require('rsvp');
var rimraf = require('rimraf');
var mochaOnlyDetector = require('mocha-only-detector');

rimraf.sync('.node_modules-tmp');

var root = 'node-tests/{blueprints,acceptance,unit}';
var _checkOnlyInTests = RSVP.denodeify(
  mochaOnlyDetector.checkFolder.bind(null, root + '/**/*{-test}.js')
);
var optionOrFile = process.argv[2];
var mocha = new Mocha({
  timeout: 5000,
  reporter: 'spec',
});
var testFiles = glob.sync(root + '/**/*-test.js');

if (optionOrFile === 'all') {
  addFiles(mocha, testFiles);
  addFiles(mocha, 'node-tests/**/*-test.js');
  addFiles(mocha, '/**/*-test-slow.js');
} else if (process.argv.length > 2) {
  addFiles(mocha, process.argv.slice(2));
} else {
  addFiles(mocha, testFiles);
}

function addFiles(mocha, files) {
  files = typeof files === 'string' ? glob.sync(root + files) : files;
  files.forEach(mocha.addFile.bind(mocha));
}

function checkOnlyInTests() {
  console.log('Verifing `.only` in tests');
  return _checkOnlyInTests().then(function() {
    console.log('No `.only` found');
  });
}

function runMocha() {
  mocha.run(function(failures) {
    process.on('exit', function() {
      process.exit(failures);
    });
  });
}

function ciVerificationStep() {
  if (process.env.CI === 'true') {
    return checkOnlyInTests();
  } else {
    return RSVP.Promise.resolve();
  }
}

ciVerificationStep()
  .then(function() {
    runMocha();
  })
  .catch(function(error) {
    console.error(error);
    process.exit(1);
  });
