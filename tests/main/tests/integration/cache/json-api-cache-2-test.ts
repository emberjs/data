import { settled } from '@ember/test-helpers';
import { tracked } from '@glimmer/tracking';

import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import type Store from '@ember-data/store';
import { Type } from '@warp-drive/core-types/symbols';

import { reactiveContext } from '../../helpers/reactive-context';

class User extends Model {
  @attr declare name: string;

  // Not an attr, so shouldn't notify if a similarly named attribute changes.
  @tracked brotherName: string | undefined;

  declare [Type]: 'user';
}

module('@ember-data/json-api | Cache (2)', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
  });

  test('Does not notify for attributes not in schema', async function (assert) {
    const store = this.owner.lookup('service:store') as Store;
    const user: User = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Aino',
        },
      },
    });

    const rc = await reactiveContext.call(this, user, {
      type: 'user',
      identity: { kind: '@id', name: 'id' },
      fields: [
        { name: 'name', kind: 'field' },
        { name: 'brotherName', kind: 'field' }, // not in the Model schema
      ],
    });

    const { counters } = rc;

    assert.deepEqual(counters, { name: 1, brotherName: 1, id: 1 }, 'Test setup: counters initialized');

    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Aino',
          brotherName: 'Ellis',
        },
      },
    });

    await settled();

    assert.deepEqual(counters, { name: 1, brotherName: 1, id: 1 }, 'brotherName did not notify');
  });
});
