import { service } from '@ember/service';

import Store from 'ember-data/store';

import type RequestManager from '@ember-data/request';
import { LifetimesService } from '@ember-data/request-utils';

import CONFIG from '../config/environment';

// NOTE: This file must be JS extension as `ember-data` is still v1 addon,
// and JS declaration will always "win" in final build of application

export default class MyStore extends Store {
  @service declare requestManager: RequestManager;

  constructor(args: Record<string, unknown>) {
    super(args);

    this.lifetimes = new LifetimesService(CONFIG);
  }
}
