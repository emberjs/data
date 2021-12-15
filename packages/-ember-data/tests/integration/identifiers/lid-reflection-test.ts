import { module, test } from 'qunit';
import { defer, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { RECORD_DATA_STATE } from '@ember-data/canary-features';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import Store, { recordIdentifierFor } from '@ember-data/store';

module('Integration | Identifiers - lid reflection', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register(`service:store`, Store);

    class User extends Model {
      @attr() name;
      @attr() age;
    }

    owner.register('model:user', User);
    store = owner.lookup('service:store');
  });

  test(`We can access the lid when serializing a record`, async function (assert) {
    class TestSerializer extends Serializer {
      serialize(snapshot) {
        // TODO should snapshots have direct access to the identifier?
        const identifier = recordIdentifierFor(snapshot.record);
        return {
          type: snapshot.modelName,
          id: snapshot.id,
          lid: identifier.lid,
          attributes: {
            name: snapshot.attr('name'),
          },
        };
      }
    }
    this.owner.register('serializer:application', TestSerializer);

    const record = store.createRecord('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);
    const serialized = record.serialize();

    assert.ok(identifier.lid !== null, 'We have an lid');
    assert.strictEqual(serialized.lid, identifier.lid, 'We have the right lid');
  });

  test(`A newly created record can receive a payload by lid (no save ever called)`, async function (assert) {
    const record = store.createRecord('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);

    assert.ok(identifier.lid !== null, 'We have an lid');

    const pushedRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        lid: identifier.lid,
        attributes: {
          name: '@cthoburn',
        },
      },
    });

    assert.ok(pushedRecord === record, 'We have the same record instance');
    assert.strictEqual(record.name, 'Chris', 'We use the dirty name');
    assert.false(record.isNew, 'We are no longer in the new state');

    record.rollbackAttributes();

    assert.strictEqual(record.name, '@cthoburn', 'After rollback we use the clean name');
  });

  test(`A newly created record can receive a payload by lid (after save, before Adapter.createRecord resolves)`, async function (assert) {
    const adapterPromise = defer();
    const beganSavePromise = defer();
    class TestSerializer extends Serializer {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    class TestAdapter extends Adapter {
      createRecord(store, ModelClass, snapshot) {
        beganSavePromise.resolve();
        return adapterPromise.promise.then(() => {
          return {
            data: {
              type: 'user',
              id: '1',
              lid: recordIdentifierFor(snapshot.record).lid,
              attributes: {
                name: '@runspired',
              },
            },
          };
        });
      }
    }
    this.owner.register('serializer:application', TestSerializer);
    this.owner.register('adapter:application', TestAdapter);

    const record = store.createRecord('user', { name: 'Chris' });
    const identifier = recordIdentifierFor(record);

    assert.ok(identifier.lid !== null, 'We have an lid');

    const savePromise = record.save();

    await beganSavePromise.promise;

    const pushedRecord = store.push({
      data: {
        type: 'user',
        id: '1',
        lid: identifier.lid,
        attributes: {
          name: '@cthoburn',
          age: 31,
        },
      },
    });

    assert.ok(pushedRecord === record, 'We have the same record instance');
    assert.strictEqual(record.name, 'Chris', 'We use the in-flight name');
    assert.strictEqual(record.age, 31, 'We received the pushed data');
    if (RECORD_DATA_STATE) {
      // once the payload is received the derived state shifts to "no longer new" in the RECORD_DATA_STATE world
      assert.false(record.isNew, 'We are no longer in the new state');
    } else {
      assert.true(record.isNew, 'We are still in the new state');
    }

    record.rollbackAttributes();

    assert.strictEqual(record.name, 'Chris', 'We use the in-flight name, rollback has no effect');

    adapterPromise.resolve();
    await savePromise;

    assert.strictEqual(record.name, '@runspired', 'After we finish we use the most recent clean name');
  });

  test('hasMany() has correct state after .save() on a newly created record with sideposted child record when lid is provided in the response payload', async function (assert) {
    class Ingredient extends Model {
      @attr name;
      @belongsTo('cake') cake;
    }

    class Cake extends Model {
      @attr name;
      @hasMany('ingredient', { inverse: null, async: false }) ingredients;
    }

    this.owner.register('model:ingredient', Ingredient);
    this.owner.register('model:cake', Cake);

    class TestSerializer extends Serializer {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }

    class TestAdapter extends Adapter {
      createRecord(store, ModelClass, snapshot) {
        const cakeLid = recordIdentifierFor(snapshot.record).lid;
        const ingredientLid = recordIdentifierFor(snapshot.record.ingredients.firstObject).lid;
        return resolve({
          data: {
            type: 'cake',
            id: '1',
            lid: cakeLid,
            attributes: {
              name: 'Cheesecake',
            },
            relationships: {
              ingredients: {
                data: [
                  {
                    type: 'ingredient',
                    id: '2',
                    lid: ingredientLid,
                  },
                ],
              },
            },
          },
          included: [
            {
              type: 'ingredient',
              id: '2',
              lid: ingredientLid,
              attributes: {
                name: 'Cheese',
              },
              relationships: {
                cake: {
                  data: {
                    type: 'cake',
                    id: '1',
                    lid: cakeLid,
                  },
                },
              },
            },
          ],
        });
      }
    }
    this.owner.register('serializer:application', TestSerializer);
    this.owner.register('adapter:application', TestAdapter);

    const cheese = store.createRecord('ingredient', { name: 'Cheese' });
    const cake = store.createRecord('cake', { name: 'Cheesecake', ingredients: [cheese] });

    // Consume ids before save() to check for update errors
    assert.strictEqual(cake.id, null, 'cake id is initially null');
    assert.strictEqual(cheese.id, null, 'cheese id is initially null');

    await cake.save();

    assert.deepEqual(cake.hasMany('ingredients').ids(), ['2']);
    assert.strictEqual(cake.ingredients.objectAt(0).name, 'Cheese');

    assert.strictEqual(cake.id, '1', 'cake has the correct id');
    assert.strictEqual(cheese.id, '2', 'cheese has the correct id');
  });

  test('belongsTo() has correct state after .save() on a newly created record with sideposted child record when lid is provided in the response payload', async function (assert) {
    class Topping extends Model {
      @attr name;
    }

    class Cake extends Model {
      @attr name;
      @belongsTo('topping', { inverse: null, async: false }) topping;
    }

    this.owner.register('model:topping', Topping);
    this.owner.register('model:cake', Cake);

    class TestSerializer extends Serializer {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }

    class TestAdapter extends Adapter {
      createRecord(store, ModelClass, snapshot) {
        const lid = recordIdentifierFor(snapshot.record.topping).lid;
        return resolve({
          data: {
            type: 'cake',
            id: '1',
            attributes: {
              name: 'Cheesecake',
            },
            relationships: {
              topping: {
                data: {
                  type: 'topping',
                  id: '2',
                  lid,
                },
              },
            },
          },
          included: [
            {
              type: 'topping',
              id: '2',
              lid,
              attributes: {
                name: 'Cheese',
              },
              relationships: {
                cake: {
                  data: {
                    type: 'cake',
                    id: '1',
                  },
                },
              },
            },
          ],
        });
      }
    }
    this.owner.register('serializer:application', TestSerializer);
    this.owner.register('adapter:application', TestAdapter);

    const cheese = store.createRecord('topping', { name: 'Cheese' });
    const cake = store.createRecord('cake', { name: 'Cheesecake', topping: cheese });

    await cake.save();

    assert.deepEqual(cake.belongsTo('topping').id(), '2');
    assert.equal(cake.topping.name, 'Cheese');
  });
});
