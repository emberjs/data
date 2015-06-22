/* jshint node: true */

var es6             = require('broccoli-es6-module-transpiler');
var PackageResolver = require('es6-module-transpiler-package-resolver');
var concat          = require('broccoli-sourcemap-concat');
var uglify          = require('broccoli-uglify-js');
var es3SafeRecast   = require('broccoli-es3-safe-recast');
var env             = process.env.EMBER_ENV;
var amdBuild        = require('./lib/amd-build');
var testTree        = require('./lib/test-tree');
var libTree         = require('./lib/lib-tree');
var pickFiles       = require('broccoli-static-compiler');
var merge           = require('broccoli-merge-trees');
var moveFile        = require('broccoli-file-mover');
var defeatureify    = require('broccoli-defeatureify');
var version         = require('git-repo-version')(10);
var yuidoc          = require('broccoli-yuidoc');
var replace         = require('broccoli-replace');
var stew            = require('broccoli-stew');
var babel           = require('broccoli-babel-transpiler');
var babelOptions    = require('./config/babel');
var fileCreator     = require('broccoli-file-creator');
var jscs            = require('broccoli-jscs');
var features        = require('./lib/feature-flags');

function minify(tree, name) {
  var config = require('./config/ember-defeatureify');
  tree = defeatureify(tree, {
    debugStatements: config.options.debugStatements,
    enableStripDebug: config.enableStripDebug,
    features: require('./config/features')
  });
  tree = moveFile(tree, {
    srcFile: name + '.js',
    destFile: '/' + name + '.prod.js'
  });
  tree = pickFiles(tree, {
    srcDir: '/',
    destDir: '/',
    files: [name + '.prod.js']
  });
  tree = removeSourceMappingURL(tree);
  var uglified = moveFile(uglify(tree, { mangle: true }), {
    srcFile: name + '.prod.js',
    destFile: '/' + name + '.min.js'
  });
  return merge([uglified, tree], { overwrite: true });
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
        "packages/ember-inflector/addon"
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
    files: ['**/*.js'],
    srcDir: '/',
    destDir: '/' + packagePath
  });
}

function packageAddon(packagePath, vendorPath) {
  return stew.rename(pickFiles(vendorPath + packagePath, {
    files: ['**/*.js'],
    srcDir: '/addon',
    destDir: '/' + packagePath + '/lib'
  }), 'index.js', 'main.js');
}

var packages = merge([
  packageAddon('ember-inflector', 'node_modules/'),
  package('ember-data'),
  package('activemodel-adapter'),
  package('ember')
]);

var globalBuild;

var withFeatures = features(packages);
var transpiledPackages = babel(withFeatures, babelOptions);

// Bundle formatter for smaller payload
if (env === 'production') {
  globalBuild = es6(libTree(transpiledPackages), {
    inputFiles: ['ember-data'],
    output: '/ember-data.js',
    resolvers: [PackageResolver],
    formatter: 'bundle'
  });

  var tests = testTree(packages, amdBuild(transpiledPackages));
  globalBuild = merge([globalBuild, tests]);
} else {
  // Use AMD for faster rebuilds in dev
  var bootFile = fileCreator('/boot.js', 'require("ember-data");');

  var compiled = amdBuild(transpiledPackages);
  var libFiles = libTree(compiled);

  var emberData = merge([bootFile, libFiles]);

  emberData = concat(emberData, {
    inputFiles: ['ember-data/**/*.js', 'boot.js'],
    outputFile: '/ember-data.js'
  });

  globalBuild = merge([emberData, testTree(packages, compiled)]);
}

var testRunner = pickFiles('tests', {
  srcDir: '/',
  files: ['**/*'],
  destDir: '/'
});

var bower = pickFiles('bower_components', {
  srcDir: '/',
  destDir: '/bower_components'
});

var configurationFiles = pickFiles('config/package-manager-files', {
  srcDir: '/',
  destDir: '/',
  files: ['**/*.json']
});

function versionStamp(tree) {
  return replace(tree, {
    files: ['**/*'],
    patterns: [{
      match: /VERSION_STRING_PLACEHOLDER/g,
      replacement: version
    }]
  });
}

function removeSourceMappingURL(tree) {
  return replace(tree, {
    files: ['**/*'],
    patterns: [{
      match: /\/\/(.*)sourceMappingURL=(.*)/g,
      replacement: ''
    }]
  });
}

configurationFiles = versionStamp(configurationFiles);

var jscsTree = jscs('packages');

var trees = [
  jscsTree,
  testRunner,
  bower,
  configurationFiles
];

if (env === 'production') {
  globalBuild = versionStamp(globalBuild);
  globalBuild = es3SafeRecast(globalBuild);
  var minifiedGlobals = minify(globalBuild, 'ember-data');
  trees.push(yuidocTree);
  trees.push(minifiedGlobals);
}

trees.push(globalBuild);

module.exports = merge(trees, { overwrite: true });
