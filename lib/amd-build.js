var es6             = require('broccoli-es6-module-transpiler');
var merge           = require('broccoli-merge-trees');
var PackageResolver = require('es6-module-transpiler-package-resolver');
var AMDFormatter    = require('es6-module-transpiler-amd-formatter');
var replace         = require('broccoli-replace');

function amdES6Package(packages, root, outfile) {

  var es6Build = es6(packages, {
    inputFiles: ['ember-data'],
    output: '/ember-data/',
    resolvers: [PackageResolver],
    formatter: new AMDFormatter(),
    basePath: '/ember-data/',
    sourceRoot: '/ember-data/'
  });

  return replace(es6Build, {
    files: ['**/*.js'],
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
