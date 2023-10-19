import Namespace from '@ember/application/namespace';
import Ember from 'ember';

import VERSION from 'ember-data/version';

export interface DS extends Namespace {
  VERSION: string;
  name: string;
}

export const DS = Namespace.create({
  // @ts-expect-error ember-source types are wrong
  VERSION: VERSION,
  name: 'DS',
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', VERSION);
}

export default DS;
