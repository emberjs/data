module.exports = {
  options: {
    debugStatements: [
      "Ember.warn",
      "emberWarn",
      "Ember.assert",
      "emberAssert",
      "Ember.deprecate",
      "emberDeprecate",
      "Ember.debug",
      "emberDebug",
      "Ember.Logger.info",
      "Ember.runInDebug",
      "runInDebug"
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
