import Route from '@ember/routing/route';
import { inject } from '@ember/service';

type Store = import('@ember-data/store').default;

declare module '@ember-data/store/-private/ts-interfaces/registries' {
  export interface ModelRegistry {
    foo: null;
  }
}

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
