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
  /**
    @property VERSION
    @type String
    @default '<%= versionStamp %>'
    @static
  */
  DS = Ember.Namespace.create({
    VERSION: '<%= versionStamp %>'
  });

  if (Ember.libraries) {
    Ember.libraries.registerCoreLibrary('Ember Data', DS.VERSION);
  }
}

export default DS;
