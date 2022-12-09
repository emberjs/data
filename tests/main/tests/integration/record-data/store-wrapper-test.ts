import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/deprecations';
import Store from '@ember-data/store';
import { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
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

  let store;

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
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 4 : 3);
    let { owner } = this;

    class RelationshipRD extends TestRecordData {
      constructor(identifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        super();
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
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RelationshipRD(identifier, wrapper);
        } else {
          return super.createRecordDataFor(identifier, wrapper);
        }
      }
    }

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [houseHash],
    });

    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

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
          const recordData = storeWrapper.recordDataFor(identifier2);
          const attrValue = recordData.getAttr(identifier2, 'name');
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
          return super.createRecordDataFor(identifier, wrapper);
        }
      }
    }

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [{ id: '1', type: 'person', attributes: { name: 'Chris' } }, houseHash, houseHash2],
    });

    assert.strictEqual(count, 2, 'two TestRecordDatas have been created');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 2 });
    }
  });

  test('recordDataFor - create new', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 4 : 3);
    let { owner } = this;
    let count = 0;
    let recordData;
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
          recordData = wrapper.recordDataFor(newIdentifier);
          firstIdentifier = newIdentifier;
          recordData.clientDidCreate(newIdentifier);
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
          return super.createRecordDataFor(identifier, wrapper);
        }
      }
    }

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: {
        type: 'house',
        id: '1',
        attributes: {
          bedrooms: 1,
        },
      },
    });

    assert.ok(recordData.isNew(firstIdentifier), 'Our RecordData is new');
    assert.ok(
      newRecordData.isNew(secondIdentifier),
      'The recordData for a RecordData created via Wrapper.recordDataFor(type) is in the "new" state'
    );

    assert.strictEqual(count, 2, 'two TestRecordDatas have been created');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 2 });
    }
  });

  test('setRecordId', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 3 : 2);
    let { owner } = this;

    class RecordDataForTest extends TestRecordData {
      id: string;

      constructor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        super();
        wrapper.setRecordId(identifier, '17');
        this.id = '17';
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RecordDataForTest(identifier, wrapper);
        } else {
          return super.createRecordDataFor(identifier, wrapper);
        }
      }
    }

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    let house = store.createRecord('house');
    assert.strictEqual(house.id, '17', 'setRecordId correctly set the id');
    assert.strictEqual(
      store.peekRecord('house', '17'),
      house,
      'can lookup the record from the identify map based on the new id'
    );
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });

  test('hasRecord', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 5 : 4);
    let { owner } = this;

    class RecordDataForTest extends TestRecordData {
      constructor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        super();
        if (!identifier.id) {
          const id1 = wrapper.identifierCache.getOrCreateRecordIdentifier({ type: 'house', id: '1' });
          const id2 = wrapper.identifierCache.getOrCreateRecordIdentifier({ type: 'house', id: '2' });
          assert.true(wrapper.hasRecord(id1), 'house 1 is in use');
          assert.false(wrapper.hasRecord(id2), 'house 2 is not in use');
        } else {
          assert.ok(true, 'we created a recordData');
        }
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RecordDataForTest(identifier, wrapper);
        } else {
          return super.createRecordDataFor(identifier, wrapper);
        }
      }
    }

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [houseHash, houseHash2],
    });
    store.peekRecord('house', 1);

    // TODO isRecordInUse returns true if record has never been instantiated, think through whether thats correct
    let house2 = store.peekRecord('house', 2);
    house2.unloadRecord();

    store.createRecord('house');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 3 });
    }
  });

  test('disconnectRecord', async function (assert) {
    assert.expect(DEPRECATE_V1_RECORD_DATA ? 2 : 1);
    let { owner } = this;
    let wrapper;
    let identifier;

    class RecordDataForTest extends TestRecordData {
      constructor(stableIdentifier: StableRecordIdentifier, storeWrapper: CacheStoreWrapper) {
        super();
        wrapper = storeWrapper;
        identifier = stableIdentifier;
      }
    }

    class TestStore extends Store {
      // @ts-expect-error
      createRecordDataFor(identifier: StableRecordIdentifier, wrapper: CacheStoreWrapper) {
        if (identifier.type === 'house') {
          return new RecordDataForTest(identifier, wrapper);
        } else {
          return super.createRecordDataFor(identifier, wrapper);
        }
      }
    }

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [],
      included: [houseHash],
    });
    wrapper.disconnectRecord(identifier);
    assert.strictEqual(store.peekRecord('house', '1'), null, 'record was removed from id map');
    if (DEPRECATE_V1_RECORD_DATA) {
      assert.expectDeprecation({ id: 'ember-data:deprecate-v1-cache', count: 1 });
    }
  });
});
