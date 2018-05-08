import { get } from '@ember/object';
import { createStore } from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let Occupation, Person, store;

module('unit/model/relationships - DS.Model', {
  beforeEach() {
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

test('exposes a hash of the relationships on a model', function(assert) {
  store.createRecord('person');
  store.createRecord('occupation');

  let relationships = get(Person, 'relationships');
  function extractDetails(key) {
    let descs = relationships.get(key);

    return descs.map(desc => {
      return {
        kind: desc.kind,
        name: desc.name,
        options: desc.options
      };
    });
  }

  assert.deepEqual(extractDetails('person'), [
    { name: "people", kind: "hasMany", options: { async: false, inverse: 'parent'} },
    { name: "parent", kind: "belongsTo", options: { async: false, inverse: 'people' } }
  ]);
  assert.deepEqual(extractDetails('occupation'), [
    { name: "occupations", kind: "hasMany", options: { async: false } }
  ]);
});

test('relationshipNames a hash of the relationships on a model with type as a key', function(assert) {
  assert.deepEqual(get(Person, 'relationshipNames'),
    { hasMany: ['occupations', 'people'], belongsTo: ["parent"] });
});

test('eachRelatedType() iterates over relations without duplication', function(assert) {
  let relations = [];

  Person.eachRelatedType(modelName => relations.push(modelName));

  assert.deepEqual(relations, ['occupation', 'person']);
});
