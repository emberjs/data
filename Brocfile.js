/* jshint node: true */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var EmberBuild         = require('emberjs-build');
var packages           = require('./lib/packages');
var vendoredPackage    = require('emberjs-build/lib/vendored-package');
var vendoredES6Package = require('emberjs-build/lib/es6-vendored-package');

var emberBuild = new EmberBuild({
  name: 'ember-data',
  namespace: 'DS',
  packages: packages,
  skipTemplates: true,
  skipRuntime: true,
  vendoredPackages: {
    'loader': vendoredPackage('loader'),
    'ember-inflector': vendoredES6Package('ember-inflector', {
      libPath: 'bower_components/ember-inflector/packages/ember-inflector/lib',
      destDir: '/ember-inflector'
    })
  }
});

module.exports = emberBuild.getDistTrees();
