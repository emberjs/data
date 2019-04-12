import { registerWaiter } from '@ember/test';
import Ember from 'ember';
import { DEBUG } from '@glimmer/env';

const backburner = new Ember._Backburner([
  'normalizeRelationships',
  'syncRelationships',
  'finished',
]);

if (DEBUG) {
  registerWaiter(() => {
    return !backburner.currentInstance && !backburner.hasTimers();
  });
}

export default backburner;
