import Route from '@ember/routing/route';
import * as s from '@ember/service';

import type Store from '@ember-data/store';

const service = s.service ?? s.inject;
export default class ApplicationRoute extends Route {
  @service declare store: Store;

  override model() {
    // adding a model to the store to enable manually testing the debug-adapter
    return this.store.push({
      data: {
        id: '1',
        type: 'foo',
        attributes: {
          name: 'taco',
        },
      },
    });
  }
}
