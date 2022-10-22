import EmberObject from '@ember/object';

import Store from 'adapter-encapsulation-test-app/services/store';
import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';

class MinimalSerializer extends EmberObject {
  normalizeResponse(_, __, data) {
    return data;
  }

  serialize(snapshot) {
    return {
      data: {
        id: snapshot.id,
        type: snapshot.modelName,
        attributes: snapshot.attributes(),
      },
    };
  }
}

class Person extends Model {
  @attr
  firstName;

  @attr
  lastName;
}

module('integration/queries - Queries Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  test('store.findRecord calls adapter.findRecord w/correct args', async function (assert) {
    let findRecordCalled = 0;
    let expectedResult = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };
    let { owner } = this;
    let store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    let expectedResultCopy = deepCopy(expectedResult);

    class TestFindRecordAdapter extends EmberObject {
      findRecord(passedStore, type, id, snapshot) {
        findRecordCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to findRecord');
        assert.strictEqual(type, Person, 'model is passed to findRecord');
        assert.strictEqual(id, '12', 'id is passed to findRecord');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.strictEqual(snapshot.id, '12', 'snapshot is passed to findRecord with correct id');

        return resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let record = await store.findRecord('person', '12');

    assert.strictEqual(findRecordCalled, 1, 'findRecord is called once');
    assert.deepEqual(record.serialize(), expectedResult, 'findRecord returns expected result');
  });

  test('store.findAll calls adapter.findAll w/correct args', async function (assert) {
    let findAllCalled = 0;
    let expectedResult = {
      data: [
        {
          id: '12',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
        {
          id: '19',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      ],
    };

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    let expectedResultCopy = deepCopy(expectedResult);

    let { owner } = this;
    let store = owner.lookup('service:store');

    class TestFindAllAdapter extends EmberObject {
      findAll(passedStore, type, sinceToken, snapshot) {
        findAllCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to findAll');
        assert.strictEqual(type, Person, 'model is passed to findAll');
        assert.strictEqual(sinceToken, null, 'sinceToken passed to findAll is null');
        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findAll with correct modelName');
        assert.strictEqual(snapshot.length, 0, 'snapshot is passed to findAll represnts empty array');

        return resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindAllAdapter);

    let manyArray = await store.findAll('person');

    let result = manyArray.slice().map((person) => person.serialize());
    expectedResult = expectedResult.data.map((person) => ({ data: person }));

    assert.strictEqual(findAllCalled, 1, 'findAll is called once');
    assert.deepEqual(result, expectedResult, 'findAll returns expected result');
  });

  test('store.queryRecord calls adapter.queryRecord w/correct args', async function (assert) {
    let queryRecordCalled = 0;
    let expectedResult = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };
    let { owner } = this;
    let store = owner.lookup('service:store');

    class TestQueryRecordAdapter extends EmberObject {
      queryRecord(passedStore, type, query, options) {
        queryRecordCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to queryRecord');
        assert.strictEqual(type, Person, 'model is passed to queryRecord');
        assert.deepEqual(query, { firstName: 'Gaurav' }, 'query is passed to queryRecord');
        assert.deepEqual(options, {}, 'options is passsed to queryRecord');

        return resolve(expectedResult);
      }
    }

    owner.register('adapter:application', TestQueryRecordAdapter);

    let record = await store.queryRecord('person', { firstName: 'Gaurav' });

    assert.strictEqual(queryRecordCalled, 1, 'queryRecord is called once');
    assert.deepEqual(record.serialize(), expectedResult, 'queryRecord returns expected result');
  });

  test('store.query calls adapter.query w/correct args', async function (assert) {
    let queryCalled = 0;
    let expectedResult = {
      data: [
        {
          id: '14',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Tse',
          },
        },
        {
          id: '19',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      ],
    };
    let { owner } = this;
    let store = owner.lookup('service:store');

    class TestQueryAdapter extends EmberObject {
      query(passedStore, type, query, recordArray, options) {
        queryCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to query');
        assert.strictEqual(type, Person, 'model is passed to query');
        assert.deepEqual(query, { firstName: 'Chris' }, 'query is passed to query');
        assert.deepEqual(recordArray.slice(), [], 'recordArray is passsed to query');
        assert.deepEqual(options, {}, 'options is passed to query');

        return resolve(expectedResult);
      }
    }

    owner.register('adapter:application', TestQueryAdapter);

    let manyArray = await store.query('person', { firstName: 'Chris' });

    let result = manyArray.slice().map((person) => person.serialize());
    expectedResult = expectedResult.data.map((person) => ({ data: person }));

    assert.strictEqual(queryCalled, 1, 'query is called once');
    assert.deepEqual(result, expectedResult, 'query returns expected result');
  });
});
