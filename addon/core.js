import Ember from 'ember';
import VERSION from 'ember-data/version';

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
  @static
*/
/*jshint -W079 */
var DS = Ember.Namespace.create({
  VERSION: VERSION
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', DS.VERSION);
}

// var EMBER_DATA_FEATURES = EMBER_DATA_FEATURES_PLACEHOLDER; //jshint ignore: line

// Ember.merge(Ember.FEATURES, EMBER_DATA_FEATURES);

export default DS;
