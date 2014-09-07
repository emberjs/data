'use strict';

module.exports = {
  name: 'ember-data',
  init: function() {
    this.treePaths.vendor = '../dist';
  },
  included: function(app) {
    this.app = app;
    var options = {
      exports: {
        'ember-data': [
          'default'
        ]
      }
    };

    // This will use the pre-built version distributed with our package
    // but still allow consumers to bower install their own version that
    // will override ours.
    this.app.import({
      development: 'vendor/ember-data/ember-data.js',
      production: 'vendor/ember-data/ember-data.prod.js'
    }, options);
  }
};
