import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

// @ts-expect-error untyped
import { buildTree } from 'ember-simple-tree/utils/tree';

import { query } from '@ember-data/json-api/request';
import { setBuildURLConfig } from '@ember-data/request-utils';

import type Person from '../models/person';
import type Store from '../services/store';

setBuildURLConfig({ host: `http://${window.location.host}`, namespace: 'api' });

export default class IndexRoute extends Route {
  @service declare store: Store;

  override async model() {
    const {
      content: { data: people },
    } = await this.store.request(query<Person>('person', {}, { resourcePath: 'people.json' }));

    const tree = buildTree(people.map((person) => person.toNode()));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return tree;
  }
}
