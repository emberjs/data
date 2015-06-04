var ES6             = require('broccoli-es6modules');
var merge           = require('broccoli-merge-trees');
var PackageResolver = require('es6-module-transpiler-package-resolver');
var AMDFormatter    = require('es6-module-transpiler-amd-formatter');
var replace         = require('broccoli-replace');
var stew            = require('broccoli-stew');

function amdES6Package(packages, root, outfile) {
  var amdFiles = new ES6(packages, {
    format: 'namedAmd',
    esperantoOptions: {
      strict: true
    }
  });
  var loggedApp = stew.log(amdFiles, { output: 'tree', label: 'my-app-name tree' });
  var renamedToEmberConvention = replace(amdFiles, {
    files: ['**/*.js'],
    patterns: [{
        match: /lib\//g,
        replacement: ''
    }]
  });
  return replace(renamedToEmberConvention, {
    files: ['**/*.js'],
    patterns: [
      {
        match: /ember-data\/main/g,
        replacement: 'ember-data'
      },
      {
        match: /activemodel-adapter\/main/g,
        replacement: 'activemodel-adapter'
      },
      {
        match: /ember-inflector\/main/g,
        replacement: 'ember-inflector'
      },
      {
        match: /ember\/main/g,
        replacement: 'ember'
      }
    ]
  });
}

module.exports = amdES6Package;
