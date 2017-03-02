import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var run = Ember.run;
var env;

module("unit/model/relationships - DS.hasMany", {
  beforeEach() {
    env = setupStore();
  }
});

test("hasMany handles pre-loaded relationships", function(assert) {
  let done = assert.async();
  assert.expect(13);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false }),
    pets: DS.hasMany('pet', { async: false })
  });

  env.registry.register('model:tag', Tag);
  env.registry.register('model:pet', Pet);
  env.registry.register('model:person', Person);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      assert.ok(false, "findRecord() should not be called with these values");
    }
  };
  env.adapter.shouldBackgroundReloadRecord = () => false;

  var store = env.store;

  run(function() {
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

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

      var tags = get(person, 'tags');
      assert.equal(get(tags, 'length'), 1, "the list of tags should have the correct length");
      assert.equal(get(tags.objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

      run(function() {
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

      assert.equal(tags, get(person, 'tags'), "a relationship returns the same object every time");
      assert.equal(get(get(person, 'tags'), 'length'), 2, "the length is updated after new data is loaded");

      assert.strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
      assert.asyncEqual(get(person, 'tags').objectAt(0), store.findRecord('tag', 5), "relationship objects are the same as objects retrieved directly");

      run(function() {
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
    }).then(function(kselden) {
      assert.equal(get(get(kselden, 'tags'), 'length'), 0, "a relationship that has not been supplied returns an empty array");

      run(function() {
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
    }).then(function(cyvid) {
      assert.equal(get(cyvid, 'name'), "Cyvid Hamluck", "precond - retrieves person record from store");

      var pets = get(cyvid, 'pets');
      assert.equal(get(pets, 'length'), 1, "the list of pets should have the correct length");
      assert.equal(get(pets.objectAt(0), 'name'), "fluffy", "the first pet should be correct");

      run(function() {
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

      assert.equal(pets, get(cyvid, 'pets'), "a relationship returns the same object every time");
      assert.equal(get(get(cyvid, 'pets'), 'length'), 2, "the length is updated after new data is loaded");
      done();
    });
  });
});

test("hasMany lazily loads async relationships", function(assert) {
  assert.expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true }),
    pets: DS.hasMany('pet', { async: false })
  });

  env.registry.register('model:tag', Tag);
  env.registry.register('model:pet', Pet);
  env.registry.register('model:person', Person);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      assert.ok(false, "findRecord() should not be called with these values");
    }
  };
  env.adapter.shouldBackgroundReloadRecord = () => false;

  var store = env.store;

  run(function() {
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

  var wycats;

  run(function() {
    store.findRecord('person', 2).then(function(person) {
      wycats = person;

      assert.equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

      return Ember.RSVP.hash({
        wycats: wycats,
        tags: wycats.get('tags')
      });
    }).then(function(records) {
      assert.equal(get(records.tags, 'length'), 1, "the list of tags should have the correct length");
      assert.equal(get(records.tags.objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

      assert.strictEqual(records.tags.objectAt(0), records.tags.objectAt(0), "the returned object is always the same");
      assert.asyncEqual(records.tags.objectAt(0), store.findRecord('tag', 12), "relationship objects are the same as objects retrieved directly");

      return get(wycats, 'tags');
    }).then(function(tags) {
      var newTag;
      run(function() {
        newTag = store.createRecord('tag');
        tags.pushObject(newTag);
      });
    });
  });
});

test("should be able to retrieve the type for a hasMany relationship without specifying a type from its metadata", function(assert) {
  var Tag = DS.Model.extend({});

  var Person = DS.Model.extend({
    tags: DS.hasMany('tag', { async: false })

  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a hasMany relationship specified using a string from its metadata", function(assert) {
  var Tag = DS.Model.extend({});

  var Person = DS.Model.extend({
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship without specifying a type from its metadata", function(assert) {
  var Tag = DS.Model.extend({});

  var Person = DS.Model.extend({
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tag', env.store), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    tags: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  assert.equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, "returns the relationship type");
});

test("relationships work when declared with a string path", function(assert) {
  assert.expect(2);

  window.App = {};

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({
    person: Person,
    tag: Tag
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
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

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
      assert.equal(get(person, 'tags.length'), 2, "the list of tags should have the correct length");
    });
  });
});

test("hasMany relationships work when the data hash has not been loaded", function(assert) {
  assert.expect(8);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  env.adapter.coalesceFindRequests = true;
  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.equal(type, Tag, "type should be Tag");
    assert.deepEqual(ids, ['5', '2'], "ids should be 5 and 2");

    return Ember.RSVP.resolve([{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(type, Person, "type should be Person");
    assert.equal(id, 1, "id should be 1");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tags: [5, 2] });
  };

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "The person is now populated");

      return run(function() {
        return person.get('tags');
      });
    }).then(function(tags) {
      assert.equal(get(tags, 'length'), 2, "the tags object still exists");
      assert.equal(get(tags.objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
      assert.equal(get(tags.objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
    });
  });
});

test("it is possible to add a new item to a relationship", function(assert) {
  assert.expect(2);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;

  var store = env.store;

  run(function() {
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

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      var tag = get(person, 'tags').objectAt(0);

      assert.equal(get(tag, 'name'), "ember", "precond - relationships work");

      tag = store.createRecord('tag', { name: "js" });
      get(person, 'tags').pushObject(tag);

      assert.equal(get(person, 'tags').objectAt(1), tag, "newly added relationship works");
    });
  });
});

test("possible to replace items in a relationship using setObjects w/ Ember Enumerable Array/Object as the argument (GH-2533)", function(assert) {
  assert.expect(2);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env   = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
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

  var tom, sylvain;

  run(function() {
    tom = store.peekRecord('person', '1');
    sylvain = store.peekRecord('person', '2');
    // Test that since sylvain.get('tags') instanceof DS.ManyArray,
    // addRecords on Relationship iterates correctly.
    tom.get('tags').setObjects(sylvain.get('tags'));
  });

  assert.equal(tom.get('tags.length'), 1);
  assert.equal(tom.get('tags.firstObject'), store.peekRecord('tag', 2));
});

test("it is possible to remove an item from a relationship", function(assert) {
  assert.expect(2);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
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

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      var tag = get(person, 'tags').objectAt(0);

      assert.equal(get(tag, 'name'), "ember", "precond - relationships work");

      run(function() {
        get(person, 'tags').removeObject(tag);
      });

      assert.equal(get(person, 'tags.length'), 0, "object is removed from the relationship");
    }));
  });
});

test("it is possible to add an item to a relationship, remove it, then add it again", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  var person, tag1, tag2, tag3, tags;

  run(function() {
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
  assert.equal(get(person, 'tags.length'), 2, "object is removed from the relationship");

  run(function() {
    tags.insertAt(0, tag2);
  });

  assert.equal(get(person, 'tags.length'), 3, "object is added back to the relationship");
  assert.equal(tags.objectAt(0), tag2);
  assert.equal(tags.objectAt(1), tag1);
  assert.equal(tags.objectAt(2), tag3);
});

test("DS.hasMany is async by default", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    var tag = store.createRecord('tag');
    assert.ok(tag.get('people') instanceof DS.PromiseArray, 'people should be an async relationship');
  });
});

test("DS.ManyArray is lazy", function(assert) {
  let peopleDidChange = 0;
  let Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person'),
    peopleDidChange: Ember.observer('people', function() {
      peopleDidChange++;
    })
  });

  let Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  let env = setupStore({ tag: Tag, person: Person });
  let tag = run(function() {
    return env.store.createRecord('tag');
  });
  let hasManyRelationship = tag.hasMany('people').hasManyRelationship;
  assert.ok(!hasManyRelationship._manyArray);
  run(function() {
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

testInDebug("throws assertion if of not set with an array", function(assert) {
  var Person = DS.Model.extend();
  var Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  var env = setupStore({ tag: Tag, person: Person });
  var tag, person;

  run(function() {
    tag = env.store.createRecord('tag');
    person = env.store.createRecord('person');
  });

  run(function() {
    assert.expectAssertion(function() {
      tag.set('people', person);
    }, /You must pass an array of records to set a hasMany relationship/);
  });
});

testInDebug("checks if passed array only contains instances of DS.Model", function(assert) {
  var Person = DS.Model.extend();
  var Tag = DS.Model.extend({
    people: DS.hasMany('person')
  });

  var env = setupStore({ tag: Tag, person: Person });

  env.adapter.findRecord = function() {
    return {
      type: 'person',
      id: 1
    };
  };

  var tag, person;

  run(function() {
    tag = env.store.createRecord('tag');
    person = env.store.findRecord('person', 1);
  });

  run(function() {
    assert.expectAssertion(function() {
      tag.set('people', [person]);
    }, /All elements of a hasMany relationship must be instances of DS.Model/);
  });
});
