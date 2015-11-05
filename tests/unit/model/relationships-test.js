import DS from 'ember-data';

var get = Ember.get;
var run = Ember.run;
var Occupation, Person, store;

module("unit/model/relationships - DS.Model", {
  setup: function() {
    Occupation = DS.Model.extend();

    Person = DS.Model.extend({
      occupations: DS.hasMany('occupation', { async: false }),
      people: DS.hasMany('person', { inverse: 'parent', async: false }),
      parent: DS.belongsTo('person', { inverse: 'people', async: false })
    });

    store = createStore({
      occupation: Occupation,
      person: Person
    });

    Person = store.modelFor('person');
  }
});

test("exposes a hash of the relationships on a model", function() {
  var person, occupation;

  run(function() {
    person = store.createRecord('person');
    occupation = store.createRecord('occupation');
  });

  var relationships = get(Person, 'relationships');
  deepEqual(relationships.get('person'), [
    { name: "people", kind: "hasMany" },
    { name: "parent", kind: "belongsTo" }
  ]);
  deepEqual(relationships.get('occupation'), [
    { name: "occupations", kind: "hasMany" }
  ]);
});

test("relationshipNames a hash of the relationships on a model with type as a key", function() {
  deepEqual(get(Person, 'relationshipNames'),
    { hasMany: ['occupations', 'people'], belongsTo: ["parent"] });
});

test("eachRelatedType() iterates over relations without duplication", function() {
  var relations = [];

  Person.eachRelatedType(function(modelName) {
    relations.push(modelName);
  });

  deepEqual(relations, ['occupation', 'person']);
});
