/**
 @module @ember-data
 @main @ember-data
 */

import Namespace from '@ember/application/namespace';
import Ember from 'ember';

import VERSION from 'ember-data/version';

/**
 * @property VERSION
 * @public
 * @static
 * @for @ember-data
 */

const DS = Namespace.create({
  VERSION: VERSION,
  name: 'DS',
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', VERSION);
}

export default DS;
