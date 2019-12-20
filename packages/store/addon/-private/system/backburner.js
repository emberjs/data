/**
  @module @ember-data/store
*/

import { registerWaiter } from '@ember/test';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

const backburner = new Ember._Backburner(['flushRelationships', 'syncRelationships', 'finished']);

if (DEBUG) {
  registerWaiter(() => {
    return !backburner.currentInstance && !backburner.hasTimers();
  });
}

export default backburner;
