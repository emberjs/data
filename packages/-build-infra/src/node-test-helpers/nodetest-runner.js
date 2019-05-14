'use strict';
var glob = require('glob');
var Mocha = require('mocha');
var RSVP = require('rsvp');
var rimraf = require('rimraf');
var mochaOnlyDetector = require('mocha-only-detector');

var root = 'node-tests/{blueprints,acceptance,unit}';
var _checkOnlyInTests = RSVP.denodeify(
  mochaOnlyDetector.checkFolder.bind(null, root + '/**/*{-test}.js')
);

function addFiles(mocha, files) {
  files = typeof files === 'string' ? glob.sync(root + files) : files;
  files.forEach(mocha.addFile.bind(mocha));
}

function checkOnlyInTests() {
  // eslint-disable-next-line no-console
  console.log('Verifing `.only` in tests');
  return _checkOnlyInTests().then(function() {
    // eslint-disable-next-line no-console
    console.log('No `.only` found');
  });
}

function runMocha(mocha) {
  mocha.run(function(failures) {
    process.on('exit', function() {
      // eslint-disable-next-line no-process-exit
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

/* eslint-disable no-console, no-process-exit */
module.exports = function runNodeTests() {
  if (/^win/.test(require('os').platform())) {
    // don't run these tests in windows right now, they don't work
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }

  rimraf.sync('.node_modules-tmp');

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

  return ciVerificationStep()
    .then(function() {
      runMocha(mocha);
    })
    .catch(function(error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    });
};
