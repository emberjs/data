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

test("records can be deleted during record array enumeration", function () {
  var adam, dave;
  run(function() {
    adam = env.store.push('person', { id: 1, name: "Adam Sunderland" });
    dave = env.store.push('person', { id: 2, name: "Dave Sunderland" });
  });
  var all  = env.store.all('person');

  // pre-condition
  equal(all.get('length'), 2, 'expected 2 records');

  Ember.run(function() {
    all.forEach(function(record) {
      record.deleteRecord();
    });
  });

  equal(all.get('length'), 0, 'expected 0 records');
});

test("when deleted records are rolled back, they are still in their previous record arrays", function () {
  var jaime, cersei;
  run(function() {
    jaime = env.store.push('person', { id: 1, name: "Jaime Lannister" });
    cersei = env.store.push('person', { id: 2, name: "Cersei Lannister" });
  });
  var all = env.store.all('person');
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
    jaime.rollback();
  });
  equal(all.get('length'), 2, 'record was not removed');
  equal(filtered.get('length'), 2, 'record was not removed');
});
