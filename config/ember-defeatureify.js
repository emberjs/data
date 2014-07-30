module.exports = {
  options: {
    debugStatements: [
      "Ember.warn",
      "Ember.assert",
      "Ember.deprecate",
      "Ember.debug",
      "Ember.Logger.info"
    ]
  },
  stripDebug: {
    options: {
      enableStripDebug: true
    },
    src: 'dist/ember-data.js',
    dest: 'dist/ember-data.prod.js'
  }
};