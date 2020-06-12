import Namespace from '@ember/application/namespace';
import Ember from 'ember';

import VERSION from 'ember-data/version';

const DS = Namespace.create({
  VERSION: VERSION,
  name: 'DS',
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', VERSION);
}

export default DS;
