/**
  @module ember-data
*/

/**
  All Ember Data methods and functions are defined inside of this namespace.

  @class DS
  @static
*/

if ('undefined' === typeof DS) {
  /*global DS:true*/
  DS = Ember.Namespace.create({
    VERSION: '0.14'
  });

  if ('undefined' !== typeof window) {
    window.DS = DS;
  }
}
