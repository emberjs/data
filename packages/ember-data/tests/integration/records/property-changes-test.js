var env, store, Person;
var attr = DS.attr;
var run = Ember.run;

module('integration/records/property-changes - Property changes', {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string')
    });
    Person.toString = function() { return 'Person'; };

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test('Calling push with partial records trigger observers for just those attributes that changed', function() {
  expect(1);
  var person;

  run(function() {
    person = store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz'
    });
  });

  person.addObserver('firstName', function() {
    ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    ok(true, 'lastName observer should be triggered');
  });

  run(function() {
    store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz!'
    });
  });
});

test('Calling push does not trigger observers for locally changed attributes with the same value', function() {
  expect(0);
  var person;

  run(function() {
    person = store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz'
    });

    person.set('lastName', 'Katz!');
  });

  person.addObserver('firstName', function() {
    ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    ok(false, 'lastName observer should not be triggered');
  });

  run(function() {
    store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz!'
    });
  });
});

test('Saving a record trigger observers for locally changed attributes with the same canonical value', function() {
  expect(1);
  var person;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ id: 'wat', lastName: 'Katz' });
  };

  run(function() {
    person = store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz'
    });

    person.set('lastName', 'Katz!');
  });

  person.addObserver('firstName', function() {
    ok(false, 'firstName observer should not be triggered');
  });

  person.addObserver('lastName', function() {
    ok(true, 'lastName observer should be triggered');
  });

  run(function() {
    person.save();
  });
});

test('store.push should not override a modified attribute', function() {
  expect(1);
  var person;

  run(function() {
    person = store.push('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz'
    });

    person.set('lastName', 'Katz!');
  });

  person.addObserver('firstName', function() {
    ok(true, 'firstName observer should be triggered');
  });

  person.addObserver('lastName', function() {
    ok(false, 'lastName observer should not be triggered');
  });

  run(function() {
    person = store.push('person', {
      id: 'wat',
      firstName: 'Tom',
      lastName: 'Dale'
    });
  });
});
