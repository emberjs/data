import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, Person;
var attr = DS.attr;
var hasMany = DS.hasMany;
var run = Ember.run;

module('integration/records/relationship-changes - Relationship changes', {
  beforeEach() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      siblings: hasMany('person')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test('Calling push with relationship triggers observers once if the relationship was empty and is added to', function(assert) {
  assert.expect(1);
  var person;
  var observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: []
          }
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Katzn',
            lastName: 'Dogz'
          }
        }
      ]
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship triggers observers once if the relationship was not empty and was added to', function(assert) {
  assert.expect(1);
  var person;
  var observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Dogzn',
            lastName: 'Katz'
          }
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            firstName: 'Katzn',
            lastName: 'Dogz'
          }
        }
      ]
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}, {id: '2', type: 'person'}]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '2',
          attributes: {
            firstName: 'Katzn',
            lastName: 'Dogz'
          }
        }
      ]
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship triggers observers once if the relationship was made shorter', function(assert) {
  assert.expect(1);
  var person;
  var observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Dogzn',
            lastName: 'Katz'
          }
        }
      ]
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: []
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship triggers observers once if the relationship was reordered', function(assert) {
  assert.expect(1);
  var person;
  var observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}, {id: '2', type: 'person'}]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Dogzn',
            lastName: 'Katz'
          }
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            firstName: 'Katzn',
            lastName: 'Dogz'
          }
        }
      ]

    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [{id: '2', type: 'person'}, {id: '1', type: 'person'}]
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship does not trigger observers if the relationship was not changed', function(assert) {
  assert.expect(1);
  var person;
  var observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}]
          }
        }
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Dogzn',
            lastName: 'Katz'
          }
        }
      ]

    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [{id: '1', type: 'person'}]
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(observerCount, 0, 'siblings observer should not be triggered');
  });
});
