import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import type { AsyncBelongsTo, AsyncHasMany } from '@ember-data/model';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import { ResourceType } from '@warp-drive/core-types/symbols';

type RID = { type: string; id: string };

class Car extends Model {
  @attr()
  declare color: string;

  declare [ResourceType]: 'car' | 'ferrari' | 'bmw';
}

class Ferrari extends Car {
  [ResourceType] = 'ferrari' as const;
}
class Bmw extends Car {
  [ResourceType] = 'bmw' as const;
}

class Dealership extends Model {
  @attr
  declare name: string;

  @belongsTo<Car>('car', { polymorphic: true, async: true, inverse: null })
  declare bestCar: AsyncBelongsTo<Car>;

  @hasMany<Car>('car', { polymorphic: true, async: true, inverse: null })
  declare allCars: AsyncHasMany<Car>;

  declare [ResourceType]: 'dealership';
}

module('Integration | Identifiers - single-table-inheritance polymorphic scenarios', function (hooks) {
  /*
    In single-table polymorphism, each polymorphic type shares a common primaryKey field.
      This is typically implemented in Databases as a single-table of which `type` is
      just a field to filter by.

    As such, in a single-table setup the exact same data can be represented by both a type
      and the base type.

    A common example is `bmw` and `ferrari` being polymorphic types implementing `car`.
      In this case it is not possible for a `bwm` and a `ferrari` to share an identical `id`.
      This results in it being true that `bmw:2` is the same record as `car:2` and `ferrari:1`
      is the same record as `car:1`
  */
  setupTest(hooks);

  module('single-table', function (innerHooks) {
    let store: Store;

    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload: unknown) {
        return payload;
      }
    }

    innerHooks.beforeEach(function () {
      const { owner } = this;

      owner.register('serializer:application', TestSerializer);
      owner.register('model:car', Car);
      owner.register('model:ferrari', Ferrari);
      owner.register('model:bmw', Bmw);
      owner.register('model:dealership', Dealership);

      store = owner.lookup('service:store') as Store;
    });

    test(`Identity of polymorphic relations can change type on first load`, async function (assert) {
      const { owner } = this;
      class TestAdapter extends Adapter {
        override shouldBackgroundReloadRecord() {
          return false;
        }
        override findRecord(_, __, id: string) {
          return Promise.resolve({
            data: {
              id,
              type: 'ferrari',
              attributes: {
                color: 'red',
              },
            },
          });
        }
      }
      owner.register('adapter:application', TestAdapter);

      const foundFerrari = await store.findRecord<Car>('car', '1');
      assert.strictEqual(
        (foundFerrari.constructor as unknown as { modelName: string }).modelName,
        'ferrari',
        'We found the right type'
      );
      assert.strictEqual(recordIdentifierFor(foundFerrari).type, 'ferrari', 'We ended with the correct type');

      const cachedFerrari = store.peekRecord<Ferrari>('ferrari', '1');
      assert.strictEqual(
        (cachedFerrari?.constructor as unknown as { modelName: string }).modelName,
        'ferrari',
        'We cached the right type'
      );
      assert.strictEqual(recordIdentifierFor(cachedFerrari).type, 'ferrari', 'We ended with the correct type');
      assert.strictEqual(foundFerrari, cachedFerrari, 'We have the same car');
    });

    test(`Identity of polymorphic relations can change type when in cache`, async function (assert) {
      const { owner } = this;
      const requests: RID[] = [];
      const expectedRequests = [
        { id: '1', type: 'ferrari' },
        { id: '1', type: 'car' },
        { id: '2', type: 'bmw' },
        { id: '2', type: 'car' },
      ];
      class TestAdapter extends Adapter {
        override shouldBackgroundReloadRecord() {
          return false;
        }
        override findRecord(_, { modelName: type }, id: string) {
          if (type === 'dealership') {
            return Promise.resolve({
              data: {
                id: '1',
                type: 'dealership',
                attributes: {
                  name: 'Brand new* car',
                },
                relationships: {
                  bestCar: {
                    data: { id: '1', type: 'ferrari' },
                  },
                  allCars: {
                    data: [
                      { id: '1', type: 'ferrari' },
                      { id: '2', type: 'bmw' },
                    ],
                  },
                },
              },
            });
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          requests.push({ type, id });
          // return the polymorphic type instead of 'car';
          type = id === '1' ? 'ferrari' : 'bmw';
          return Promise.resolve({
            data: {
              id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              type,
              attributes: {
                color: 'red',
              },
            },
          });
        }
      }
      owner.register('adapter:application', TestAdapter);
      const topRecord = await store.findRecord<Dealership>('dealership', '1');
      const relation = await topRecord.bestCar;

      assert.strictEqual(relation?.id, '1', 'We found the right id');
      assert.strictEqual(
        (relation?.constructor as unknown as { modelName: string }).modelName,
        'ferrari',
        'We found the right type'
      );

      const foundFerrari = await store.findRecord('car', '1');
      assert.strictEqual(relation, foundFerrari, 'We found the ferrari by finding car 1');

      const allCars = await topRecord.allCars;
      assert.deepEqual(
        allCars.map((c) => {
          return { id: c.id, type: (c.constructor as unknown as { modelName: string }).modelName };
        }),
        [
          { id: '1', type: 'ferrari' },
          { id: '2', type: 'bmw' },
        ],
        'We fetched all the right cars'
      );
      const bmw = allCars.at(1);
      const foundBmw = await store.findRecord('car', '2');
      assert.strictEqual(foundBmw, bmw, 'We found the bmw by finding car 2');

      assert.deepEqual(requests, expectedRequests, 'We triggered the expected requests');
    });
  });
});
