import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import Store from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/current-deprecations';
import { recordIdentifierFor } from '@ember-data/store';
import { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import { DSModel } from '@ember-data/types/q/ds-model';
import { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import publicProps from '@ember-data/unpublished-test-infra/test-support/public-props';

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

// TODO: this should work
// class TestRecordData implements RecordData
class TestRecordData {
  _isNew = false;
  pushData(data, calculateChange?: boolean) {}
  upsert() {}
  clientDidCreate() {
    this._isNew = true;
  }

  willCommit() {}

  commitWasRejected() {}

  isDeletionCommitted() {
    return false;
  }
  isDeleted() {
    return false;
  }

  unloadRecord() {}
  rollbackAttributes() {}
  changedAttributes(): any {}

  hasChangedAttributes(): boolean {
    return false;
  }

  setDirtyAttribute(key: string, value: any) {}

  getAttr(identifier: StableRecordIdentifier, key: string): unknown {
    return 'test';
  }

  getHasMany(key: string) {
    return {};
  }

  addToHasMany(key: string, recordDatas: this[], idx?: number) {}
  removeFromHasMany(key: string, recordDatas: this[]) {}
  setDirtyHasMany(key: string, recordDatas: this[]) {}

  getBelongsTo(key: string) {}

  setDirtyBelongsTo(name: string, recordData: this | null) {}

  didCommit(data) {}

  isNew() {
    return this._isNew;
  }

  isEmpty() {
    return false;
  }

  _initRecordCreateOptions(options) {}
}

class CustomStore extends Store {
  // @ts-expect-error
  createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
    return new TestRecordData();
  }
}

let houseHash, houseHash2;

module('integration/store-wrapper - RecordData StoreWrapper tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    houseHash = {
      type: 'house',
      id: '1',
      attributes: {
        name: 'Moomin',
      },
    };

    houseHash2 = {
      type: 'house',
      id: '2',
      attributes: {
        name: 'Lodge',
      },
    };

    owner.register('model:person', Person);
    owner.register('model:house', House);
    owner.register('model:car', Car);
    owner.unregister('service:store');
    owner.register('service:store', CustomStore);
  });

  test('Relationship definitions', async function (assert) {
    const { owner } = this;
    let storeWrapper!: CacheStoreWrapper;

    class TestStore extends Store {
      createCache(wrapper: CacheStoreWrapper) {
        storeWrapper = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as Store;
    store.cache;

    let houseAttrs = {
      name: {
        type: 'string',
        isAttribute: true,
        options: {},
        name: 'name',
      },
    };

    assert.deepEqual(
      storeWrapper.getSchemaDefinitionService().attributesDefinitionFor({ type: 'house' }),
      houseAttrs,
      'can lookup attribute definitions for self'
    );

    let carAttrs = {
      make: {
        type: 'string',
        isAttribute: true,
        options: {},
        name: 'make',
      },
    };

    assert.deepEqual(
      storeWrapper.getSchemaDefinitionService().attributesDefinitionFor({ type: 'car' }),
      carAttrs,
      'can lookup attribute definitions for other models'
    );

    let houseRelationships = {
      landlord: {
        key: 'landlord',
        kind: 'belongsTo',
        name: 'landlord',
        type: 'person',
        options: { async: false, inverse: null },
      },
      car: {
        key: 'car',
        kind: 'belongsTo',
        name: 'car',
        type: 'car',
        options: { async: false, inverse: 'garage' },
      },
      tenants: {
        key: 'tenants',
        kind: 'hasMany',
        name: 'tenants',
        options: { async: false, inverse: null },
        type: 'person',
      },
    };
    let schema = storeWrapper.getSchemaDefinitionService().relationshipsDefinitionFor({ type: 'house' });
    let result = publicProps(['key', 'kind', 'name', 'type', 'options'], schema);

    // Retrive only public values from the result
    // This should go away once we put private things in symbols/weakmaps
    assert.deepEqual(houseRelationships, result, 'can lookup relationship definitions');
  });

  if (DEPRECATE_V1_RECORD_DATA) {
    test('RecordDataFor', async function (assert) {
      assert.expect(DEPRECATE_V1_RECORD_DATA ? 4 : 3);
      let { owner } = this;

      let count = 0;
      class RecordDataForTest extends TestRecordData {
        id: string;

        constructor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
          super();
          count++;
          this.id = identifier.id!;

          if (count === 1) {
            const identifier = storeWrapper.identifierCache.getOrCreateRecordIdentifier({ type: 'house', id: '2' });
            assert.strictEqual(
              storeWrapper.recordDataFor(identifier).getAttr(identifier, 'name'),
              'ours name',
              'Can lookup another RecordData that has been loaded'
            );
            const identifier2 = storeWrapper.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
            const cache = storeWrapper.recordDataFor(identifier2);
            const attrValue = cache.getAttr(identifier2, 'name');
            assert.strictEqual(attrValue, 'Chris', 'Can lookup another RecordData which hasnt been loaded');
          }
        }

        getAttr(identifier: StableRecordIdentifier, key: string): unknown {
          return 'ours name';
        }
      }

      class TestStore extends Store {
        // @ts-expect-error
        createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
          if (identifier.type === 'house') {
            return new RecordDataForTest(identifier, wrapper);
          } else {
            return this.cache;
          }
        }
      }

      owner.register('service:store', TestStore);
      const store = owner.lookup('service:store') as Store;

      store.push({
        data: [{ id: '1', type: 'person', attributes: { name: 'Chris' } }, houseHash, houseHash2],
      });

      assert.strictEqual(count, 2, 'two TestRecordDatas have been created');
      if (DEPRECATE_V1_RECORD_DATA) {
        assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 5 });
      }
    });

    test('recordDataFor - create new', async function (assert) {
      assert.expect(DEPRECATE_V1_RECORD_DATA ? 4 : 3);
      let { owner } = this;
      let count = 0;
      let cache;
      let newRecordData;
      let firstIdentifier, secondIdentifier;

      class RecordDataForTest extends TestRecordData {
        id: string;
        _isNew: boolean = false;

        constructor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
          super();
          count++;
          this.id = identifier.id!;

          if (count === 1) {
            const newIdentifier = wrapper.identifierCache.createIdentifierForNewRecord({ type: 'house' });
            cache = wrapper.recordDataFor(newIdentifier);
            firstIdentifier = newIdentifier;
            cache.clientDidCreate(newIdentifier);
          } else if (count === 2) {
            newRecordData = this;
            secondIdentifier = identifier;
          }
        }

        clientDidCreate() {
          this._isNew = true;
        }

        isNew() {
          return this._isNew;
        }
      }

      class TestStore extends Store {
        // @ts-expect-error
        createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
          if (identifier.type === 'house') {
            return new RecordDataForTest(identifier, wrapper);
          } else {
            return this.cache;
          }
        }
      }

      owner.register('service:store', TestStore);
      const store = owner.lookup('service:store') as Store;

      store.push({
        data: {
          type: 'house',
          id: '1',
          attributes: {
            bedrooms: 1,
          },
        },
      });

      assert.ok(cache.isNew(firstIdentifier), 'Our RecordData is new');
      assert.ok(
        newRecordData.isNew(secondIdentifier),
        'The recordData for a RecordData created via Wrapper.recordDataFor(type) is in the "new" state'
      );

      assert.strictEqual(count, 2, 'two TestRecordDatas have been created');
      if (DEPRECATE_V1_RECORD_DATA) {
        assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 4 });
      }
    });
  }

  test('setRecordId', async function (assert) {
    const { owner } = this;
    let storeWrapper!: CacheStoreWrapper;

    class TestStore extends Store {
      createCache(wrapper: CacheStoreWrapper) {
        storeWrapper = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as Store;

    let house = store.createRecord('house', {}) as DSModel;
    storeWrapper.setRecordId(recordIdentifierFor(house), '17');
    assert.strictEqual(house.id, '17', 'setRecordId correctly set the id');
    assert.strictEqual(
      store.peekRecord('house', '17'),
      house,
      'can lookup the record from the identify map based on the new id'
    );
  });

  test('hasRecord', async function (assert) {
    const { owner } = this;

    let storeWrapper!: CacheStoreWrapper;
    class TestStore extends Store {
      createCache(wrapper: CacheStoreWrapper) {
        storeWrapper = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as Store;

    store.push({
      data: [houseHash, houseHash2],
    });
    store.peekRecord('house', '1');

    // TODO isRecordInUse returns true if record has never been instantiated, think through whether thats correct
    let house2 = store.peekRecord('house', '2') as DSModel;
    house2.unloadRecord();

    store.createRecord('house', {});
    const id1 = storeWrapper.identifierCache.getOrCreateRecordIdentifier({ type: 'house', id: '1' });
    const id2 = storeWrapper.identifierCache.getOrCreateRecordIdentifier({ type: 'house', id: '2' });
    assert.true(storeWrapper.hasRecord(id1), 'house 1 is in use');
    assert.false(storeWrapper.hasRecord(id2), 'house 2 is not in use');
  });

  test('disconnectRecord', async function (assert) {
    const { owner } = this;

    let storeWrapper!: CacheStoreWrapper;
    class TestStore extends Store {
      createCache(wrapper: CacheStoreWrapper) {
        storeWrapper = wrapper;
        return super.createCache(wrapper);
      }
    }

    owner.register('service:store', TestStore);
    const store = owner.lookup('service:store') as Store;

    const identifier = store._push({
      data: {
        type: 'house',
        id: '1',
        attributes: {
          name: 'Moomin',
        },
      },
    });
    storeWrapper.disconnectRecord(identifier as StableRecordIdentifier);
    await settled();
    assert.strictEqual(store.peekRecord('house', '1'), null, 'record was removed from id map');
  });
});
