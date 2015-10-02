/* jshint node: true */
'use strict';

var path = require('path');
var Funnel = require('broccoli-funnel');
var UnwatchedTree = require('broccoli-unwatched-tree');

module.exports = {
  name: 'ember-data',
  blueprintsPath: function() {
    return path.join(__dirname, 'blueprints');
  },

  treeFor: function(type) {
    if (type === 'vendor') {
      return new Funnel(new UnwatchedTree(__dirname), {
        srcDir: 'dist',
        destDir: 'ember-data',
        files: [
          'ember-data.js',
          'ember-data.js.map',
          'ember-data.min.js',
          'ember-data.prod.js'
        ]
      });
    }
  },

  included: function(app) {
    this._super.included(app);

    var options = {
      exports: {
        'ember-data': [
          'default'
        ]
      }
    };

    this.app.import({
      development: 'vendor/ember-data/ember-data.js',
      production: 'vendor/ember-data/ember-data.prod.js'
    }, options);
    // Source maps
    this.app.import({
      development: 'vendor/ember-data/ember-data.js.map'
    }, {destDir: 'assets'});
  }
};
