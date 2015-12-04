var env, store, Person;
var attr = DS.attr;
var run = Ember.run;

module('integration/records/error', {
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

test('adding errors during root.loaded.created.invalid works', function() {
  expect(3);

  var person = run(() => {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        }
      }
    });
    return store.peekRecord('person', 'wat');
  });

  Ember.run(() => {
    person.set('firstName', null);
    person.set('lastName', null);
  });

  equal(person._internalModel.currentState.stateName, 'root.loaded.updated.uncommitted');
  Ember.run(() => person.get('errors').add('firstName', 'is invalid') );

  equal(person._internalModel.currentState.stateName, 'root.loaded.updated.invalid');

  Ember.run(() => person.get('errors').add('lastName', 'is invalid') );

  deepEqual(person.get('errors').toArray(), [
    { attribute: 'firstName', message: 'is invalid' },
    { attribute: 'lastName', message: 'is invalid' }
  ]);
});


test('adding errors root.loaded.created.invalid works', function() {
  expect(3);

  var person = run(() => {
    return store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz'
    });
  });

  Ember.run(() => {
    person.set('firstName', null);
    person.set('lastName', null);
  });

  equal(person._internalModel.currentState.stateName, 'root.loaded.created.uncommitted');

  Ember.run(() => person.get('errors').add('firstName', 'is invalid') );

  equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

  Ember.run(() => person.get('errors').add('lastName', 'is invalid') );

  deepEqual(person.get('errors').toArray(), [
    { attribute: 'firstName', message: 'is invalid' },
    { attribute: 'lastName', message: 'is invalid' }
  ]);
});

test('adding errors root.loaded.created.invalid works add + remove + add', function() {
  expect(4);

  var person = run(() => {
    return store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda'
    });
  });

  Ember.run(() => {
    person.set('firstName', null);
  });

  equal(person._internalModel.currentState.stateName, 'root.loaded.created.uncommitted');

  Ember.run(() => person.get('errors').add('firstName', 'is invalid') );

  equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

  Ember.run(() => person.get('errors').remove('firstName'));

  deepEqual(person.get('errors').toArray(), []);

  Ember.run(() => person.get('errors').add('firstName', 'is invalid') );

  deepEqual(person.get('errors').toArray(), [
    { attribute: 'firstName', message: 'is invalid' }
  ]);
});

test('adding errors root.loaded.created.invalid works add + (remove, add)', function() {
  expect(4);

  var person = run(() => {
    return store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda'
    });
  });

  Ember.run(() => {
    person.set('firstName', null);
  });

  equal(person._internalModel.currentState.stateName, 'root.loaded.created.uncommitted');

  Ember.run(() => {
    person.get('errors').add('firstName', 'is invalid');
  });

  equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

  Ember.run(() => {
    person.get('errors').remove('firstName');
    person.get('errors').add('firstName', 'is invalid');
  });


  equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

  deepEqual(person.get('errors').toArray(), [
    { attribute: 'firstName', message: 'is invalid' }
  ]);
});
