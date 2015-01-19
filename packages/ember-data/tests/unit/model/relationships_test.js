var get = Ember.get;
var run = Ember.run;

module("unit/model/relationships - DS.Model");

test("exposes a hash of the relationships on a model", function() {
  var Occupation = DS.Model.extend();

  var Person = DS.Model.extend({
    occupations: DS.hasMany('occupation')
  });

  Person.reopen({
    people: DS.hasMany('person', { inverse: 'parent' }),
    parent: DS.belongsTo('person', { inverse: 'people' })
  });

  var store = createStore({
    occupation: Occupation,
    person: Person
  });
  var person, occupation;

  run(function() {
    person = store.createRecord('person');
    occupation = store.createRecord('occupation');
  });

  var relationships = get(Person, 'relationships');
  deepEqual(relationships.get(Person), [
    { name: "people", kind: "hasMany" },
    { name: "parent", kind: "belongsTo" }
  ]);
  deepEqual(relationships.get(Occupation), [
    { name: "occupations", kind: "hasMany" }
  ]);
});
