import { get } from '@ember/object';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

const { attr, hasMany, belongsTo } = DS;

let env, store, Elder, MiddleAger, Kid;

module('integration/relationships/nested_relationships_test - Nested relationships', {
  beforeEach() {
    Elder = DS.Model.extend({
      name: attr('string'),
      middleAgers: hasMany('middle-ager')
    });

    MiddleAger = DS.Model.extend({
      name: attr('string'),
      elder: belongsTo('elder'),
      kids: hasMany('kid')
    });

    Kid = DS.Model.extend({
      name: attr('string'),
      middleAger: belongsTo('middle-ager')
    });

    env = setupStore({
      elder: Elder,
      'middle-ager': MiddleAger,
      kid: Kid,
      adapter: DS.JSONAPIAdapter
    });

    store = env.store;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test('Sideloaded nested relationships load correctly', function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => { return false; };
  run(() => {
    store.push({
      data: {
        id: '1',
        type: 'kid',
        links: {
          self: '/kids/1'
        },
        attributes: {
          name: 'Kid 1'
        },
        relationships: {
          middleAger: {
            links: {
              self: '/kids/1/relationships/middle-ager',
              related: '/kids/1/middle-ager'
            },
            data:{
              type: 'middle-ager',
              id: '1'
            }
          }
        }
      },
      included: [
        {
          id: '1',
          type: 'middle-ager',
          links: {
            self: '/middle-ager/1'
          },
          attributes: {
            name: 'Middle Ager 1'
          },
          relationships: {
            elder: {
              links: {
                self: '/middle-agers/1/relationships/elder',
                related: '/middle-agers/1/elder'
              },
              data: {
                type: 'elder',
                id: '1'
              }
            },
            kids: {
              links: {
                self: '/middle-agers/1/relationships/kids',
                related: '/middle-agers/1/kids'
              },
              data: [
                {
                  type: 'kid',
                  id: '1'
                }
              ]
            }
          }
        },

        {
          id: '1',
          type: 'elder',
          links: {
            self: '/elders/1'
          },
          attributes: {
            name: 'Elder 1'
          },
          relationships: {
            middleAger: {
              links: {
                self: '/elders/1/relationships/middle-agers',
                related: '/elders/1/middle-agers'
              }
            }
          }
        }
      ]
    });
  });

  return run(() => {
    let kid = store.peekRecord('kid', '1');

    return kid.get('middleAger').then(middleAger => {
      assert.ok(middleAger, 'MiddleAger relationship was set up correctly');

      let middleAgerName = get(middleAger, 'name');
      assert.equal(middleAgerName, 'Middle Ager 1', 'MiddleAger name is there');
      assert.ok(middleAger.get('kids').includes(kid));

      return middleAger.get('elder').then(elder => {
        assert.notEqual(elder, null, 'Elder relationship was set up correctly');
        let elderName = get(elder, 'name');
        assert.equal(elderName, 'Elder 1', 'Elder name is there');
      });
    });
  });
});

