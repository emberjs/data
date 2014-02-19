module.exports = {
  compile: {
    "name": "The ember-data API",
    "description": "The ember-data API: a data persistence library for Ember.js",
    "version": '<%= versionStamp %>',
    "logo": "http://f.cl.ly/items/1A1L432s022u1O1q1V3p/ember%20logo.png",
    "url": "https://github.com/emberjs/data",
    "options": {
      "paths": [
        "packages/ember-data/lib",
        "packages/activemodel-adapter/lib",
        "packages/ember-inflector/lib"
      ],
      "exclude": "vendor",
      "outdir":   "docs/build"
    }
  }
}
