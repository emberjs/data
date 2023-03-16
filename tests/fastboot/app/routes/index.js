import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

import { buildTree } from 'ember-simple-tree/utils/tree';

export default class IndexRoute extends Route {
  @service store;

  async model() {
    const people = await this.store.findAll('person');
    const tree = buildTree(people.map((person) => person.toNode()));
    return tree;
  }
}
