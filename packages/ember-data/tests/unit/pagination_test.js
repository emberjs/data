var get = Ember.get, set = Ember.set;
var resolve = Ember.RSVP.resolve;
var env, Person, Phone, Adapter, pageSize = 1;

module("unit/pagination - Pagination", {
  setup: function() {
    // TestAdapter = DS.Adapter.extend();
    Person = DS.Model.extend({
      name: DS.attr('string'),
      phones: DS.hasMany('phone', { async: true })
    });

    Phone = DS.Model.extend({
      person: DS.belongsTo('person')
    });

    Adapter = DS.FixtureAdapter.extend({
      queryFixtures: function(fixtures, query, type) {
        return fixtures;
      }
    });

    env = setupStore({ person: Person, phone: Phone, adapter: Adapter });
    // env.adapter.simulateRemoteResponse = true;
    set(env.adapter, 'pageSize', pageSize);
  },
  teardown: function() {
    if (env.store) { env.store.destroy(); }
  }
});

test("findAll takes an optional page number and paginates the results", function() {
  var page = 1;
  Person.FIXTURES = [
    {id: 1, name: 'Dimebag Dale'},
    {id: 2, name: 'Yehuda Brynjolffsosysdfon'}
  ];
  env.store.findAll(Person, 1).then(async(function(results) {
    equal(get(results, 'length'), pageSize);
    equal(get(results.objectAt(0), 'id'), 1);
  }));
});

test("findQuery takes an optional page number and paginates the results", function() {
  var page = 1;
  Person.FIXTURES = [
    {id: 1, name: 'Dimebag Dale'},
    {id: 2, name: 'Yehuda Brynjolffsosysdfon'}
  ];
  env.store.findQuery(Person, {}, 2).then(async(function(results) {
    equal(get(results, 'length'), pageSize);
    equal(get(results.objectAt(0), 'id'), 2);
  }));
});
