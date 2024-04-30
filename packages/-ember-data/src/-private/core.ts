import Namespace from '@ember/application/namespace';
import Ember from 'ember';

import VERSION from 'ember-data/version';

export interface DS extends Namespace {
  VERSION: string;
  name: string;
}

type CreateArgs = { VERSION: string; name: string };

export const DS = (Namespace as unknown as { create(args: CreateArgs): DS }).create({
  VERSION: VERSION,
  name: 'DS',
});

if (Ember.libraries) {
  Ember.libraries.registerCoreLibrary('Ember Data', VERSION);
}

export default DS;
