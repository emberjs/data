import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { IDENTIFIERS } from '@ember-data/canary-features';
import Store from '@ember-data/store';
import Model, { attr, belongsTo } from '@ember-data/model';
import Adapter from '@ember-data/adapter';
import Serializer from '@ember-data/serializer';
import { resolve } from 'rsvp';

if (IDENTIFIERS) {
  module('Integration | Identifiers - polymorphic scenarios', function(hooks) {
    setupTest(hooks);

    module('single-table', function(hooks) {
      let store;
      let calls;
      class TestSerializer extends Serializer {
        normalizeResponse(_, __, payload) {
          return payload;
        }
      }
      class TestAdapter extends Adapter {
        shouldBackgroundReloadRecord() {
          return false;
        }
      }

      class CarAdapter extends TestAdapter {
        findRecord() {
          return resolve({
            data: {
              id: '1',
              type: 'ferrari',
              attributes: {
                color: 'red'
              },
            },
          });
        }
      }

      class FerrariAdapter extends TestAdapter {
        findRecord() {
          return resolve({
            data: {
              id: '1',
              type: 'ferrari',
              attributes: {
                color: 'red'
              },
            },
          });
        }
      }

      class DealershipAdapter extends TestAdapter {
        findRecord() {
          return resolve({
            data: {
              id: '1',
              type: 'dealership',
              attributes: {
                name: 'Brand new* car'
              },
              relationships: {
                car: {
                  data: { id: 1, type: 'ferrari' },
                },
              },
            }
          });
        }
      }

      hooks.beforeEach(function() {
        const { owner } = this;

        class Car extends Model {
          @attr() color: string;
        }

        class Ferrari extends Car {
          @attr() color: string;
        }

        class Dealership extends Model {
          @attr() name: string;
          @belongsTo("car", { polymorphic: true }) car;
        }

        owner.register('adapter:car', CarAdapter);
        owner.register('adapter:ferrari', FerrariAdapter);
        owner.register('adapter:dealership', DealershipAdapter);
        owner.register('serializer:application', TestSerializer);
        owner.register('model:car', Car);
        owner.register('model:ferrari', Ferrari);
        owner.register('model:dealership', Dealership);
        owner.register('service:store', Store);

        store = owner.lookup('service:store');

      });

      test(`Identity of polymorphic relations can change type`, async function(assert) {
        const topRecord = await store.findRecord('dealership', '1');
        const relation = await topRecord.get('car');

        assert.strictEqual(relation.id, '1');

        const foundRecord = await store.findRecord('car', '1');
        assert.strictEqual(foundRecord.id, '1');
      });
    });
  });
}
