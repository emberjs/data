import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';
import publicProps from '@ember-data/unpublished-test-infra/test-support/public-props';

class Person extends Model {
  @attr('string', {})
  name;
}

class Car extends Model {
  @belongsTo('house')
  garage;

  @attr('string', {})
  make;
}

class House extends Model {
  @attr('string', {})
  name;

  @belongsTo('person', { async: false })
  landlord;

  @belongsTo('car', { async: false })
  car;

  @hasMany('person', { async: false })
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

  unloadRecord() {}
  rollbackAttributes() {}
  changedAttributes(): any {}

  hasChangedAttributes(): boolean {
    return false;
  }

  setDirtyAttribute(key: string, value: any) {}

  getAttr(key: string): string {
    return 'test';
  }

  hasAttr(key: string): boolean {
    return false;
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

  isAttrDirty(key: string) {
    return false;
  }
  isNew() {
    return this._isNew;
  }
  removeFromInverseRelationships() {}

  _initRecordCreateOptions(options) {}
}

let CustomStore = Store.extend({
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    return new TestRecordData();
  },
});

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
    assert.expect(7);
    let { owner } = this;

    class RelationshipRD extends TestRecordData {
      constructor(storeWrapper) {
        super();
        let houseAttrs = {
          name: {
            type: 'string',
            isAttribute: true,
            kind: 'attribute',
            options: {},
            name: 'name',
          },
        };

        assert.deepEqual(
          storeWrapper.attributesDefinitionFor('house'),
          houseAttrs,
          'can lookup attribute definitions for self'
        );

        let carAttrs = {
          make: {
            type: 'string',
            isAttribute: true,
            kind: 'attribute',
            options: {},
            name: 'make',
          },
        };

        assert.deepEqual(
          storeWrapper.attributesDefinitionFor('car'),
          carAttrs,
          'can lookup attribute definitions for other models'
        );

        let houseRelationships = {
          landlord: {
            key: 'landlord',
            kind: 'belongsTo',
            name: 'landlord',
            type: 'person',
            options: { async: false },
          },
          car: {
            key: 'car',
            kind: 'belongsTo',
            name: 'car',
            type: 'car',
            options: { async: false },
          },
          tenants: {
            key: 'tenants',
            kind: 'hasMany',
            name: 'tenants',
            options: { async: false },
            type: 'person',
          },
        };
        let schema = storeWrapper.relationshipsDefinitionFor('house');
        let result = publicProps(['key', 'kind', 'name', 'type', 'options'], schema);

        // Retrive only public values from the result
        // This should go away once we put private things in symbols/weakmaps
        assert.deepEqual(houseRelationships, result, 'can lookup relationship definitions');
        assert.strictEqual(
          storeWrapper.inverseForRelationship('house', 'car'),
          'garage',
          'can lookup inverses on self'
        );
        assert.strictEqual(
          storeWrapper.inverseForRelationship('car', 'garage'),
          'car',
          'can lookup inverses on other models'
        );
        assert.true(storeWrapper.inverseIsAsyncForRelationship('house', 'car'), 'can lookup async inverse on self');
        assert.false(
          storeWrapper.inverseIsAsyncForRelationship('car', 'garage'),
          'can lookup async inverse on other models'
        );
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RelationshipRD(storeWrapper);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [houseHash],
    });
  });

  test('RecordDataFor', async function (assert) {
    assert.expect(3);
    let { owner } = this;

    let count = 0;
    class RecordDataForTest extends TestRecordData {
      id: string;

      constructor(storeWrapper, id) {
        super();
        count++;
        this.id = id;

        if (count === 1) {
          assert.strictEqual(
            storeWrapper.recordDataFor('house', 2).id,
            '2',
            'Can lookup another RecordData that has been loaded'
          );
          assert.strictEqual(
            storeWrapper.recordDataFor('person', 1).id,
            '1',
            'Can lookup another RecordData which hasnt been loaded'
          );
        }
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RecordDataForTest(storeWrapper, id);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [houseHash, houseHash2],
    });

    assert.strictEqual(count, 2, 'two TestRecordDatas have been created');
  });

  test('recordDataFor - create new', async function (assert) {
    assert.expect(3);
    let { owner } = this;
    let count = 0;
    let internalModel;
    let recordData;

    class RecordDataForTest extends TestRecordData {
      id: string;
      _isNew: boolean = false;

      constructor(storeWrapper, id, lid) {
        super();
        count++;
        this.id = id;

        if (count === 1) {
          recordData = storeWrapper.recordDataFor('house');
        } else if (count === 2) {
          internalModel = store._internalModelForResource({ type: 'house', lid });
        }
      }

      clientDidCreate() {
        this._isNew = true;
      }

      isNew() {
        return this._isNew;
      }
    }

    const TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RecordDataForTest(storeWrapper, id, clientId);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

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

    assert.ok(recordData._isNew, 'Our RecordData is new');
    assert.ok(
      internalModel.isNew(),
      'The internalModel for a RecordData created via Wrapper.recordDataFor(type) is in the "new" state'
    );

    assert.strictEqual(count, 2, 'two TestRecordDatas have been created');
  });

  test('setRecordId', async function (assert) {
    assert.expect(1);
    let { owner } = this;

    class RecordDataForTest extends TestRecordData {
      id: string;

      constructor(storeWrapper, id, clientId) {
        super();
        storeWrapper.setRecordId('house', '17', clientId);
        this.id = '17';
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RecordDataForTest(storeWrapper, id, clientId);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    let house = store.createRecord('house');
    // TODO there is a bug when setting id while creating the Record instance, preventing the id property lookup to work
    // assert.strictEqual(house.get('id'), '17', 'setRecordId correctly set the id');
    assert.strictEqual(
      store.peekRecord('house', 17),
      house,
      'can lookup the record from the identify map based on the new id'
    );
  });

  test('isRecordInUse', async function (assert) {
    assert.expect(2);
    let { owner } = this;

    class RecordDataForTest extends TestRecordData {
      constructor(storeWrapper, id, clientId) {
        super();
        if (!id) {
          assert.true(storeWrapper.isRecordInUse('house', '1'), 'house 1 is in use');
          assert.false(storeWrapper.isRecordInUse('house', '2'), 'house 2 is not in use');
        }
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RecordDataForTest(storeWrapper, id, clientId);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

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
  });

  test('disconnectRecord', async function (assert) {
    assert.expect(1);
    let { owner } = this;
    let wrapper;

    class RecordDataForTest extends TestRecordData {
      constructor(storeWrapper, id, clientId) {
        super();
        wrapper = storeWrapper;
      }
    }

    let TestStore = Store.extend({
      createRecordDataFor(modelName, id, clientId, storeWrapper) {
        if (modelName === 'house') {
          return new RecordDataForTest(storeWrapper, id, clientId);
        } else {
          return this._super(modelName, id, clientId, storeWrapper);
        }
      },
    });

    owner.register('service:store', TestStore);
    store = owner.lookup('service:store');

    store.push({
      data: [],
      included: [houseHash],
    });
    wrapper.disconnectRecord('house', '1');
    assert.strictEqual(store.peekRecord('house', '1'), null, 'record was removed from id map');
  });
});
