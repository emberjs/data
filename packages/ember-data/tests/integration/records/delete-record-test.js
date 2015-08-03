var attr = DS.attr;
var Person, env;
var run = Ember.run;

module("integration/deletedRecord - Deleting Records", {
  setup: function() {
    Person = DS.Model.extend({
      name: attr('string')
    });

    Person.toString = function() { return "Person"; };

    env = setupStore({
      person: Person
    });
  },

  teardown: function() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test("records should not be removed from record arrays just after deleting, but only after commiting them", function () {
  var adam, dave;

  env.adapter.deleteRecord = function() {
    return Ember.RSVP.Promise.resolve();
  };

  var all;
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
          name: 'Dave Sunderland'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    dave = env.store.peekRecord('person', 2);
    all  = env.store.peekAll('person');
  });


  // pre-condition
  equal(all.get('length'), 2, 'pre-condition: 2 records in array');

  Ember.run(adam, 'deleteRecord');

  equal(all.get('length'), 2, '2 records in array after deleteRecord');

  Ember.run(adam, 'save');

  equal(all.get('length'), 1, '1 record in array after deleteRecord and save');
});

test("records can be deleted during record array enumeration", function () {
  var adam, dave;

  env.adapter.deleteRecord = function() {
    return Ember.RSVP.Promise.resolve();
  };

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
          name: 'Dave Sunderland'
        }
      }]
    });
    adam = env.store.peekRecord('person', 1);
    dave = env.store.peekRecord('person', 2);
  });
  var all = env.store.peekAll('person');

  // pre-condition
  equal(all.get('length'), 2, 'expected 2 records');

  Ember.run(function() {
    all.forEach(function(record) {
      record.destroyRecord();
    });
  });

  equal(all.get('length'), 0, 'expected 0 records');
  equal(all.objectAt(0), null, "can't get any records");
});

test("when deleted records are rolled back, they are still in their previous record arrays", function () {
  var jaime, cersei;
  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Jaime Lannister'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Cersei Lannister'
        }
      }]
    });
    jaime = env.store.peekRecord('person', 1);
    cersei = env.store.peekRecord('person', 2);
  });
  var all = env.store.peekAll('person');
  var filtered;
  run(function() {
    filtered = env.store.filter('person', function () {
      return true;
    });
  });

  equal(all.get('length'), 2, 'precond - we start with two people');
  equal(filtered.get('length'), 2, 'precond - we start with two people');

  run(function() {
    jaime.deleteRecord();
    jaime.rollbackAttributes();
  });
  equal(all.get('length'), 2, 'record was not removed');
  equal(filtered.get('length'), 2, 'record was not removed');
});
