import { service } from '@ember/service';

import Store from 'ember-data/store';

import type RequestManager from '@ember-data/request';

export default class MyStore extends Store {
  @service declare requestManager: RequestManager;
}
