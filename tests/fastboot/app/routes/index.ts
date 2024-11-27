import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

// @ts-expect-error untyped
import { buildTree } from 'ember-simple-tree/utils/tree';

import type Person from '../models/person';
import type Store from '../services/store';

export default class IndexRoute extends Route {
  @service declare store: Store;

  override async model() {
    const people = await this.store.findAll<Person>('person');
    const tree = buildTree(people.map((person) => person.toNode()));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return tree;
  }
}
