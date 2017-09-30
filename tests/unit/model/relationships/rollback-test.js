import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let env, store, Person, Dog;
const run = Ember.run;

module("unit/model/relationships/rollback - model.rollback()", {
  beforeEach() {
    Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr(),
      dogs: DS.hasMany({ async: true })
    });

    Dog = DS.Model.extend({
      name: DS.attr(),
      owner: DS.belongsTo('person', { async: true })
    });

    env = setupStore({ person: Person, dog: Dog });
    store = env.store;
  }
});

test("saved changes to relationships should not roll back to a pre-saved state (from child)", function(assert) {
  let person1, person2, dog1, dog2, dog3;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ data: { type: 'dog', id: 2, relationships: { owner: { data: { type: 'person', id: 1 } } } } });
  };

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          firstName: "Tom",
          lastName: "Dale"
        }
      }
    });
    store.push({
      data: {
        type: 'person',
        id: 2,
        attributes: {
          firstName: "John",
          lastName: "Doe"
        }
      }
    });
    store.push({
      data: {
        type: 'dog',
        id: 1,
        attributes: {
          name: "Fido"
        },
        relationships: {
          owner: {
            data: {
              type: 'person',
              id: 1
            }
          }
        }
      }
    });
    store.push({
      data: {
        type: 'dog',
        id: 2,
        attributes: {
          name: "Bear"
        },
        relationships: {
          owner: {
            data: {
              type: 'person',
              id: 2
            }
          }
        }
      }
    });
    store.push({
      data: {
        type: 'dog',
        id: 3,
        attributes: {
          name: "Spot"
        }
      }
    });
    person1 = store.peekRecord('person', 1);
    person2 = store.peekRecord('person', 2);
    dog1 = store.peekRecord('dog', 1);
    dog2 = store.peekRecord('dog', 2);
    dog3 = store.peekRecord('dog', 3);
    person1.get('dogs').addObject(dog2);
  });

  run(() => {
    dog2.save().then(() => {
      person1.get('dogs').addObject(dog3);
      dog2.rollback();
      dog3.rollback();
      person1.get('dogs').then(function (dogs) {
        assert.deepEqual(dogs.toArray(), [dog1,dog2]);
      });
      person2.get('dogs').then(function (dogs) {
        assert.deepEqual(dogs.toArray(), []);
      });
      dog1.get('owner').then(function (owner) {
        assert.equal(owner, person1);
      });
      dog2.get('owner').then(function (owner) {
        assert.equal(owner, person1);
      });
    });
  });
});

// skip("saved changes to relationships should not roll back to a pre-saved state (from parent)", function(assert) {
//   var person1, person2, dog1, dog2, dog3;
//
//   env.adapter.updateRecord = function(store, type, snapshot) {
//     return Ember.RSVP.resolve({ id: 1, dogs: [1] });
//   };
//
//   run(function() {
//     store.push({
//       data: {
//         type: 'person',
//         id: 1,
//         attributes: {
//           firstName: "Tom",
//           lastName: "Dale"
//         },
//         relationships: {
//           dogs: {
//             data: [{
//               type: 'dog',
//               id: 1
//             }]
//           }
//         }
//       }
//     });
//     store.push({
//       data: {
//         type: 'person',
//         id: 2,
//         attributes: {
//           firstName: "John",
//           lastName: "Doe"
//         },
//         relationships: {
//           dogs: {
//             data: [{
//               type: 'dog',
//               id: 2
//             }]
//           }
//         }
//       }
//     });
//     store.push({
//       data: {
//         type: 'dog',
//         id: 1,
//         attributes: {
//           name: "Fido"
//         },
//         relationships: {
//           owner: {
//             data: {
//               type: 'person',
//               id: 1
//             }
//           }
//         }
//       }
//     });
//     store.push({
//       data: {
//         type: 'dog',
//         id: 2,
//         attributes: {
//           name: "Bear"
//         },
//         relationships: {
//           owner: {
//             data: {
//               type: 'person',
//               id: 2
//             }
//           }
//         }
//       }
//     });
//     store.push({
//       data: {
//         type: 'dog',
//         id: 3,
//         attributes: {
//           name: "Spot"
//         },
//         relationships: {
//           owner: {
//             data: null
//           }
//         }
//       }
//     });
//     person1 = store.peekRecord('person', 1);
//     person2 = store.peekRecord('person', 2);
//     dog1 = store.peekRecord('dog', 1);
//     dog2 = store.peekRecord('dog', 2);
//     dog3 = store.peekRecord('dog', 3);
//
//     person1.get('dogs').addObject(dog2);
//   });
//
//   run(function() {
//     person1.save().then(function () {
//       person1.get('dogs').addObject(dog3);
//       return Ember.RSVP.all([person1.rollback()]);
//     }).then(function () {
//       person1.get('dogs').then(function (dogs) {
//         assert.deepEqual(dogs.toArray(), [dog1,dog2]);
//       });
//       person2.get('dogs').then(function (dogs) {
//         assert.deepEqual(dogs.toArray(), []);
//       });
//       dog1.get('owner').then(function (owner) {
//         assert.equal(owner, person1);
//       }).then(function () {
//         console.log(person1._internalModel._relationships.get('dogs').manyArray.currentState.map(function (i) { return i.id; }));
//         console.log(dog2._internalModel._relationships.get('owner').get('id'));
//         console.log(dog3._internalModel._relationships.get('owner').get('id'));
//       });
//       dog2.get('owner').then(function (owner) {
//         assert.equal(owner, person1);
//       });
//     });
//   });
// });
