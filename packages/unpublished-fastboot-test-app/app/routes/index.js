import Route from '@ember/routing/route';

import { buildTree } from 'ember-simple-tree/utils/tree';

export default class IndexRoute extends Route {
  model() {
    return this.store.findAll('person');
  }

  setupController(controller, model) {
    let tree = buildTree(model.map((person) => person.toNode()));
    super.setupController(controller, tree);
  }
}
