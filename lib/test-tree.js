var concat    = require('broccoli-sourcemap-concat');
var pickFiles = require('broccoli-static-compiler');
var jshint    = require('broccoli-jshint');
var path      = require('path');
var wrap      = require('broccoli-wrap');
var merge     = require('broccoli-merge-trees');

module.exports = function testTree(sourceTree, compiled) {
  var emberDataFiles = pickFiles(sourceTree, {
    files: ['**/{ember-data,activemodel-adapter}/**/*.{js,map}'],
    srcDir: '/',
    destDir: '/'
  });

  var hinted = hint(emberDataFiles);
  var testFiles = pickFiles(compiled, {
    srcDir: '/',
    destDir: '/',
    files: ['**/*/tests/**/*.{js,map}']
  });

  var allTestFiles = merge([hinted, testFiles]);

  return concat(allTestFiles, {
    inputFiles: ['**/*.js'],
    outputFile: '/ember-data-tests.js'
  });
};

function hint(tree){
  var dirname = __dirname || path.resolve(path.dirname());
  var jshinted = jshint(tree, {
    jshintrcPath: path.join(dirname, '..', '.jshintrc')
  });
  return wrap(jshinted, {
    wrapper: [ "if (!QUnit.urlParams.nojshint) {\n", "\n}"],
  });
}
