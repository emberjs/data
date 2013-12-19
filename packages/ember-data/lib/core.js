/**
  @module ember-data
*/

/**
  All Ember Data methods and functions are defined inside of this namespace.

  @class DS
  @static
*/
var DS;
if ('undefined' === typeof DS) {
  DS = Ember.Namespace.create({
    VERSION: 'VERSION_STRING_PLACEHOLDER'
  });

  if ('undefined' !== typeof window) {
    window.DS = DS;
  }

  if (Ember.libraries) {
    Ember.libraries.registerCoreLibrary('Ember Data', DS.VERSION);
  }
}
