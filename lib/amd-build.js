var pickFiles       = require('broccoli-static-compiler');
var concat          = require('broccoli-concat');
var es6             = require('broccoli-es6-module-transpiler');
var merge           = require('broccoli-merge-trees');
var PackageResolver = require('es6-module-transpiler-package-resolver');
var AMDFormatter    = require('es6-module-transpiler-amd-formatter');
var fileCreator     = require('broccoli-file-creator');
var merge           = require('broccoli-merge-trees');
var replace         = require('broccoli-replace');

function amdES6Package(packages) {
  var es6Build = es6(packages, {
    inputFiles: ['ember-data'],
    output: '/ember-data/',
    resolvers: [PackageResolver],
    formatter: new AMDFormatter(),
    basePath: '/ember-data/',
    sourceRoot: '/ember-data/'
  });

  var loaderJS = pickFiles('bower_components/loader.js', {
    srcDir: '/',
    files: ['loader.js'],
    destDir: '/'
  });

  var bootFile = fileCreator('/boot.js', 'require("ember-data/lib/main");');

  var amdBuild = merge([es6Build, loaderJS, bootFile]);

  amdBuild = concat(amdBuild, {
    inputFiles: ['loader.js', 'ember-data/**/*.js', 'boot.js'],
    outputFile: '/ember-data.js',
    header: '(function(){',
    footer: '})();'
  });

  amdBuild = merge([es6Build, amdBuild]);

  return replace(amdBuild, {
    files: ['ember-data.js'],
    patterns: [
      {
        match: /\/lib/g,
        replacement: ''
      },
      {
        match: /\/main/g,
        replacement: ''
      }
    ]
  });
}

module.exports = amdES6Package;
