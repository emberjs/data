import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('integration/relationships/nested_relationships_test - Nested relationships', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Elder = Model.extend({
      name: attr('string'),
      middleAgers: hasMany('middle-ager', { async: true, inverse: 'elder' }),
    });

    const MiddleAger = Model.extend({
      name: attr('string'),
      elder: belongsTo('elder', { async: true, inverse: 'middleAgers' }),
      kids: hasMany('kid', { async: true, inverse: 'middleAger' }),
    });

    const Kid = Model.extend({
      name: attr('string'),
      middleAger: belongsTo('middle-ager', { async: true, inverse: 'kids' }),
    });

    this.owner.register('model:elder', Elder);
    this.owner.register('model:middle-ager', MiddleAger);
    this.owner.register('model:kid', Kid);
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
  });

  /*
    Server loading tests
  */

  test('Sideloaded nested relationships load correctly', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => {
      return false;
    };

    store.push({
      data: {
        id: '1',
        type: 'kid',
        links: {
          self: '/kids/1',
        },
        attributes: {
          name: 'Kid 1',
        },
        relationships: {
          middleAger: {
            links: {
              self: '/kids/1/relationships/middle-ager',
              related: '/kids/1/middle-ager',
            },
            data: {
              type: 'middle-ager',
              id: '1',
            },
          },
        },
      },
      included: [
        {
          id: '1',
          type: 'middle-ager',
          links: {
            self: '/middle-ager/1',
          },
          attributes: {
            name: 'Middle Ager 1',
          },
          relationships: {
            elder: {
              links: {
                self: '/middle-agers/1/relationships/elder',
                related: '/middle-agers/1/elder',
              },
              data: {
                type: 'elder',
                id: '1',
              },
            },
            kids: {
              links: {
                self: '/middle-agers/1/relationships/kids',
                related: '/middle-agers/1/kids',
              },
              data: [
                {
                  type: 'kid',
                  id: '1',
                },
              ],
            },
          },
        },

        {
          id: '1',
          type: 'elder',
          links: {
            self: '/elders/1',
          },
          attributes: {
            name: 'Elder 1',
          },
          relationships: {
            middleAger: {
              links: {
                self: '/elders/1/relationships/middle-agers',
                related: '/elders/1/middle-agers',
              },
            },
          },
        },
      ],
    });

    let kid = store.peekRecord('kid', '1');
    const middleAger = await kid.middleAger;
    assert.ok(middleAger, 'MiddleAger relationship was set up correctly');

    let middleAgerName = middleAger.name;
    let kids = await middleAger.kids;
    assert.strictEqual(middleAgerName, 'Middle Ager 1', 'MiddleAger name is there');
    assert.ok(kids.includes(kid));

    const elder = await middleAger.elder;
    assert.notEqual(elder, null, 'Elder relationship was set up correctly');
    let elderName = elder.name;
    assert.strictEqual(elderName, 'Elder 1', 'Elder name is there');
  });
});
