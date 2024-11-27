import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

class Person extends Model {
  @attr()
  name;
}

module('integration/store/package-import', function (hooks) {
  setupTest(hooks);

  let store;

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:person', Person);
    owner.unregister('service:store');
    store = owner.lookup('service:store');
  });

  test('Store push works with an import from @ember-data/store', async function (assert) {
    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Scumbag Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Scumbag Katz',
          },
        },
      ],
    });

    const all = store.peekAll('person');
    assert.strictEqual(get(all, 'length'), 2);

    store.push({
      data: [
        {
          type: 'person',
          id: '3',
          attributes: {
            name: 'Scumbag Bryn',
          },
        },
      ],
    });

    await settled();
    assert.strictEqual(get(all, 'length'), 3);
  });
});
