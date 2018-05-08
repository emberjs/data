import Ember from 'ember';
import VERSION from 'ember-data/version';

/**
  @module ember-data
*/

/**
  All Ember Data classes, methods and functions are defined inside of this namespace.

  @class DS
  @static
*/

/**
  @property VERSION
  @type String
  @static
*/
const DS = Ember.Namespace.create({
  VERSION: VERSION,
  name: "DS"
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', DS.VERSION);
}

export default DS;
