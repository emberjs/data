import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var run = Ember.run;

module("unit/model/relationships - DS.belongsTo");

test("belongsTo lazily loads relationships as needed", function(assert) {
  assert.expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

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
          tag: {
            data: { type: 'tag', id: '5' }
          }
        }
      }]
    });
  });

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

      assert.equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
      assert.equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

      assert.strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
      assert.asyncEqual(get(person, 'tag'), store.findRecord('tag', 5), "relationship object is the same as object retrieved directly");
    }));
  });
});

test("async belongsTo relationships work when the data hash has not been loaded", function(assert) {
  assert.expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Person) {
      assert.equal(id, 1, "id should be 1");

      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tag: 2 });
    } else if (type === Tag) {
      assert.equal(id, 2, "id should be 2");

      return Ember.RSVP.resolve({ id: 2, name: "friendly" });
    }
  };

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "The person is now populated");

      return run(function() {
        return get(person, 'tag');
      });
    })).then(assert.wait(function(tag) {
      assert.equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
      assert.equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
    }));
  });
});

test("async belongsTo relationships work when the data hash has already been loaded", function(assert) {
  assert.expect(3);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.push({
      data: [{
        type: 'tag',
        id: '2',
        attributes: {
          name: 'friendly'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          tag: {
            data: { type: 'tag', id: '2' }
          }
        }
      }]
    });
  });

  run(function() {
    var person = store.peekRecord('person', 1);
    assert.equal(get(person, 'name'), "Tom Dale", "The person is now populated");
    return run(function() {
      return get(person, 'tag');
    }).then(assert.wait(function(tag) {
      assert.equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
      assert.equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
    }));
  });
});

test("calling createRecord and passing in an undefined value for a relationship should be treated as if null", function(assert) {
  assert.expect(1);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.createRecord('person', { id: 1, tag: undefined });
  });

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.strictEqual(person.get('tag'), null, "undefined values should return null relationships");
    }));
  });
});

test("When finding a hasMany relationship the inverse belongsTo relationship is available immediately", function(assert) {
  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.equal(snapshots[0].belongsTo('person').id, '1');
    return Ember.RSVP.resolve([{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);
  };

  env.adapter.coalesceFindRequests = true;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          occupations: {
            data: [
              { type: 'occupation', id: '5' },
              { type: 'occupation', id: '2' }
            ]
          }
        }
      }
    });
  });

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.equal(get(person, 'isLoaded'), true, "isLoaded should be true");
      assert.equal(get(person, 'name'), "Tom Dale", "the person is still Tom Dale");

      return get(person, 'occupations');
    })).then(assert.wait(function(occupations) {
      assert.equal(get(occupations, 'length'), 2, "the list of occupations should have the correct length");

      assert.equal(get(occupations.objectAt(0), 'description'), "fifth", "the occupation is the fifth");
      assert.equal(get(occupations.objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
    }));
  });
});

test("When finding a belongsTo relationship the inverse belongsTo relationship is available immediately", function(assert) {
  assert.expect(1);

  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupation: DS.belongsTo('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person });
  var store = env.store;

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.equal(snapshot.belongsTo('person').id, '1');
    return Ember.RSVP.resolve({ id: 5, description: "fifth" });
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          occupation: {
            data: { type: 'occupation', id: '5' }
          }
        }
      }
    });
  });

  run(function() {
    store.peekRecord('person', 1).get('occupation');
  });
});

test("belongsTo supports relationships to models with id 0", function(assert) {
  assert.expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: [{
        type: 'tag',
        id: '0',
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
          tag: {
            data: { type: 'tag', id: '0' }
          }
        }
      }]
    });
  });

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

      assert.equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
      assert.equal(get(person, 'tag.name'), "friendly", "the tag should have name");

      assert.strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
      assert.asyncEqual(get(person, 'tag'), store.findRecord('tag', 0), "relationship object is the same as object retrieved directly");
    }));
  });
});

test("belongsTo gives a warning when provided with a serialize option", function(assert) {
  var Hobby = DS.Model.extend({
    name: DS.attr('string')
  });
  Hobby.toString = function() { return "Hobby"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    hobby: DS.belongsTo('hobby', { serialize: true, async: true })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ hobby: Hobby, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: [{
        type: 'hobby',
        id: '1',
        attributes: {
          name: 'fishing'
        }
      }, {
        type: 'hobby',
        id: '2',
        attributes: {
          name: 'coding'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          hobby: {
            data: { type: 'hobby', id: '1' }
          }
        }
      }]
    });
  });

  run(function() {
      store.findRecord('person', 1).then(assert.wait(function(person) {
        assert.expectWarning(function() {
          get(person, 'hobby');
        }, /You provided a serialize option on the "hobby" property in the "person" class, this belongs in the serializer. See DS.Serializer and it's implementations/);
      }));
    });
});

test("belongsTo gives a warning when provided with an embedded option", function(assert) {
  var Hobby = DS.Model.extend({
    name: DS.attr('string')
  });
  Hobby.toString = function() { return "Hobby"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    hobby: DS.belongsTo('hobby', { embedded: true, async: true })
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ hobby: Hobby, person: Person });
  var store = env.store;
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    store.push({
      data: [{
        type: 'hobby',
        id: '1',
        attributes: {
          name: 'fishing'
        }
      }, {
        type: 'hobby',
        id: '2',
        attributes: {
          name: 'coding'
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          hobby: {
            data: { type: 'hobby', id: '1' }
          }
        }
      }]
    });
  });

  run(function() {
      store.findRecord('person', 1).then(assert.wait(function(person) {
        assert.expectWarning(function() {
          get(person, 'hobby');
        }, /You provided an embedded option on the "hobby" property in the "person" class, this belongs in the serializer. See DS.EmbeddedRecordsMixin/);
      }));
    });
});

test("DS.belongsTo should be async by default", function(assert) {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;


  run(function() {
    var person = store.createRecord('person');

    assert.ok(person.get('tag') instanceof DS.PromiseObject, 'tag should be an async relationship');
  });
});
