var concat    = require('broccoli-concat');
var pickFiles = require('broccoli-static-compiler');
var jshint    = require('broccoli-jshint');
var path      = require('path');
var wrap      = require('broccoli-wrap');
var merge     = require('broccoli-merge-trees');
var amdBuild  = require('./amd-build');

module.exports = function testTree(sourceTree, compiled) {
  var emberDataFiles = pickFiles(sourceTree, {
    files: ['**/{ember-data,activemodel-adapter}/**/*.js'],
    srcDir: '/',
    destDir: '/'
  });

  var hinted = hint(emberDataFiles);
  var testFiles = pickFiles(compiled, {
    srcDir: '/',
    destDir: '/',
    files: ['**/*/tests/**/*.js']
  });

  var allTestFiles = merge([hinted, testFiles]);

  return concat(allTestFiles, {
    inputFiles: ['**/*.js'],
    outputFile: '/ember-data-tests.js',
    wrapInEval: true,
    wrapInFunction: false
  });
};

function hint(tree){
  var jshinted = jshint(tree, {
    jshintrcPath: path.join(__dirname, '..', '.jshintrc')
  });
  return wrap(jshinted, {
    wrapper: [ "if (!QUnit.urlParams.nojshint) {\n", "\n}"],
  });
}
