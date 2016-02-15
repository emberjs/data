import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var attr = DS.attr;
var belongsTo = DS.belongsTo;
var hasMany = DS.hasMany;
var run = Ember.run;
var env;

var Person = DS.Model.extend({
  name: attr('string'),
  cars: hasMany('car', { async: false })
});

var Group = DS.Model.extend({
  people: hasMany('person', { async: false })
});

var Car = DS.Model.extend({
  make: attr('string'),
  model: attr('string'),
  person: belongsTo('person', { async: false })
});

module("integration/unload - Unloading Records", {
  beforeEach() {
    env = setupStore({
      person: Person,
      car: Car,
      group: Group
    });
  },

  afterEach() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test("can unload a single record", function(assert) {
  var adam;
  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    });
    adam = env.store.peekRecord('person', 1);
  });

  Ember.run(function() {
    adam.unloadRecord();
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
});

test("can unload all records for a given type", function(assert) {
  assert.expect(2);

  var adam, bob, dudu;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);

    env.store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: "VW",
          model: "Beetle"
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
    dudu = bob = env.store.peekRecord('car', 1);
  });

  Ember.run(function() {
    env.store.unloadAll('person');
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
  assert.equal(env.store.peekAll('car').get('length'), 1);
});

test("can unload all records", function(assert) {
  assert.expect(2);

  var adam, bob, dudu;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);

    env.store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: "VW",
          model: "Beetle"
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
    dudu = bob = env.store.peekRecord('car', 1);
  });

  Ember.run(function() {
    env.store.unloadAll();
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
  assert.equal(env.store.peekAll('car').get('length'), 0);
});

test("removes findAllCache after unloading all records", function(assert) {
  var adam, bob;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);
  });

  Ember.run(function() {
    env.store.peekAll('person');
    env.store.unloadAll('person');
  });

  assert.equal(env.store.peekAll('person').get('length'), 0);
});

test("unloading all records also updates record array from peekAll()", function(assert) {
  var adam, bob;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Bob Bobson'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    bob = env.store.peekRecord('person', 2);
  });
  var all = env.store.peekAll('person');

  assert.equal(all.get('length'), 2);

  Ember.run(function() {
    env.store.unloadAll('person');
  });

  assert.equal(all.get('length'), 0);
});


test("unloading a record also clears its relationship", function(assert) {
  var adam, bob;

  // disable background reloading so we do not re-create the relationship.
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        },
        relationships: {
          cars: {
            data: [
              { type: 'car', id: '1' }
            ]
          }
        }
      }
    });
    adam = env.store.peekRecord('person', 1);
  });

  run(function() {
    env.store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: "Lotus",
          model: "Exige"
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }
    });
    bob = env.store.peekRecord('car', 1);
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      assert.equal(person.get('cars.length'), 1, 'The inital length of cars is correct');

      run(function() {
        person.unloadRecord();
      });

      assert.equal(person.get('cars.length'), undefined);
    });
  });
});

test("unloading a record also clears the implicit inverse relationships", function(assert) {
  var adam, bob;
  // disable background reloading so we do not re-create the relationship.
  env.adapter.shouldBackgroundReloadRecord = () => false;

  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Adam Sunderland'
        }
      }
    });
    adam = env.store.peekRecord('person', 1);
  });

  run(function() {
    env.store.push({
      data: {
        type: 'group',
        id: '1',
        relationships: {
          people: {
            data: [
              { type: 'person', id: '1' }
            ]
          }
        }
      }
    });
    bob = env.store.peekRecord('group', 1);
  });

  run(function() {
    env.store.findRecord('group', 1).then(function(group) {
      assert.equal(group.get('people.length'), 1, 'The inital length of people is correct');
      var person = env.store.peekRecord('person', 1);
      run(function() {
        person.unloadRecord();
      });

      assert.equal(group.get('people.length'), 0, 'Person was removed from the people array');
    });
  });
});
