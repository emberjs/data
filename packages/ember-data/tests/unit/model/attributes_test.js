module("unit/model/attributes - DS.attr");

test("calling createRecord and passing in an undefined value for an attribute should be treated as if null", function () {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.createRecord('person', {id: 1, name: undefined});

  store.find(Person, 1).then(async(function(person) {
    strictEqual(person.get('name'), null, "undefined values should return null attributes");
  }));
});
