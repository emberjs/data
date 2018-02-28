import { run } from '@ember/runloop';
import { resolve } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';

import {
  reset as resetModelFactoryInjection
} from 'dummy/tests/helpers/model-factory-injection';
import { module, test } from 'qunit';

import DS from 'ember-data';

const { hasMany, belongsTo } = DS;

let env, User, Organisation;

module("integration/relationship/json-api-links Relationships loaded by links", {
  beforeEach() {
  },

  afterEach() {
    resetModelFactoryInjection();
    run(env.container, 'destroy');
  }
});

test("Loading link with inverse:null on other model caches the two ends separately", function (assert) {
  User = DS.Model.extend({
    organisation: belongsTo('organisation', { inverse: null })
  });

  Organisation = DS.Model.extend({
    adminUsers: hasMany('user')
  });

  env = setupStore({
    user: User,
    organisation: Organisation
  });

  env.registry.optionsForType('serializer', { singleton: false });
  env.registry.optionsForType('adapter', { singleton: false });

  const store = env.store;

  User = store.modelFor('user');
  Organisation = store.modelFor('organisation');

  env.registry.register('adapter:user', DS.JSONAPISerializer.extend({
    findRecord(store, type, id) {
      return resolve({
        data: {
          id,
          type: 'user',
          relationships: {
            organisation: {
              data: { id: 1, type: 'organisation' }
            }
          }
        }
      });
    }
  }));

  env.registry.register('adapter:organisation', DS.JSONAPISerializer.extend({
    findRecord(store, type, id) {
      return resolve({
        data: {
          type: 'organisation',
          id,
          relationships: {
            'admin-users': {
              links: {
                related: '/org-admins'
              }
            }
          }
        }
      });
    }
  }));

  return run(() => {
    return store.findRecord('user', 1)
      .then(user1 => {
        assert.ok(user1, 'user should be populated');

        return store.findRecord('organisation', 2)
          .then(org2FromFind => {
            assert.equal(user1.belongsTo('organisation').remoteType(), 'id', `user's belongsTo is based on id`);
            assert.equal(user1.belongsTo('organisation').id(), 1, `user's belongsTo has its id populated`);

            return user1.get('organisation')
              .then(orgFromUser => {
                assert.equal(user1.belongsTo('organisation').belongsToRelationship.hasLoaded, true, 'user should have loaded its belongsTo relationship');

                assert.ok(org2FromFind, 'organisation we found should be populated');
                assert.ok(orgFromUser, 'user\'s organisation should be populated');
              })
          })
      })
  });
});

test("Pushing child record should not mark parent:children as loaded", function (assert) {
  let Child = DS.Model.extend({
    parent: belongsTo('parent', { inverse: 'children' })
  });

  let Parent = DS.Model.extend({
    children: hasMany('child')
  });

  env = setupStore({
    parent: Parent,
    child: Child
  });

  env.registry.optionsForType('serializer', { singleton: false });
  env.registry.optionsForType('adapter', { singleton: false });

  const store = env.store;

  Parent = store.modelFor('parent');
  Child = store.modelFor('child');

  return run(() => {
    const parent = store.push({
      data: {
        id: 'p1',
        type: 'parent',
        relationships: {
          children: {
            links: {
              related: '/parent/1/children'
            }
          }
        }
      }
    });

    store.push({
      data: {
        id: 'c1',
        type: 'child',
        relationships: {
          parent: {
            data: {
              id: 'p1',
              type: 'parent'
            }
          }
        }
      }
    });

    assert.equal(parent.hasMany('children').hasManyRelationship.hasLoaded, false, 'parent should think that children still needs to be loaded');
  });
});
