var YUIDoc  = require('broccoli-yuidoc');
var calculateVersion = require('./calculate-version');
var path    = require('path');

module.exports = function yui() {
  var emberData = path.join(__dirname, '..', 'addon');
  var emberInflector = path.join(path.dirname(require.resolve('ember-inflector'), 'addon'));

  return new YUIDoc([emberData, emberInflector], {
    srcDir: '/',
    destDir: 'docs',
    yuidoc: {
      "name": "The ember-data API",
      "description": "The ember-data API: a data persistence library for Ember.js",
      "version": calculateVersion(),
      "logo": "http://f.cl.ly/items/1A1L432s022u1O1q1V3p/ember%20logo.png",
      "url": "https://github.com/emberjs/data",
      "options": {
        "paths": [
          "ember-data/lib",
          "ember-inflector/addon"
        ],
        "exclude": "vendor",
        "outdir":   "docs/build"
      }
    }
  });
};

