import { run } from '@ember/runloop';
import { Promise } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';

import {
  reset as resetModelFactoryInjection
} from 'dummy/tests/helpers/model-factory-injection';
import { module, test } from 'qunit';

import DS from 'ember-data';

const { hasMany, belongsTo } = DS;

let env, store, User, Organisation;

module("integration/relationship/json-api-links Relationships loaded by links", {
  beforeEach() {
    User = DS.Model.extend({
      organisation: belongsTo('organisation', {inverse: null})
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

    store = env.store;

    User = store.modelFor('user');
    Organisation = store.modelFor('organisation');
  },

  afterEach() {
    
    resetModelFactoryInjection();
    run(env.container, 'destroy');
  }
});

test("Loading link with inverse:null on other model caches the two ends separately", function(assert) {
  env.registry.register('adapter:user', DS.JSONAPISerializer.extend({
    findRecord (store, type, id) {
      return new Promise((resolve) => {
        run.later(() => {
          resolve({
            data: {
              id,
              type: 'user',
              relationships: {
                organisation: {
                  data: {id: 1, type: 'organisation'}
                }
              }
            }              
          })
        }, 10);
      });
    }
  }));

  env.registry.register('adapter:organisation', DS.JSONAPISerializer.extend({
    findRecord (store, type, id) {
      return new Promise((resolve) => {
        run.later(() => {
          resolve({
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
          })
        }, 10);
      });
    }
  }));

  const store = env.store;

  return run(async () => {
    const user1 = await store.findRecord('user', 1);
    assert.ok(user1, 'user should be populated');
    
    const org2FromFind = await store.findRecord('organisation', 2);

    assert.equal(user1.belongsTo('organisation').remoteType(), 'id', `user's belongsTo is based on id`);
    assert.equal(user1.belongsTo('organisation').id(), 1, `user's belongsTo has its id populated`);

    const orgFromUser = await user1.get('organisation');
    assert.equal(user1.belongsTo('organisation').belongsToRelationship.hasLoaded, true, 'user should have loaded its belongsTo relationship');
    
    assert.ok(orgFromUser, 'user\'s organisation should be populated');
  });
});
