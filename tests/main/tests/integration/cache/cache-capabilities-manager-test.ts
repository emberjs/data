import { settled } from '@ember/test-helpers';

import Store from 'main-test-app/services/store';
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import type { CacheCapabilitiesManager } from '@ember-data/store/types';
import type { ResourceKey } from '@warp-drive/core-types';

class Person extends Model {
  @attr('string', {})
  name;
}

class Car extends Model {
  @belongsTo('house', { async: true, inverse: 'car' })
  garage;

  @attr('string', {})
  make;
}

class House extends Model {
  @attr('string', {})
  name;

  @belongsTo('person', { async: false, inverse: null })
  landlord;

  @belongsTo('car', { async: false, inverse: 'garage' })
  car;

  @hasMany('person', { async: false, inverse: null })
  tenants;
}

module('integration/cache-capabilities', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const { owner } = this;

    owner.register('model:person', Person);
    owner.register('model:house', House);
    owner.register('model:car', Car);
  });

  test('schema', function (assert) {
    const { owner } = this;
    let capabilities!: CacheCapabilitiesManager;

    class TestStore extends Store {
      override createCache(cacheCapabilities: CacheCapabilitiesManager) {
        capabilities = cacheCapabilities;
        return super.createCache(cacheCapabilities);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as unknown as Store;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store.cache;

    assert.strictEqual(capabilities.schema, store.schema, 'capabilities exposes the schema service');
  });

  test('setRecordId', function (assert) {
    const { owner } = this;
    let capabilities!: CacheCapabilitiesManager;

    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        capabilities = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as unknown as Store;

    const house = store.createRecord('house', {}) as Model;
    capabilities.setRecordId(recordIdentifierFor(house), '17');
    assert.strictEqual(house.id, '17', 'setRecordId correctly set the id');
    assert.strictEqual(
      store.peekRecord('house', '17'),
      house,
      'can lookup the record from the identify map based on the new id'
    );
  });

  test('hasRecord', function (assert) {
    const { owner } = this;

    let storeWrapper!: CacheCapabilitiesManager;
    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        storeWrapper = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as unknown as Store;

    store.push({
      data: [
        {
          type: 'house',
          id: '1',
          attributes: {
            name: 'Moomin',
          },
        },

        {
          type: 'house',
          id: '2',
          attributes: {
            name: 'Lodge',
          },
        },
      ],
    });
    store.peekRecord('house', '1');

    // TODO isRecordInUse returns true if record has never been instantiated, think through whether thats correct
    const house2 = store.peekRecord('house', '2') as Model;
    house2.unloadRecord();

    store.createRecord('house', {});
    const id1 = storeWrapper.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'house', id: '1' });
    const id2 = storeWrapper.cacheKeyManager.getOrCreateRecordIdentifier({ type: 'house', id: '2' });
    assert.true(storeWrapper.hasRecord(id1), 'house 1 is in use');
    assert.false(storeWrapper.hasRecord(id2), 'house 2 is not in use');
  });

  test('disconnectRecord', async function (assert) {
    const { owner } = this;

    let storeWrapper!: CacheCapabilitiesManager;
    class TestStore extends Store {
      override createCache(wrapper: CacheCapabilitiesManager) {
        storeWrapper = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as unknown as Store;

    const identifier = store._push({
      data: {
        type: 'house',
        id: '1',
        attributes: {
          name: 'Moomin',
        },
      },
    });
    storeWrapper.disconnectRecord(identifier as ResourceKey);
    await settled();
    assert.strictEqual(store.peekRecord('house', '1'), null, 'record was removed from id map');
  });
});
