import { findAll } from '@ember-data/legacy-compat/builders';
class Route {
  async model() {
    return (await this.store.request(findAll('post'))).content;
  }
}
