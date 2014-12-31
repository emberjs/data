/* jshint node: true */
'use strict';

var path = require('path');

module.exports = {
  name: 'ember-data',
  blueprintsPath: function() {
    return path.join(__dirname, 'blueprints');
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
      development: app.bowerDirectory + '/ember-data/ember-data.js',
      production: app.bowerDirectory + '/ember-data/ember-data.prod.js'
    }, options);
    // Source maps
    this.app.import({
      development: app.bowerDirectory + '/ember-data/ember-data.js.map'
    }, {destDir: 'assets'});
  }
};
