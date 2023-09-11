import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/adapter - Finding Records', function (hooks) {
  setupTest(hooks);

  test("When a single record is requested, the adapter's find method should be called unless it's loaded.", async function (assert) {
    assert.expect(2);

    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let count = 0;

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord(_, type) {
          assert.strictEqual(type, Person, 'the find method is called with the correct type');
          assert.strictEqual(count, 0, 'the find method is only called once');

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
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    const store = this.owner.lookup('service:store');

    let promise1 = store.findRecord('person', '1');
    let promise2 = store.findRecord('person', '1');

    await promise1;
    await promise2;
  });

  test('When a single record is requested multiple times, all .findRecord() calls are resolved after the promise is resolved', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let resolveFindRecordPromise;
    let findRecordPromise = new Promise((resolve) => (resolveFindRecordPromise = resolve));

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return findRecordPromise;
        },
      })
    );

    let store = this.owner.lookup('service:store');

    let firstPlayerRequest = store.findRecord('person', '1').then(function (firstPlayerRequest) {
      assert.strictEqual(firstPlayerRequest.id, '1');
      assert.strictEqual(firstPlayerRequest.name, 'Totono Grisales');
    });

    let secondPlayerRequest = store.findRecord('person', '1').then(function (secondPlayerRequest) {
      assert.strictEqual(secondPlayerRequest.id, '1');
      assert.strictEqual(secondPlayerRequest.name, 'Totono Grisales');
    });

    resolveFindRecordPromise({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Totono Grisales',
        },
      },
    });

    await Promise.allSettled([firstPlayerRequest, secondPlayerRequest]);
  });

  test('When a single record is requested, and the promise is rejected, .findRecord() is rejected.', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return Promise.reject();
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

  test('When a single record is requested, and the promise is rejected, the record should be unloaded.', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return Promise.reject();
        },
      })
    );

    const store = this.owner.lookup('service:store');

    try {
      await store.findRecord('person', '1');
      assert.ok(false, 'We expected to throw but did not');
    } catch (e) {
      assert.ok(true, 'The rejection handler was called');
      assert.strictEqual(store.peekRecord('person', '1'), null, 'The record has been unloaded');
    }
  });

  testInDebug('When a single record is requested, and the payload is blank', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord: () => Promise.resolve({}),
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

  testInDebug('When multiple records are requested, and the payload is blank', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
    this.owner.register(
      'adapter:person',
      Adapter.extend({
        coalesceFindRequests: true,
        findMany: () => Promise.resolve({}),
      })
    );

    const store = this.owner.lookup('service:store');
    const promises = [store.findRecord('person', '1'), store.findRecord('person', '2')];

    try {
      await Promise.all(promises);
    } catch (e) {
      const expectedMessageRegex =
        "Assertion Failed: You made a 'findMany' request for 'person' records with ids '[1,2]', but the adapter's response did not have any data";

      assert.strictEqual(expectedMessageRegex, e.message, 'error has the correct error message');
    }
  });

  testInDebug('warns when returned record has different id', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
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

    await assert.expectWarning(async () => {
      await store.findRecord('person', 'me');
    }, /You requested a record of type 'person' with id 'me' but the adapter returned a payload with primary data having an id of '1'/);
  });

  testInDebug('coerces ids before warning when returned record has different id', async function (assert) {
    class Person extends Model {
      @attr('string') name;
    }

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
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
              id: '1',
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

    await assert.expectNoWarning(
      async () => await store.findRecord('person', '1'),
      /You requested a record of type 'person' with id '1' but the adapter returned a payload with primary data having an id of '1'/
    );
    await assert.expectNoWarning(
      async () => await store.findRecord('person', '1'),
      /You requested a record of type 'person' with id '1' but the adapter returned a payload with primary data having an id of '1'/
    );
  });
});
