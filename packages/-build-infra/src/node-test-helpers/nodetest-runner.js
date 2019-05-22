'use strict';
var glob = require('glob');
var Mocha = require('mocha');
var rimraf = require('rimraf');

var root = 'node-tests/{blueprints,acceptance,unit}';

function addFiles(mocha, files) {
  files = typeof files === 'string' ? glob.sync(root + files) : files;
  files.forEach(mocha.addFile.bind(mocha));
}

function runMocha(mocha) {
  mocha.run(function(failures) {
    process.on('exit', function() {
      // eslint-disable-next-line no-process-exit
      process.exit(failures);
    });
  });
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

  return runMocha(mocha);
};
