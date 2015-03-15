/* jshint node: true */

var es6             = require('broccoli-es6-module-transpiler');
var PackageResolver = require('es6-module-transpiler-package-resolver');
var concat          = require('broccoli-concat');
var uglify          = require('broccoli-uglify-js');
var es3SafeRecast   = require('broccoli-es3-safe-recast');
var env             = process.env.EMBER_ENV;
var amdBuild        = require('./lib/amd-build');
var pickFiles       = require('broccoli-static-compiler');
var merge           = require('broccoli-merge-trees');
var moveFile        = require('broccoli-file-mover');
var wrap            = require('broccoli-wrap');
var jshint          = require('broccoli-jshint');
var defeatureify    = require('broccoli-defeatureify');
var version         = require('git-repo-version')(10);
var yuidoc          = require('broccoli-yuidoc');
var replace         = require('broccoli-replace');
var path            = require('path');
var fs              = require('fs');
var jscsTree        = require('broccoli-jscs');

function minify(tree, name){
  var config = require('./config/ember-defeatureify');
  tree = defeatureify(tree, {
    debugStatements: config.options.debugStatements,
    enableStripDebug: config.stripDebug
  });
  tree = moveFile(tree, {
    srcFile: name + '.js',
    destFile: '/' + name + '.prod.js'
  });
  var uglified = moveFile(uglify(tree, {mangle: true}),{
    srcFile: name + '.prod.js',
    destFile: '/' + name + '.min.js'
  });
  return merge([uglified, tree], {overwrite: true});
}

function testTree(packageName){
  var test = pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    files: [ '**/*.js' ],
    destDir: '/' + packageName
  });
  var jshinted = jshint('packages/' + packageName + '/', {
    jshintrcPath: path.join(__dirname, '.jshintrc')
  });
  jshinted = wrap(jshinted, {
    wrapper: [ "if (!QUnit.urlParams.nojshint) {\n", "\n}"],
  });
  jshinted = pickFiles(jshinted, {
    files: ['{lib,tests}/**/*.js'],
    srcDir: '/',
    destDir: '/' + packageName + '-jshint'
  });
  return merge([jshinted, test]);
}

var yuidocTree = yuidoc('packages', {
  srcDir: '/',
  destDir: 'docs',
  yuidoc: {
    "name": "The ember-data API",
    "description": "The ember-data API: a data persistence library for Ember.js",
    "version": version,
    "logo": "http://f.cl.ly/items/1A1L432s022u1O1q1V3p/ember%20logo.png",
    "url": "https://github.com/emberjs/data",
    "options": {
      "paths": [
        "packages/ember-data/lib",
        "packages/activemodel-adapter/lib",
        "packages/ember-inflector/lib"
      ],
      "exclude": "vendor",
      "outdir":   "docs/build"
    }
  }
});

// Excludes tests files from package path
function package(packagePath, vendorPath) {
  vendorPath = vendorPath || 'packages/';
  return pickFiles(vendorPath + packagePath, {
    files: [ 'lib/**/*.js' ],
    srcDir: '/',
    destDir: '/' + packagePath
  });
}

var packages = merge([
  package('ember-inflector', 'bower_components/ember-inflector/packages/'),
  package('ember-data'),
  package('activemodel-adapter')
]);

var globalBuild;

// Bundle formatter for smaller payload
if (env === 'production') {
  globalBuild = es6(packages, {
    inputFiles: ['ember-data'],
    output: '/ember-data.js',
    resolvers: [PackageResolver],
    formatter: 'bundle'
  });
} else {
// Use AMD for faster rebuilds in dev
  globalBuild = amdBuild(packages);
}

var testFiles = merge([
  testTree('ember-data'),
  testTree('activemodel-adapter')
]);

if (env === 'production'){
  testFiles = es3SafeRecast(testFiles);
}

testFiles = concat(testFiles, {
  inputFiles: ['**/*.js'],
  separator: '\n',
  wrapInEval: true,
  wrapInFunction: true,
  outputFile: '/ember-data-tests.js'
});

var testRunner = pickFiles('tests', {
  srcDir: '/',
  files: [ '**/*' ],
  destDir: '/'
});

var bower = pickFiles('bower_components', {
  srcDir: '/',
  destDir: '/bower_components'
});

var configurationFiles = pickFiles('config/package-manager-files', {
  srcDir: '/',
  destDir: '/',
  files: [ '**/*.json' ]
});

function versionStamp(tree){
  return replace(tree, {
    files: ['**/*'],
    patterns: [{
      match: /VERSION_STRING_PLACEHOLDER/g,
      replacement: version
    }]
  });
}

configurationFiles = versionStamp(configurationFiles);

var jscsFiles = jscsTree("packages");

var trees = [
  testFiles,
  testRunner,
  bower,
  configurationFiles,
  jscsFiles
];

if (env === 'production') {
  globalBuild = versionStamp(globalBuild);
  globalBuild = es3SafeRecast(globalBuild);
  var minifiedGlobals = minify(globalBuild, 'ember-data');
  trees.push(yuidocTree);
  trees.push(minifiedGlobals);
}

trees.push(globalBuild);

module.exports = merge(trees, {overwrite: true});
