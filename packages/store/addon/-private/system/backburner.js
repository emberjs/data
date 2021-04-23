/**
  @module @ember-data/store
*/

import { registerWaiter } from '@ember/test';
import { DEBUG } from '@glimmer/env';
import Ember from 'ember';

// TODO: expose Ember._Backburner as `import { _Backburner } from '@ember/runloop'` in ember-rfc176-data + emberjs/ember.js
/*
  flushRelationships is used by the Graph to batch updates
  syncRelationships is used by the UI to grab updates from the graph
  and update the ManyArrays.
*/
const backburner = new Ember._Backburner(['flushRelationships', 'syncRelationships']);

if (DEBUG) {
  registerWaiter(() => {
    return !backburner.currentInstance && !backburner.hasTimers();
  });
}

export default backburner;
