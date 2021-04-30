import EmberObject from '@ember/object';

import { resolve } from 'rsvp';

import CARS_PAYLOAD from '../utils/generate-fixtures-for-materialization-scenario';

export default class ApplicationMockAdapter extends EmberObject {
  findAll() {
    return resolve(CARS_PAYLOAD);
  }
  shouldReloadAll() {
    return false;
  }
  shouldBackgroundReloadAll() {
    return false;
  }
  deleteRecord = function () {
    return resolve();
  };
}
