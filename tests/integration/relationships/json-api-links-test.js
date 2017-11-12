import { run } from '@ember/runloop';
import { Promise } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';

import {
//  setup as setupModelFactoryInjections,
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
    console.log('------END OF TEST-----')
    
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

    // assert.equal(user1.belongsTo('organisation').remoteType(), 'id');
    //assert.equal(user1.belongsTo('organisation').id(), 1);

    // console.log('before', JSON.stringify(store._relationshipsPayloads._cache['user:organisation']._lhsPayloads, null, 2));
    // console.log('before', JSON.stringify(store._relationshipsPayloads._cache['user:organisation']._rhsPayloads, null, 2));
    
    console.log('--- BREAK IT HERE ---');
    const org2FromFind = await store.findRecord('organisation', 2);
    console.log('--- BROKEN IT ---');
    // assert.ok(org2FromFind, 'organisation should be found with findRecord');
//    console.log('after', store._relationshipsPayloads, null, 2);
    
//    assert.equal(user1.belongsTo('organisation').belongsToRelationship.hasData, true, 'user belongsTo relationship should have data after finding org');
    assert.equal(user1.belongsTo('organisation').remoteType(), 'id', `user's belongsTo is based on id`);
    assert.equal(user1.belongsTo('organisation').id(), 1, `user's belongsTo has its id populated`);
    const orgFromUser = await user1.get('organisation');
    assert.equal(user1.belongsTo('organisation').belongsToRelationship.hasLoaded, true, 'user should have loaded its belongsTo relationship');
    
    assert.ok(orgFromUser, 'user\'s organisation should be populated');
  });
});


// test("Loading one object with embedded relationship does not affect a many-array loaded by a link", function(assert) {

//   env.registry.register('adapter:organisation', DS.JSONAPISerializer.extend({
//     shouldReloadAll() {
//       return true;
//     },

//     shouldReloadRecord() {
//       return true;
//     },

//     findAll (store, type) {
//       console.log(`findAll ${type}`)
//       return new Promise((resolve) => {
//         run.next(() => {
//           resolve({
//             data: [
//               {
//                 type: 'organisation',
//                 id: 'o1',
//                 relationships: {
//                   'admin-users': {
//                     links: {
//                       related: '/o1/org-admins'
//                     }
//                   }
//                 }
//               },  
//               {
//                 type: 'organisation',
//                 id: 'o2',
//                 relationships: {
//                   'admin-users': {
//                     links: {
//                       related: '/o2/org-admins'
//                     }
//                   }
//                 }
//               }
//             ]
//           })
//         });
//       });
//     },

//     findHasMany(store, snapshot, url, relationship) {
//       console.log(`findHasMany ${snapshot.type} ${snapshot.id} ${url} ${relationship}`)
//       return new Promise((resolve) => {
//         run.next(() => {
//           resolve({
//             data: [{
//               id: 'u1',
//               type: 'user'
//             }]
//           });
//         });
//       });
//     },

//     findRecord (store, type, id) {
//       console.log(`findRecord ${type} ${id}`)
//       return new Promise((resolve) => {
//         run.next(() => {
//           resolve({
//             data: {
//               type: 'organisation',
//               id,
//               relationships: {
//                 'admin-users': {
//                   data: [{
//                     id: 'u1',
//                     type: 'user',
//                     attributes: {},
//                     relationships: {
//                       organisation: {
//                         data: {
//                           id: 'o1',
//                           type: 'organisation'
//                         }
//                       }
//                     }
//                   }]
//                 }
//               }
//             }
//           })
//         });
//       });
//     }
//   }));

//   const store = env.store;

//   return run(() => {
//     return store.findAll('organisation')
//     .then(organisations => {
//       // at this point the users arrays should not be loaded
//       const org1 = store.peekRecord('organisation', 'o1');
//       return store.findRecord('organisation', 'o2')
//       .then(org2 => {
//         // org2 was loaded with its users embedded
//         // so its users should be loaded
//         console.log(org1.hasMany('adminUsers'));
//         console.log(org2.hasMany('adminUsers'));
//         assert.equal(org2.hasMany('adminUsers').hasManyRelationship.hasLoaded, true, 'org2\'s users are loaded');
//         // but org1's users should not
//         assert.equal(org1.hasMany('adminUsers').hasManyRelationship.hasLoaded, false, 'org1\'s users are not loaded');
//       })
//     });
//   });
// });