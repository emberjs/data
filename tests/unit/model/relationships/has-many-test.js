import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run } = Ember;
let env;

module('unit/model/relationships - DS.hasMany', {
  beforeEach() {
    env = setupStore();
  }
});

test('hasMany handles pre-loaded relationships', function(assert) {
  assert.expect(13);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false }),
    pets: DS.hasMany('pet', { async: false })
  });

  env.registry.register('model:tag', Tag);
  env.registry.register('model:pet', Pet);
  env.registry.register('model:person', Person);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Tag && id === '12') {
      return { id: 12, name: 'oohlala' };
    } else {
      assert.ok(false, 'findRecord() should not be called with these values');
    }
  };
  env.adapter.shouldBackgroundReloadRecord = () => false;

  let { store } = env;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: '5',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'smarmy'
        }
      }, {
        type: 'pet',
        id: '4',
        attributes: {
          name: 'fluffy'
        }
      }, {
        type: 'pet',
        id: '7',
        attributes: {
          name: 'snowy'
        }
      }, {
        type: 'pet',
        id: '12',
        attributes: {
          name: 'cerberus'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '5' }
            ]
          }
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Yehuda Katz'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '12' }
            ]
          }
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');

      let tags = get(person, 'tags');
      assert.equal(get(tags, 'length'), 1, 'the list of tags should have the correct length');
      assert.equal(get(tags.objectAt(0), 'name'), 'friendly', 'the first tag should be a Tag');

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Tom Dale'
            },
            relationships: {
              tags: {
                data: [
                  { type: 'tag', id: '5' },
                  { type: 'tag', id: '2' }
                ]
              }
            }
          }
        });
      });

      assert.equal(tags, get(person, 'tags'), 'a relationship returns the same object every time');
      assert.equal(get(get(person, 'tags'), 'length'), 2, 'the length is updated after new data is loaded');

      assert.strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), 'the returned object is always the same');
      assert.equal(get(person, 'tags').objectAt(0), store.peekRecord('tag', 5), 'relationship objects are the same as objects retrieved directly');

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '3',
            attributes: {
              name: 'KSelden'
            }
          }
        });
      });

      return store.findRecord('person', 3);
    }).then(kselden => {
      assert.equal(get(get(kselden, 'tags'), 'length'), 0, 'a relationship that has not been supplied returns an empty array');

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '4',
            attributes: {
              name: 'Cyvid Hamluck'
            },
            relationships: {
              pets: {
                data: [
                  { type: 'pet', id: '4' }
                ]
              }
            }
          }
        });
      });
      return store.findRecord('person', 4);
    }).then(cyvid => {
      assert.equal(get(cyvid, 'name'), 'Cyvid Hamluck', 'precond - retrieves person record from store');

      let pets = get(cyvid, 'pets');
      assert.equal(get(pets, 'length'), 1, 'the list of pets should have the correct length');
      assert.equal(get(pets.objectAt(0), 'name'), 'fluffy', 'the first pet should be correct');

      run(() => {
        store.push({
          data: {
            type: 'person',
            id: '4',
            attributes: {
              name: 'Cyvid Hamluck'
            },
            relationships: {
              pets: {
                data: [
                  { type: 'pet', id: '4' },
                  { type: 'pet', id: '12' }
                ]
              }
            }
          }
        });
      });

      assert.equal(pets, get(cyvid, 'pets'), 'a relationship returns the same object every time');
      assert.equal(get(get(cyvid, 'pets'), 'length'), 2, 'the length is updated after new data is loaded');
    });
  });
});

test('hasMany does not notify when it is initially reified', function(assert) {
  assert.expect(1);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });
  Tag.toString = () => 'Tag';

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });
  Person.toString = () => 'Person';

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: 1,
        attributes: {
          name: 'whatever'
        },
        relationships: {
          people: {
            data: [{
              id: 2,
              type: 'person'
            }]
          }
        }
      }, {
        type: 'person',
        id: 2,
        attributes: {
          name: 'David J. Hamilton'
        }
      }]
    });
  });

  return run(() => {
    let tag = store.peekRecord('tag', 1);
    tag.addObserver('people', () => {
      assert.ok(false, 'observer is not called');
    });
    tag.addObserver('people.[]', () => {
      assert.ok(false, 'observer is not called');
    });

    assert.equal(
      tag.get('people').mapBy('name'),
      'David J. Hamilton',
      'relationship is correct'
    );
  });
});

test('hasMany can be initially reified with null', function(assert) {
  assert.expect(1);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'whatever'
        },
        relationships: {
          people: {
            data: null
          }
        }
      }
    });
  });

  return run(() => {
    let tag = store.peekRecord('tag', 1);

    assert.equal(tag.get('people.length'), 0, 'relationship is correct');
  });
});

test('hasMany with explicit initial null works even when the inverse was set to not null', function(assert) {
  assert.expect(2);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    // first we push in data with the relationship
    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: 'David J. Hamilton'
        },
        relationships: {
          tag: {
            data: {
              type: 'tag',
              id: 1
            }
          }
        }
      },
      included: [
        {
          type: 'tag',
          id: 1,
          attributes: {
            name: 'whatever'
          },
          relationships: {
            people: {
              data: [{
                type: 'person',
                id: 1
              }]
            }
          }
        }
      ]
    });

    // now we push in data for that record which says it has no relationships
    store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'whatever'
        },
        relationships: {
          people: {
            data: null
          }
        }
      }
    });
  });

  return run(() => {
    let tag = store.peekRecord('tag', 1);
    let person = store.peekRecord('person', 1);

    assert.equal(person.get('tag'), null, 'relationship is empty');
    assert.equal(tag.get('people.length'), 0, 'relationship is correct');
  });
});

test('hasMany with duplicates from payload', function(assert) {
  assert.expect(1);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  Tag.reopenClass({
    toString() {
      return 'tag';
    }
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  Person.reopenClass({
    toString() {
      return 'person';
    }
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  run(() => {
    // first we push in data with the relationship
    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: 'David J. Hamilton'
        },
        relationships: {
          tag: {
            data: {
              type: 'tag',
              id: 1
            }
          }
        }
      },
      included: [
        {
          type: 'tag',
          id: 1,
          attributes: {
            name: 'whatever'
          },
          relationships: {
            people: {
              data: [
                {
                  type: 'person',
                  id: 1
                },
                {
                  type: 'person',
                  id: 1
                }
              ]
            }
          }
        }
      ]
    });
  });

  run(() => {
    let tag = store.peekRecord('tag', 1);
    assert.equal(tag.get('people.length'), 1, 'relationship does not contain duplicates');
  });
});

test('hasMany with explicit null works even when the inverse was set to not null', function(assert) {
  assert.expect(3);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    // first we push in data with the relationship
    store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: 'David J. Hamilton'
        },
        relationships: {
          tag: {
            data: {
              type: 'tag',
              id: 1
            }
          }
        }
      },
      included: [
        {
          type: 'tag',
          id: 1,
          attributes: {
            name: 'whatever'
          },
          relationships: {
            people: {
              data: [{
                type: 'person',
                id: 1
              }]
            }
          }
        }
      ]
    });
  });

  run(() => {
    let person = store.peekRecord('person', 1);
    let tag = store.peekRecord('tag', 1);

    assert.equal(person.get('tag'), tag, 'relationship is not empty');
  });

  run(() => {
    // now we push in data for that record which says it has no relationships
    store.push({
      data: {
        type: 'tag',
        id: 1,
        attributes: {
          name: 'whatever'
        },
        relationships: {
          people: {
            data: null
          }
        }
      }
    });
  });

  return run(() => {
    let person = store.peekRecord('person', 1);
    let tag = store.peekRecord('tag', 1);

    assert.equal(person.get('tag'), null,'relationship is now empty');
    assert.equal(tag.get('people.length'), 0, 'relationship is correct');
  });
});

test('hasMany tolerates reflexive self-relationships', function(assert) {
  assert.expect(1);

  const Person = DS.Model.extend({
    name: DS.attr(),
    trueFriends: DS.hasMany('person', { async: false })
  });

  let env = setupStore({ person: Person });
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    env.store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Edward II'
        },
        relationships: {
          trueFriends: {
            data: [{
              id: '1',
              type: 'person'
            }]
          }
        }
      }
    });
  });

  let eddy = env.store.peekRecord('person', 1);
  assert.deepEqual(
    eddy.get('trueFriends').mapBy('name'),
    ['Edward II'],
    'hasMany supports reflexive self-relationships'
  );
});

test('hasMany lazily loads async relationships', function(assert) {
  assert.expect(5);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true }),
    pets: DS.hasMany('pet', { async: false })
  });

  env.registry.register('model:tag', Tag);
  env.registry.register('model:pet', Pet);
  env.registry.register('model:person', Person);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Tag && id === '12') {
      return { data: { id: 12, type: 'tag', attributes: { name: 'oohlala' } } };
    } else {
      assert.ok(false, 'findRecord() should not be called with these values');
    }
  };
  env.adapter.shouldBackgroundReloadRecord = () => false;

  let { store } = env;

  run(() => {
    store.push({
      data: [{
        type: 'tag',
        id: '5',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'smarmy'
        }
      }, {
        type: 'pet',
        id: '4',
        attributes: {
          name: 'fluffy'
        }
      }, {
        type: 'pet',
        id: '7',
        attributes: {
          name: 'snowy'
        }
      }, {
        type: 'pet',
        id: '12',
        attributes: {
          name: 'cerberus'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '5' }
            ]
          }
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Yehuda Katz'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '12' }
            ]
          }
        }
      }]
    });
  });

  return run(() =>{
    let wycats;
    store.findRecord('person', 2).then(function(person) {
      wycats = person;

      assert.equal(get(wycats, 'name'), 'Yehuda Katz', 'precond - retrieves person record from store');

      return Ember.RSVP.hash({
        wycats,
        tags: wycats.get('tags')
      });
    }).then(records => {
      assert.equal(get(records.tags, 'length'), 1, 'the list of tags should have the correct length');
      assert.equal(get(records.tags.objectAt(0), 'name'), 'oohlala', 'the first tag should be a Tag');

      assert.strictEqual(records.tags.objectAt(0), records.tags.objectAt(0), 'the returned object is always the same');
      assert.equal(records.tags.objectAt(0), store.peekRecord('tag', 12), 'relationship objects are the same as objects retrieved directly');

      return get(wycats, 'tags');
    }).then(tags => {
      let newTag = store.createRecord('tag');
      tags.pushObject(newTag);
    });
  });
});

test('should be able to retrieve the type for a hasMany relationship without specifying a type from its metadata', function(assert) {
  const Tag = DS.Model.extend({});

  const Person = DS.Model.extend({
    tags: DS.hasMany('tag', { async: false })

  });

  let env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, 'returns the relationship type');
});

test('should be able to retrieve the type for a hasMany relationship specified using a string from its metadata', function(assert) {
  const Tag = DS.Model.extend({});

  const Person = DS.Model.extend({
    tags: DS.hasMany('tag', { async: false })
  });

  let env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, 'returns the relationship type');
});

test('should be able to retrieve the type for a belongsTo relationship without specifying a type from its metadata', function(assert) {
  const Tag = DS.Model.extend({});

  const Person = DS.Model.extend({
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tag', env.store), Tag, 'returns the relationship type');
});

test('should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  const Person = DS.Model.extend({
    tags: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, 'returns the relationship type');
});

test('relationships work when declared with a string path', function(assert) {
  assert.expect(2);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  const Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  let env = setupStore({
    person: Person,
    tag: Tag
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    env.store.push({
      data: [{
        type: 'tag',
        id: '5',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'smarmy'
        }
      }, {
        type: 'tag',
        id: '12',
        attributes: {
          name: 'oohlala'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '5' },
              { type: 'tag', id: '2' }
            ]
          }
        }
      }]
    });
  });

  return run(() => {
    return env.store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'name'), 'Tom Dale', 'precond - retrieves person record from store');
      assert.equal(get(person, 'tags.length'), 2, 'the list of tags should have the correct length');
    });
  });
});

test('hasMany relationships work when the data hash has not been loaded', function(assert) {
  assert.expect(8);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.coalesceFindRequests = true;
  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.equal(type, Tag, 'type should be Tag');
    assert.deepEqual(ids, ['5', '2'], 'ids should be 5 and 2');

    return { data: [
      { id: 5, type: 'tag', attributes: { name: 'friendly' } },
      { id: 2, type: 'tag', attributes: { name: 'smarmy' } }
    ]};
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Person, 'type should be Person');
    assert.equal(id, 1, 'id should be 1');

    return {
      data: {
        id: 1,
        type: 'person',
        attributes: { name: 'Tom Dale' },
        relationships: {
          tags: {
            data: [{ id: 5, type: 'tag'}, { id: 2, type: 'tag'}]
          }
        }
      }
    };
  };

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(get(person, 'name'), 'Tom Dale', 'The person is now populated');

      return run(() => person.get('tags'));
    }).then(tags => {
      assert.equal(get(tags, 'length'), 2, 'the tags object still exists');
      assert.equal(get(tags.objectAt(0), 'name'), 'friendly', 'Tom Dale is now friendly');
      assert.equal(get(tags.objectAt(0), 'isLoaded'), true, 'Tom Dale is now loaded');
    });
  });
});

test('it is possible to add a new item to a relationship', function(assert) {
  assert.expect(2);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  let env = setupStore({
    tag: Tag,
    person: Person
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;

  let { store } = env;

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '1' }
            ]
          }
        }
      }, {
        type: 'tag',
        id: '1',
        attributes: {
          name: 'ember'
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person =>{
      let tag = get(person, 'tags').objectAt(0);

      assert.equal(get(tag, 'name'), 'ember', 'precond - relationships work');

      tag = store.createRecord('tag', { name: 'js' });
      get(person, 'tags').pushObject(tag);

      assert.equal(get(person, 'tags').objectAt(1), tag, 'newly added relationship works');
    });
  });
});

test('new items added to a hasMany relationship are not cleared by a delete', function(assert) {
  assert.expect(4);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    pets: DS.hasMany('pet', { async: false, inverse: null })
  });

  const Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false, inverse: null })
  });

  let env = setupStore({
    person: Person,
    pet: Pet
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.deleteRecord = () => {
    return Ember.RSVP.Promise.resolve({ data: null });
  };

  let { store } = env;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Chris Thoburn'
        },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '1' }
            ]
          }
        }
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shenanigans'
          }
        },
        {
          type: 'pet',
          id: '2',
          attributes: {
            name: 'Rambunctious'
          }
        },
        {
          type: 'pet',
          id: '3',
          attributes: {
            name: 'Rebel'
          }
        }
      ]
    });
  });

  const person = store.peekRecord('person', '1');
  const pets = run(() => person.get('pets'));

  const shen = pets.objectAt(0);
  const rambo = store.peekRecord('pet', '2');
  const rebel = store.peekRecord('pet', '3');

  assert.equal(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
  assert.deepEqual(pets.map(p => get(p, 'id')), ['1'], 'precond - relationship has the correct pets to start');

  run(() => {
    pets.pushObjects([rambo, rebel]);
  });

  assert.deepEqual(pets.map(p => get(p, 'id')), ['1', '2', '3'], 'precond2 - relationship now has the correct three pets');

  run(() => {
    return shen.destroyRecord({})
      .then(() => {
        shen.unloadRecord();
      });
  });

  assert.deepEqual(pets.map(p => get(p, 'id')), ['2', '3'], 'relationship now has the correct two pets');
});

test('new items added to an async hasMany relationship are not cleared by a delete', function(assert) {
  assert.expect(7);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    pets: DS.hasMany('pet', { async: true, inverse: null })
  });

  const Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false, inverse: null })
  });

  let env = setupStore({
    person: Person,
    pet: Pet
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.deleteRecord = () => {
    return Ember.RSVP.Promise.resolve({ data: null });
  };

  let { store } = env;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Chris Thoburn'
        },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '1' }
            ]
          }
        }
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shenanigans'
          }
        },
        {
          type: 'pet',
          id: '2',
          attributes: {
            name: 'Rambunctious'
          }
        },
        {
          type: 'pet',
          id: '3',
          attributes: {
            name: 'Rebel'
          }
        }
      ]
    });
  });

  return run(() => {
    const person = store.peekRecord('person', '1');
    const petsProxy = run(() => person.get('pets'));

    return petsProxy.then((pets) => {
      const shen = pets.objectAt(0);
      const rambo = store.peekRecord('pet', '2');
      const rebel = store.peekRecord('pet', '3');

      assert.equal(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
      assert.deepEqual(pets.map(p => get(p, 'id')), ['1'], 'precond - relationship has the correct pet to start');
      assert.equal(get(petsProxy, 'length'), 1, 'precond - proxy has only one pet to start');

      pets.pushObjects([rambo, rebel]);

      assert.deepEqual(pets.map(p => get(p, 'id')), ['1', '2', '3'], 'precond2 - relationship now has the correct three pets');
      assert.equal(get(petsProxy, 'length'), 3, 'precond2 - proxy now reflects three pets');

      return shen.destroyRecord({})
        .then(() => {
          shen.unloadRecord();

          assert.deepEqual(pets.map(p => get(p, 'id')), ['2', '3'], 'relationship now has the correct two pets');
          assert.equal(get(petsProxy, 'length'), 2, 'proxy now reflects two pets');
        });
    });
  });
});

test('new items added to a belongsTo relationship are not cleared by a delete', function(assert) {
  assert.expect(4);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    dog: DS.belongsTo('dog', { async: false, inverse: null })
  });

  const Dog = DS.Model.extend({
    name: DS.attr('string')
  });

  let env = setupStore({
    person: Person,
    dog: Dog
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.deleteRecord = () => {
    return Ember.RSVP.Promise.resolve({ data: null });
  };

  let { store } = env;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Chris Thoburn'
        },
        relationships: {
          dog: {
            data: { type: 'dog', id: '1' }
          }
        }
      },
      included: [
        {
          type: 'dog',
          id: '1',
          attributes: {
            name: 'Shenanigans'
          }
        },
        {
          type: 'dog',
          id: '2',
          attributes: {
            name: 'Rambunctious'
          }
        }
      ]
    });
  });

  const person = store.peekRecord('person', '1');
  let dog = run(() => person.get('dog'));
  const shen = store.peekRecord('dog', '1');
  const rambo = store.peekRecord('dog', '2');

  assert.ok(dog === shen, 'precond - the belongsTo points to the correct dog');
  assert.equal(get(dog, 'name'), 'Shenanigans', 'precond - relationships work');

  run(() => {
    person.set('dog', rambo);
  });

  dog = person.get('dog');
  assert.equal(dog, rambo, 'precond2 - relationship was updated');

  return run(() => {
    return shen.destroyRecord({})
      .then(() => {
        shen.unloadRecord();

        dog = person.get('dog');
        assert.equal(dog, rambo, 'The currentState of the belongsTo was preserved after the delete');
      });
  });
});

test('new items added to an async belongsTo relationship are not cleared by a delete', function(assert) {
  assert.expect(4);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    dog: DS.belongsTo('dog', { async: true, inverse: null })
  });

  const Dog = DS.Model.extend({
    name: DS.attr('string')
  });

  let env = setupStore({
    person: Person,
    dog: Dog
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.deleteRecord = () => {
    return Ember.RSVP.Promise.resolve({ data: null });
  };

  let { store } = env;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Chris Thoburn'
        },
        relationships: {
          dog: {
            data: { type: 'dog', id: '1' }
          }
        }
      },
      included: [
        {
          type: 'dog',
          id: '1',
          attributes: {
            name: 'Shenanigans'
          }
        },
        {
          type: 'dog',
          id: '2',
          attributes: {
            name: 'Rambunctious'
          }
        }
      ]
    });
  });

  return run(() => {
    const person = store.peekRecord('person', '1');
    const shen = store.peekRecord('dog', '1');
    const rambo = store.peekRecord('dog', '2');

    return person.get('dog').then((dog) => {
      assert.ok(dog === shen, 'precond - the belongsTo points to the correct dog');
      assert.equal(get(dog, 'name'), 'Shenanigans', 'precond - relationships work');

      person.set('dog', rambo);

      dog = person.get('dog.content');

      assert.ok(dog === rambo, 'precond2 - relationship was updated');

      return shen.destroyRecord({})
        .then(() => {
          shen.unloadRecord();

          dog = person.get('dog.content');
          assert.ok(dog === rambo, 'The currentState of the belongsTo was preserved after the delete');
        });
    });
  });
});

test('deleting an item that is the current state of a belongsTo clears currentState', function(assert) {
  assert.expect(4);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    dog: DS.belongsTo('dog', { async: false, inverse: null })
  });

  const Dog = DS.Model.extend({
    name: DS.attr('string')
  });

  let env = setupStore({
    person: Person,
    dog: Dog
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.deleteRecord = () => {
    return Ember.RSVP.Promise.resolve({ data: null });
  };

  let { store } = env;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Chris Thoburn'
        },
        relationships: {
          dog: {
            data: { type: 'dog', id: '1' }
          }
        }
      },
      included: [
        {
          type: 'dog',
          id: '1',
          attributes: {
            name: 'Shenanigans'
          }
        },
        {
          type: 'dog',
          id: '2',
          attributes: {
            name: 'Rambunctious'
          }
        }
      ]
    });
  });

  const person = store.peekRecord('person', '1');
  let dog = run(() => person.get('dog'));
  const shen = store.peekRecord('dog', '1');
  const rambo = store.peekRecord('dog', '2');

  assert.ok(dog === shen, 'precond - the belongsTo points to the correct dog');
  assert.equal(get(dog, 'name'), 'Shenanigans', 'precond - relationships work');

  run(() => {
    person.set('dog', rambo);
  });

  dog = person.get('dog');
  assert.equal(dog, rambo, 'precond2 - relationship was updated');

  return run(() => {
    return rambo.destroyRecord({})
      .then(() => {
        rambo.unloadRecord();

        dog = person.get('dog');
        assert.equal(dog, null, 'The current state of the belongsTo was clearer');
      });
  });
});

test('hasMany.firstObject.unloadRecord should not break that hasMany', function(assert) {
  const Person = DS.Model.extend({
    cars: DS.hasMany('car', { async: false }),
    name: DS.attr()
  });

  Person.reopenClass({
    toString() {
      return 'person';
    }
  });

  const Car = DS.Model.extend({
    name: DS.attr()
  });

  Car.reopenClass({
    toString() {
      return 'car';
    }
  });

  let env = setupStore({
    person: Person,
    car: Car
  });

  run(() => {
    env.store.push({
      data: [
        {
          type: 'person',
          id: 1,
          attributes: {
            name: 'marvin'
          },
          relationships: {
            cars: {
              data: [
                { type: 'car', id: 1 },
                { type: 'car', id: 2 }
              ]
            }
          }
        },
        { type: 'car', id: 1, attributes: { name: 'a' } },
        { type: 'car', id: 2, attributes: { name: 'b' } }
      ]
    })
  });

  let person = env.store.peekRecord('person', 1);
  let cars = person.get('cars');

  assert.equal(cars.get('length'), 2);

  run(() => {
    cars.get('firstObject').unloadRecord();
    assert.equal(cars.get('length'), 1); // unload now..
    assert.equal(person.get('cars.length'), 1); // unload now..
  });

  assert.equal(cars.get('length'), 1); // unload now..
  assert.equal(person.get('cars.length'), 1); // unload now..
});
/*
  This test, when passing, affirms that a known limitation of ember-data still exists.

  When pushing new data into the store, ember-data is currently incapable of knowing whether
  a relationship has been persisted. In order to update relationship state effectively, ember-data
  blindly "flushes canonical" state, removing any `currentState` changes. A delete that sideloads
  the parent record's hasMany is a situation in which this limitation will be encountered should other
  local changes to the relationship still exist.
 */
test('[ASSERTS KNOWN LIMITATION STILL EXISTS] returning new hasMany relationship info from a delete clears local state', function(assert) {
  assert.expect(4);

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    pets: DS.hasMany('pet', { async: false, inverse: null })
  });

  const Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false, inverse: null })
  });

  let env = setupStore({
    person: Person,
    pet: Pet
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.deleteRecord = () => {
    return Ember.RSVP.Promise.resolve({
      data: null,
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Chris Thoburn'
          },
          relationships: {
            pets: {
              data: [
                { type: 'pet', id: '2' }
              ]
            }
          }
        }
      ]
    });
  };

  let { store } = env;

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Chris Thoburn'
        },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' }
            ]
          }
        }
      },
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: {
            name: 'Shenanigans'
          }
        },
        {
          type: 'pet',
          id: '2',
          attributes: {
            name: 'Rambunctious'
          }
        },
        {
          type: 'pet',
          id: '3',
          attributes: {
            name: 'Rebel'
          }
        }
      ]
    });
  });

  const person = store.peekRecord('person', '1');
  const pets = run(() => person.get('pets'));

  const shen = store.peekRecord('pet', '1');
  const rebel = store.peekRecord('pet', '3');

  assert.equal(get(shen, 'name'), 'Shenanigans', 'precond - relationships work');
  assert.deepEqual(pets.map(p => get(p, 'id')), ['1', '2'], 'precond - relationship has the correct pets to start');

  run(() => {
    pets.pushObjects([rebel]);
  });

  assert.deepEqual(pets.map(p => get(p, 'id')), ['1', '2', '3'], 'precond2 - relationship now has the correct three pets');

  return run(() => {
    return shen.destroyRecord({})
      .then(() => {
        shen.unloadRecord();

        // were ember-data to now preserve local edits during a relationship push, this would be '2'
        assert.deepEqual(pets.map(p => get(p, 'id')), ['2'], 'relationship now has only one pet, we lost the local change');
      });
  });
});

test('possible to replace items in a relationship using setObjects w/ Ember Enumerable Array/Object as the argument (GH-2533)', function(assert) {
  assert.expect(2);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '1' }
            ]
          }
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Sylvain Mina'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '2' }
            ]
          }
        }
      }, {
        type: 'tag',
        id: '1',
        attributes: {
          name: 'ember'
        }
      }, {
        type: 'tag',
        id: '2',
        attributes: {
          name: 'ember-data'
        }
      }]
    });
  });

  let tom, sylvain;

  run(() => {
    tom = store.peekRecord('person', '1');
    sylvain = store.peekRecord('person', '2');
    // Test that since sylvain.get('tags') instanceof DS.ManyArray,
    // addInternalModels on Relationship iterates correctly.
    tom.get('tags').setObjects(sylvain.get('tags'));
  });

  assert.equal(tom.get('tags.length'), 1);
  assert.equal(tom.get('tags.firstObject'), store.peekRecord('tag', 2));
});

test('it is possible to remove an item from a relationship', function(assert) {
  assert.expect(2);

  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;

  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(() => {
    store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tags: {
            data: [
              { type: 'tag', id: '1' }
            ]
          }
        }
      }, {
        type: 'tag',
        id: '1',
        attributes: {
          name: 'ember'
        }
      }]
    });
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      let tag = get(person, 'tags').objectAt(0);

      assert.equal(get(tag, 'name'), 'ember', 'precond - relationships work');

      run(() => get(person, 'tags').removeObject(tag));

      assert.equal(get(person, 'tags.length'), 0, 'object is removed from the relationship');
    });
  });
});

test('it is possible to add an item to a relationship, remove it, then add it again', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let { store } = env;
  let person, tag1, tag2, tag3, tags;

  run(() => {
    person = store.createRecord('person');
    tag1 = store.createRecord('tag');
    tag2 = store.createRecord('tag');
    tag3 = store.createRecord('tag');

    tags = get(person, 'tags');

    tags.pushObjects([tag1, tag2, tag3]);
    tags.removeObject(tag2);
  });

  assert.equal(tags.objectAt(0), tag1);
  assert.equal(tags.objectAt(1), tag3);
  assert.equal(get(person, 'tags.length'), 2, 'object is removed from the relationship');

  run(() => {
    tags.insertAt(0, tag2);
  });

  assert.equal(get(person, 'tags.length'), 3, 'object is added back to the relationship');
  assert.equal(tags.objectAt(0), tag2);
  assert.equal(tags.objectAt(1), tag1);
  assert.equal(tags.objectAt(2), tag3);
});

test("DS.hasMany is async by default", function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let { store } = setupStore({ tag: Tag, person: Person });

  run(() => {
    let tag = store.createRecord('tag');
    assert.ok(tag.get('people') instanceof DS.PromiseArray, 'people should be an async relationship');
  });
});

test('DS.hasMany is stable', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let { store } = setupStore({ tag: Tag, person: Person });

  let tag = run(() => store.createRecord('tag'));
  let people = tag.get('people');
  let peopleCached = tag.get('people');

  assert.equal(people, peopleCached);

  tag.notifyPropertyChange('people');
  let notifiedPeople = tag.get('people');

  assert.equal(people, notifiedPeople);

  return Ember.RSVP.Promise.all([
    people
  ]);
});

test('DS.hasMany proxy is destroyed', function(assert) {
  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let { store } = setupStore({ tag: Tag, person: Person });

  let tag = run(() => store.createRecord('tag'));
  let peopleProxy = tag.get('people');

  return peopleProxy.then(people => {
    Ember.run(() => {
      tag.unloadRecord();
      assert.equal(people.isDestroying, false, 'people is NOT destroying sync after unloadRecord');
      assert.equal(people.isDestroyed, false, 'people is NOT destroyed sync after unloadRecord');
      assert.equal(peopleProxy.isDestroying, false, 'peopleProxy is destroying sync after unloadRecord');
      assert.equal(peopleProxy.isDestroyed, false, 'peopleProxy is NOT YET destroyed sync after unloadRecord');
    });

    assert.equal(peopleProxy.isDestroying, true, 'peopleProxy is destroying after the run post unloadRecord');
    assert.equal(peopleProxy.isDestroyed, true, 'peopleProxy is destroyed after the run post unloadRecord');
  })
});

test('DS.ManyArray is lazy', function(assert) {
  let peopleDidChange = 0;
  const Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person'),
    peopleDidChange: Ember.observer('people', function() {
      peopleDidChange++;
    })
  });

  const Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let tag = run(() => env.store.createRecord('tag'));
  let hasManyRelationship = tag.hasMany('people').hasManyRelationship;

  assert.ok(!hasManyRelationship._manyArray);

  run(() => {
    assert.equal(peopleDidChange, 0, 'expect people hasMany to not emit a change event (before access)');
    tag.get('people');
    assert.equal(peopleDidChange, 0, 'expect people hasMany to not emit a change event (sync after access)');
  });

  assert.equal(peopleDidChange, 0, 'expect people hasMany to not emit a change event (after access, but after the current run loop)');
  assert.ok(hasManyRelationship._manyArray instanceof DS.ManyArray);

  let person = Ember.run(() => env.store.createRecord('person'));

  Ember.run(() => {
    assert.equal(peopleDidChange, 0, 'expect people hasMany to not emit a change event (before access)');
    tag.get('people').addObject(person);
    assert.equal(peopleDidChange, 1, 'expect people hasMany to have changed exactly once');
  });
});

testInDebug('throws assertion if of not set with an array', function(assert) {
  const Person = DS.Model.extend();
  const Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  let { store }= setupStore({ tag: Tag, person: Person });
  let tag, person;

  run(() => {
    tag = store.createRecord('tag');
    person = store.createRecord('person');
  });

  run(() => {
    assert.expectAssertion(() => {
      tag.set('people', person);
    }, /You must pass an array of records to set a hasMany relationship/);
  });
});

testInDebug('checks if passed array only contains instances of DS.Model', function(assert) {
  const Person = DS.Model.extend();
  const Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  let env = setupStore({ tag: Tag, person: Person });

  env.adapter.findRecord = function() {
    return {
      data: {
        type: 'person',
        id: 1
      }
    };
  };

  let tag, person;

  run(() => {
    tag = env.store.createRecord('tag');
    person = env.store.findRecord('person', 1);
  });

  run(() => {
    assert.expectAssertion(() => {
      tag.set('people', [person]);
    }, /All elements of a hasMany relationship must be instances of DS.Model/);
  });
});
