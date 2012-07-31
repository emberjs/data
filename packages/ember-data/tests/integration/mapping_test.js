var ParentAdapter, ChildAdapter, Person, store;

module("Mapping Attributes", {
  setup: function() {
    Person = window.Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    ParentAdapter = DS.Adapter.extend();
    ChildAdapter = ParentAdapter.extend();
  },

  teardown: function() {
    window.Person = null;
    if (store) { store.destroy(); }
  }
});

test("Attributes mapped on an adapter class should be used when materializing a record.", function() {
  ChildAdapter.map('Person', {
    firstName: { key: 'FIRST_NAME' },
    lastName: { key: 'LAST_NAME' }
  });

  store = DS.Store.create({
    adapter: ChildAdapter
  });

  window.billy = true;
  store.load(Person, {
    id: 1,
    FIRST_NAME: "Chuck",
    LAST_NAME: "Testa"
  });

  var chuck = store.find(Person, 1);
  chuck.get('data');
  window.billy = false;

  equal(chuck.get('firstName'), "Chuck", "first name is Chuck");
  equal(chuck.get('lastName'), "Testa", "last name is Testa");
});
