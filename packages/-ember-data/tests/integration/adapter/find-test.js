import { Promise, reject, defer, resolve, all } from 'rsvp';
import { run } from '@ember/runloop';
import { setupTest } from 'ember-qunit';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import { module, test } from 'qunit';
import Adapter from 'ember-data/adapter';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import Model, { attr } from '@ember-data/model';

module('integration/adapter/find - Finding Records', function(hooks) {
  setupTest(hooks);

  testInDebug('It raises an assertion when `undefined` is passed as id (#1705)', function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    const store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      store.find('person', undefined);
    }, `You cannot pass 'undefined' as id to the store's find method`);

    assert.expectAssertion(() => {
      store.find('person', null);
    }, `You cannot pass 'null' as id to the store's find method`);
  });

  test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function(assert) {
    assert.expect(2);

    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let count = 0;

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord(_, type) {
          assert.equal(type, Person, 'the find method is called with the correct type');
          assert.equal(count, 0, 'the find method is only called once');

          count++;
          return {
            data: {
              id: '1',
              type: 'person',
              attributes: {
                name: 'Braaaahm Dale',
              },
            },
          };
        },
      })
    );
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    const store = this.owner.lookup('service:store');

    store.findRecord('person', '1');
    store.findRecord('person', '1');
  });

  test('When a single record is requested multiple times, all .findRecord() calls are resolved after the promise is resolved', function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    const deferred = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return deferred.promise;
        },
      })
    );

    this.owner.register('serializer:application', JSONAPISerializer.extend());

    const store = this.owner.lookup('service:store');
    const requestOne = store.findRecord('person', '1').then(person => {
      assert.equal(person.get('id'), '1');
      assert.equal(person.get('name'), 'Braaaahm Dale');
    });
    const requestTwo = store.findRecord('person', '1').then(post => {
      assert.equal(post.get('id'), '1');
      assert.equal(post.get('name'), 'Braaaahm Dale');
    });

    deferred.resolve({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Braaaahm Dale',
        },
      },
    });

    return Promise.all([requestOne, requestTwo]);
  });

  test('When a single record is requested, and the promise is rejected, .findRecord() is rejected.', async function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return reject();
        },
      })
    );

    const store = this.owner.lookup('service:store');

    try {
      await store.findRecord('person', '1');
      assert.ok(false, 'We expected to throw but did not');
    } catch (e) {
      assert.ok(true, 'The rejection handler was called');
    }
  });

  test('When a single record is requested, and the promise is rejected, the record should be unloaded.', async function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return reject();
        },
      })
    );

    const store = this.owner.lookup('service:store');

    try {
      await store.findRecord('person', '1');
      assert.ok(false, 'We expected to throw but did not');
    } catch (e) {
      assert.ok(true, 'The rejection handler was called');
      assert.ok(!store.hasRecordForId('person', '1'), 'The record has been unloaded');
    }
  });

  testInDebug('When a single record is requested, and the payload is blank', async function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord: () => resolve({}),
      })
    );

    const store = this.owner.lookup('service:store');

    try {
      await store.findRecord('person', 'the-id');
      assert.ok(false, 'We expected to throw but did not');
    } catch (e) {
      const expectedMessageRegex =
        "Assertion Failed: You made a 'findRecord' request for a 'person' with id 'the-id', but the adapter's response did not have any data";

      assert.strictEqual(expectedMessageRegex, e.message, 'error has the correct error message');
    }
  });

  testInDebug('When multiple records are requested, and the payload is blank', async function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        coalesceFindRequests: true,
        findMany: () => resolve({}),
      })
    );

    const store = this.owner.lookup('service:store');
    const promises = [store.findRecord('person', '1'), store.findRecord('person', '2')];

    try {
      await all(promises);
    } catch (e) {
      const expectedMessageRegex =
        "Assertion Failed: You made a 'findMany' request for 'person' records with ids '[1,2]', but the adapter's response did not have any data";

      assert.strictEqual(expectedMessageRegex, e.message, 'error has the correct error message');
    }
  });

  testInDebug('warns when returned record has different id', function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return {
            data: {
              id: '1',
              type: 'person',
              attributes: {
                name: 'Camilo Zuniga - Atletico Nacional',
              },
            },
          };
        },
      })
    );

    const store = this.owner.lookup('service:store');

    assert.expectWarning(
      () =>
        run(() => {
          store.findRecord('person', 'me');
        }),
      /You requested a record of type 'person' with id 'me' but the adapter returned a payload with primary data having an id of '1'/
    );
  });

  testInDebug('coerces ids before warning when returned record has different id', async function(assert) {
    const Person = Model.extend({
      name: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, payload) {
          return payload;
        },
      })
    );

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return {
            data: {
              id: 1,
              type: 'person',
              attributes: {
                name: 'camilo-zuniga',
              },
            },
          };
        },
      })
    );

    const store = this.owner.lookup('service:store');

    assert.expectNoWarning(
      () => run(() => store.findRecord('person', '1')),
      /You requested a record of type 'person' with id '1' but the adapter returned a payload with primary data having an id of '1'/
    );
    assert.expectNoWarning(
      () => run(() => store.findRecord('person', '1')),
      /You requested a record of type 'person' with id '1' but the adapter returned a payload with primary data having an id of '1'/
    );
  });
});
