var get = Ember.get;
var set = Ember.set;
var run = Ember.run;
var Occupation, Person, store;

module("unit/model/relationships - DS.Model", {
  setup: function() {
    Occupation = DS.Model.extend();

    Person = DS.Model.extend({
      occupations: DS.hasMany('occupation'),
      people: DS.hasMany('person', { inverse: 'parent' }),
      parent: DS.belongsTo('person', { inverse: 'people' })
    });

    store = createStore({
      occupation: Occupation,
      person: Person
    });

    set(Person, 'store', store);
  }
});

test("exposes a hash of the relationships on a model", function() {
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

test("relationshipNames a hash of the relationships on a model with type as a key", function() {
  deepEqual(get(Person, 'relationshipNames'),
    { hasMany: ['occupations', 'people'], belongsTo: ["parent"] });
});

test("eachRelatedType() iterates over relations without duplication", function() {
  var relations = [];

  Person.eachRelatedType(function(typeClass) {
    relations.push(typeClass.modelName);
  });

  deepEqual(relations, ['occupation', 'person']);
});
