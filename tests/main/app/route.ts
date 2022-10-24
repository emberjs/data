import Route from '@ember/routing/route';
import { inject } from '@ember/service';

import type Store from '@ember-data/store';

export default class ApplicationRoute extends Route {
  @inject declare store: Store;

  model() {
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
