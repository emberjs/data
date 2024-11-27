import EmberObject from '@ember/object';

import Store from 'ember-data__adapter/services/store';

import Model, { attr } from '@ember-data/model';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

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

  test('options passed to adapters by LegacyHandler are mutable', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    const expectedResult = {
      id: '19',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    };

    class TestAdapter extends EmberObject {
      query(passedStore, type, query, recordArray, adapterOptions) {
        assert.deepEqual(query, { initialOption: 'foo' }, 'original query is passed to adapter');

        query.initialOption = 'bar';
        adapterOptions ||= {};
        adapterOptions.otherOption = 'baz';

        assert.equal(query.initialOption, 'bar', 'query is mutated');
        assert.equal(adapterOptions.otherOption, 'baz', 'adapterOptions is mutated');

        return Promise.resolve({
          data: [expectedResult],
        });
      }
      queryRecord(passedStore, type, query, record, adapterOptions) {
        assert.deepEqual(query, { initialOption: 'foo' }, 'original query is passed to adapter');

        query.initialOption = 'bar';
        adapterOptions ||= {};
        adapterOptions.otherOption = 'baz';

        assert.equal(query.initialOption, 'bar', 'query is mutated');
        assert.equal(adapterOptions.otherOption, 'baz', 'adapterOptions is mutated');

        return Promise.resolve({
          data: expectedResult,
        });
      }
    }

    owner.register('adapter:application', TestAdapter);

    for (const method of ['query', 'queryRecord']) {
      const result = await store[method]('person', { initialOption: 'foo' });
      assert.ok(result, `result is returned for ${method}`);
    }
  });

  test('store.findRecord calls adapter.findRecord w/correct args', async function (assert) {
    let findRecordCalled = 0;
    const expectedResult = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };
    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultCopy = structuredClone(expectedResult);

    class TestFindRecordAdapter extends EmberObject {
      findRecord(passedStore, type, id, snapshot) {
        findRecordCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Person, 'model is passed to findRecord');
        assert.equal(id, '12', 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, '12', 'snapshot is passed to findRecord with correct id');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const record = await store.findRecord('person', '12');

    assert.equal(findRecordCalled, 1, 'findRecord is called once');
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
    const expectedResultCopy = structuredClone(expectedResult);

    const { owner } = this;
    const store = owner.lookup('service:store');

    class TestFindAllAdapter extends EmberObject {
      findAll(passedStore, type, sinceToken, snapshot) {
        findAllCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findAll');
        assert.equal(type, Person, 'model is passed to findAll');
        assert.equal(sinceToken, null, 'sinceToken passed to findAll is null');
        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findAll with correct modelName');
        assert.equal(snapshot.length, 0, 'snapshot is passed to findAll represnts empty array');

        return Promise.resolve(expectedResultCopy);
      }
    }

    owner.register('adapter:application', TestFindAllAdapter);

    const manyArray = await store.findAll('person');

    const result = manyArray.slice().map((person) => person.serialize());
    expectedResult = expectedResult.data.map((person) => ({ data: person }));

    assert.equal(findAllCalled, 1, 'findAll is called once');
    assert.deepEqual(result, expectedResult, 'findAll returns expected result');
  });

  test('store.queryRecord calls adapter.queryRecord w/correct args', async function (assert) {
    let queryRecordCalled = 0;
    const expectedResult = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };
    const { owner } = this;
    const store = owner.lookup('service:store');

    class TestQueryRecordAdapter extends EmberObject {
      queryRecord(passedStore, type, query, options) {
        queryRecordCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to queryRecord');
        assert.equal(type, Person, 'model is passed to queryRecord');
        assert.deepEqual(query, { firstName: 'Gaurav' }, 'query is passed to queryRecord');
        assert.deepEqual(options, {}, 'options is passsed to queryRecord');

        return Promise.resolve(expectedResult);
      }
    }

    owner.register('adapter:application', TestQueryRecordAdapter);

    const record = await store.queryRecord('person', { firstName: 'Gaurav' });

    assert.equal(queryRecordCalled, 1, 'queryRecord is called once');
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
    const { owner } = this;
    const store = owner.lookup('service:store');

    class TestQueryAdapter extends EmberObject {
      query(passedStore, type, query, recordArray, options) {
        queryCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to query');
        assert.equal(type, Person, 'model is passed to query');
        assert.deepEqual(query, { firstName: 'Chris' }, 'query is passed to query');
        assert.deepEqual(recordArray.slice(), [], 'recordArray is passsed to query');
        assert.deepEqual(options, {}, 'options is passed to query');

        return Promise.resolve(expectedResult);
      }
    }

    owner.register('adapter:application', TestQueryAdapter);

    const manyArray = await store.query('person', { firstName: 'Chris' });

    const result = manyArray.slice().map((person) => person.serialize());
    expectedResult = expectedResult.data.map((person) => ({ data: person }));

    assert.equal(queryCalled, 1, 'query is called once');
    assert.deepEqual(result, expectedResult, 'query returns expected result');
  });
});
