import { service } from '@ember/service';

import Store from 'ember-data/store';

// NOTE: This file must be JS extension as `ember-data` is still v1 addon,
// and JS declaration will always "win" in final build of application

export default class MyStore extends Store {
  @service requestManager;
}
