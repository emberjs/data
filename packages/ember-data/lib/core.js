/**
  @module ember-data
*/

/**
  All Ember Data methods and functions are defined inside of this namespace.

  @class DS
  @static
*/

/**
  @property VERSION
  @type String
  @default '<%= versionStamp %>'
  @static
*/
/*jshint -W079 */
var DS = Ember.Namespace.create({
  VERSION: '<%= versionStamp %>'
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', DS.VERSION);
}

export default DS;
