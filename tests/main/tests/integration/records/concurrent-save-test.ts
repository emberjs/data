import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';
import Model, { attr } from '@ember-data/model';
import Store from '@ember-data/store';
import { createDeferred } from '@ember-data/request';
import type { Snapshot } from '@ember-data/legacy-compat/-private'

module('Integration | Record | concurrent saves', function(hooks) {
  setupTest(hooks);

  test('Concurrent Saves do not lose inflightattr values from earlier requests', async function(assert) {
    /*
      inflight cache state is a broken concept. Since there can only be one concurrent inflight state
      concurrent requests are theoretically impossible. Yet, we still allow them. Request handlers could
      intelligently manage inflight state on a per-request basis in a way the cache could not.

      This test is here to ensure we codify the current behavior of inflight data when concurrent requests
      do occur. This test is not meant to be a test of the ideal behavior of concurrent requests.
    */
    class User extends Model {
      @attr declare firstName: string;
      @attr declare lastName: string;
    }

    const gates = [
      createDeferred<Record<string, unknown>>(),
      createDeferred<Record<string, unknown>>()
    ];
    const savePromises = [
      createDeferred(),
      createDeferred()
    ];
    const resultPromises: Promise<User>[] = [];
    let requestCount = 0;

    this.owner.register('model:user', User);
    this.owner.register('adapter:application', class Adapter {
      async updateRecord(_store, _schema, snapshot: Snapshot) {
        assert.step('updateRecord');
        if (requestCount > gates.length) {
          throw new Error('Too many requests');
        }
        const promise = savePromises[requestCount];

        gates[requestCount++].resolve(snapshot.attributes());
        return promise.promise;
      }
      static create() { return new this(); }
    });

    const store = this.owner.lookup('service:store') as Store;
    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          firstName: 'Kristan',
          lastName: 'Huff-menne'
        }
      }
    }) as unknown as User;


    user.firstName = 'Krystan';
    resultPromises.push(user.save());
    const serialized1 = await gates[0].promise;

    assert.deepEqual(serialized1, {
      firstName: 'Krystan',
      lastName: 'Huff-menne'
    }, 'inflight attrs are correct after first request');

    user.lastName = 'HuffMenne';
    resultPromises.push(user.save());
    const serialized2 = await gates[1].promise;

    assert.deepEqual(serialized2, {
      firstName: 'Krystan',
      lastName: 'HuffMenne'
    }, 'inflight attrs are correct after second request');

    savePromises[0].resolve({
      data: {
        id: '1',
        type: 'user',
        attributes: serialized1
      }
    });
    savePromises[1].resolve({
      data: {
        id: '1',
        type: 'user',
        attributes: serialized2
      }
    });

    await Promise.all(resultPromises);

    assert.verifySteps([
      'updateRecord',
      'updateRecord'
    ], 'The correct number of requests were made');
    assert.strictEqual(user.firstName, 'Krystan', 'The first name is correct');
    assert.strictEqual(user.lastName, 'HuffMenne', 'The last name is correct');
    assert.deepEqual(user.changedAttributes(), {}, 'There are no changed attributes');
  });

  test('Concurrent Saves prefers payload response over inflightattr values when the first request resolves', async function(assert) {
/*
      inflight cache state is a broken concept. Since there can only be one concurrent inflight state
      concurrent requests are theoretically impossible. Yet, we still allow them. Request handlers could
      intelligently manage inflight state on a per-request basis in a way the cache could not.

      This test is here to ensure we codify the current behavior of inflight data when concurrent requests
      do occur. This test is not meant to be a test of the ideal behavior of concurrent requests.
    */
      class User extends Model {
        @attr declare firstName: string;
        @attr declare lastName: string;
      }

      const gates = [
        createDeferred<Record<string, unknown>>(),
        createDeferred<Record<string, unknown>>()
      ];
      const savePromises = [
        createDeferred(),
        createDeferred()
      ];
      const resultPromises: Promise<User>[] = [];
      let requestCount = 0;

      this.owner.register('model:user', User);
      this.owner.register('adapter:application', class Adapter {
        async updateRecord(_store, _schema, snapshot: Snapshot) {
          assert.step('updateRecord');
          if (requestCount > gates.length) {
            throw new Error('Too many requests');
          }
          const promise = savePromises[requestCount];

          gates[requestCount++].resolve(snapshot.attributes());
          return promise.promise;
        }
        static create() { return new this(); }
      });

      const store = this.owner.lookup('service:store') as Store;
      const user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            firstName: 'Kristan',
            lastName: 'Huff-menne'
          }
        }
      }) as unknown as User;


      user.firstName = 'Krystan';
      resultPromises.push(user.save());
      const serialized1 = await gates[0].promise;

      assert.deepEqual(serialized1, {
        firstName: 'Krystan',
        lastName: 'Huff-menne'
      }, 'inflight attrs are correct after first request');

      user.lastName = 'HuffMenne';
      resultPromises.push(user.save());
      const serialized2 = await gates[1].promise;

      assert.deepEqual(serialized2, {
        firstName: 'Krystan',
        lastName: 'HuffMenne'
      }, 'inflight attrs are correct after second request');

      savePromises[0].resolve({
        data: {
          id: '1',
          type: 'user',
          attributes: serialized1
        }
      });

      await resultPromises[0];

      assert.strictEqual(user.firstName, 'Krystan', 'The first name is correct');
      assert.strictEqual(user.lastName, 'Huff-menne', 'The last name is the old state because the first api response "reset" it');
      assert.deepEqual(user.changedAttributes(), {}, 'There are no changed attributes');

      savePromises[1].resolve({
        data: {
          id: '1',
          type: 'user',
          attributes: serialized2
        }
      });

      await resultPromises[1];

      assert.verifySteps([
        'updateRecord',
        'updateRecord'
      ], 'The correct number of requests were made');
      assert.strictEqual(user.firstName, 'Krystan', 'The first name is correct');
      assert.strictEqual(user.lastName, 'HuffMenne', 'The last name is correct');
      assert.deepEqual(user.changedAttributes(), {}, 'There are no changed attributes');
  });

  test('Concurrent Saves use incorrect inflightattr values when the first request resolves', async function(assert) {
    /*
          inflight cache state is a broken concept. Since there can only be one concurrent inflight state
          concurrent requests are theoretically impossible. Yet, we still allow them. Request handlers could
          intelligently manage inflight state on a per-request basis in a way the cache could not.

          This test is here to ensure we codify the current behavior of inflight data when concurrent requests
          do occur. This test is not meant to be a test of the ideal behavior of concurrent requests.
        */
          class User extends Model {
            @attr declare firstName: string;
            @attr declare lastName: string;
          }

          const gates = [
            createDeferred<Record<string, unknown>>(),
            createDeferred<Record<string, unknown>>()
          ];
          const savePromises = [
            createDeferred(),
            createDeferred()
          ];
          const resultPromises: Promise<User>[] = [];
          let requestCount = 0;

          this.owner.register('model:user', User);
          this.owner.register('adapter:application', class Adapter {
            async updateRecord(_store, _schema, snapshot: Snapshot) {
              assert.step('updateRecord');
              if (requestCount > gates.length) {
                throw new Error('Too many requests');
              }
              const promise = savePromises[requestCount];

              gates[requestCount++].resolve(snapshot.attributes());
              return promise.promise;
            }
            static create() { return new this(); }
          });

          const store = this.owner.lookup('service:store') as Store;
          const user = store.push({
            data: {
              id: '1',
              type: 'user',
              attributes: {
                firstName: 'Kristan',
                lastName: 'Huff-menne'
              }
            }
          }) as unknown as User;


          user.firstName = 'Krystan';
          resultPromises.push(user.save());
          const serialized1 = await gates[0].promise;

          assert.deepEqual(serialized1, {
            firstName: 'Krystan',
            lastName: 'Huff-menne'
          }, 'inflight attrs are correct after first request');

          user.lastName = 'HuffMenne';
          resultPromises.push(user.save());
          const serialized2 = await gates[1].promise;

          assert.deepEqual(serialized2, {
            firstName: 'Krystan',
            lastName: 'HuffMenne'
          }, 'inflight attrs are correct after second request');

          savePromises[0].resolve({
            data: {
              id: '1',
              type: 'user',
              attributes: {
                firstName: 'Krystan',
              }
            }
          });

          await resultPromises[0];

          assert.strictEqual(user.firstName, 'Krystan', 'The first name is correct');
          assert.strictEqual(user.lastName, 'HuffMenne', 'The last name is the new state even though the second request is still pending');
          assert.deepEqual(user.changedAttributes(), {}, 'There are no changed attributes');

          savePromises[1].resolve({
            data: {
              id: '1',
              type: 'user',
              attributes: {
                lastName: 'HuffMenne'
              }
            }
          });

          await resultPromises[1];

          assert.verifySteps([
            'updateRecord',
            'updateRecord'
          ], 'The correct number of requests were made');
          assert.strictEqual(user.firstName, 'Krystan', 'The first name is correct');
          assert.strictEqual(user.lastName, 'HuffMenne', 'The last name is correct');
          assert.deepEqual(user.changedAttributes(), {}, 'There are no changed attributes');
      });
});
