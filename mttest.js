var transpiler = require('es6-module-transpiler');
var Container = transpiler.Container;
var EmberResolver = require('./ember-resolver');
var fs = require('fs');
var Path = require('path');

var dirs = [
  './bower_components/ember',
  './bower_components/ember-inflector',
  './bower_components/ember-inflector/packages',
  './bower_components/es5-shim',
  './bower_components/handlebars',
  './bower_components/jquery',
  './bower_components/loader.js',
  './bower_components/qunit',
  './packages',
  './packages/activemodel-adapter',
  './packages/ember-data',
];

var container = new Container({
  resolvers: [new EmberResolver(dirs)],
  formatter: new transpiler.formatters.bundle()
});

container.getModule('ember-data');
container.write('out.js');