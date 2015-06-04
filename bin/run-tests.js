#!/usr/bin/env node

var RSVP  = require('rsvp');
var spawn = require('child_process').spawn;
var chalk = require('chalk');
var packages = require('../lib/packages');
var runInSequence = require('../lib/run-in-sequence');

function shouldPrint(inputString) {
  var skipStrings = [
    "*** WARNING: Method userSpaceScaleFactor",
    "CoreText performance note:",
  ];

  for (var i = 0; i < skipStrings.length; i++) {
    if (inputString.indexOf(skipStrings[i])) {
      return false;
    }
  }

  return true;
}

function run(queryString) {
  return new RSVP.Promise(function(resolve, reject) {
    var args = [
      'bower_components/qunit-phantom-runner/runner.js',
      './dist/tests/index.html?' + queryString
    ];

    console.log('Running: phantomjs ' + args.join(' '));

    var child = spawn('phantomjs', args);
    var result = {output: [], errors: [], code: null};

    child.stdout.on('data', function (data) {
      var string = data.toString();
      var lines = string.split('\n');

      lines.forEach(function(line) {
        if (line.indexOf('0 failed.') > -1) {
          console.log(chalk.green(line));
        } else {
          console.log(line);
        }
      });
      result.output.push(string);
    });

    child.stderr.on('data', function (data) {
      var string = data.toString();

      if (shouldPrint(string)) {
        result.errors.push(string);
        console.error(chalk.red(string));
      }
    });

    child.on('close', function (code) {
      result.code = code;

      if (code === 0) {
        resolve(result);
      } else {
        reject(result);
      }
    });
  });
}

var testFunctions = [];
var emberChannel = process.env.EMBER_CHANNEL || 'release';
var runnningInCI = process.env.CI || false;

testFunctions.push(function() {
  return run('emberchannel=' + emberChannel);
});

if (runnningInCI) {
  testFunctions.push(function() {
    return run('dist=min&emberchannel=' + emberChannel);
  });
  testFunctions.push(function() {
    return run('dist=prod&emberchannel=' + emberChannel);
  });
}

runInSequence(testFunctions)
  .then(function() {
    console.log(chalk.green('Passed!'));
    process.exit(0);
  })
  .catch(function(e) {
    console.error(e);
    console.error(chalk.red('Failed!'));
    process.exit(1);
  });
