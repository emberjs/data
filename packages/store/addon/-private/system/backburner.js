/**
  @module @ember-data/store
*/

import { registerWaiter } from '@ember/test';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

// TODO: expose Ember._Backburner as `import { _Backburner } from '@ember/runloop'` in ember-rfc176-data + emberjs/ember.js
const backburner = new Ember._Backburner(['normalizeRelationships', 'syncRelationships', 'finished']);

if (DEBUG) {
  registerWaiter(() => {
    return !backburner.currentInstance && !backburner.hasTimers();
  });
}

export default backburner;
