/**
  @module @ember-data/store
*/

import { registerWaiter } from '@ember/test';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

// TODO: expose Ember._Backburner as `import { _Backburner } from '@ember/runloop'` in ember-rfc176-data + emberjs/ember.js
/*
  syncRelationships is used by the UI to grab updates from the graph
  and update the ManyArrays.

  We may be able to remove this once the new relationship layer is
  complete.
*/
const backburner = new Ember._Backburner(['coalesce', 'sync', 'notify']);

if (DEBUG) {
  registerWaiter(() => {
    return !backburner.currentInstance && !backburner.hasTimers();
  });
}

export default backburner;
