import { findAll } from '@ember-data/legacy-compat/builders';
class MyOutdatedComponent {
  *myOldEmberConcurrencyTask() {
    yield this.store.request(findAll('post'));
    const { content: post } = yield this.store.request(findAll('post'));
    return (yield this.store.request(findAll('post'))).content;
  }
}
