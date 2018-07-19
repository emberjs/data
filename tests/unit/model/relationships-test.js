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
      parent: DS.belongsTo('person', { inverse: 'people', async: false }),
    });

    store = createStore({
      occupation: Occupation,
      person: Person,
    });

    Person = store.modelFor('person');
  },
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
        options: desc.options,
      };
    });
  }

  assert.deepEqual(extractDetails('person'), [
    { name: 'people', kind: 'hasMany', options: { async: false, inverse: 'parent' } },
    { name: 'parent', kind: 'belongsTo', options: { async: false, inverse: 'people' } },
  ]);
  assert.deepEqual(extractDetails('occupation'), [
    { name: 'occupations', kind: 'hasMany', options: { async: false } },
  ]);
});

test('relationshipNames a hash of the relationships on a model with type as a key', function(assert) {
  assert.deepEqual(get(Person, 'relationshipNames'), {
    hasMany: ['occupations', 'people'],
    belongsTo: ['parent'],
  });
});

test('eachRelatedType() iterates over relations without duplication', function(assert) {
  let relations = [];

  Person.eachRelatedType(modelName => relations.push(modelName));

  assert.deepEqual(relations, ['occupation', 'person']);
});

test('normalizing belongsTo relationship names', function(assert) {
  const UserProfile = DS.Model.extend({
    user: DS.belongsTo(),
  });

  let User = DS.Model.extend({
    userProfile: DS.belongsTo(),
  });

  store = createStore({
    user: User,
    userProfile: UserProfile,
  });

  User = store.modelFor('user');

  const relationships = get(User, 'relationships');

  assert.ok(relationships.has('user-profile'), 'relationship key has been normalized');

  const relationship = relationships.get('user-profile')[0];

  assert.equal(relationship.meta.name, 'userProfile', 'relationship name has not been changed');
});

test('normalizing hasMany relationship names', function(assert) {
  const StreamItem = DS.Model.extend({
    user: DS.belongsTo(),
  });

  let User = DS.Model.extend({
    streamItems: DS.hasMany(),
  });

  store = createStore({
    user: User,
    streamItem: StreamItem,
  });

  User = store.modelFor('user');

  const relationships = get(User, 'relationships');

  assert.ok(relationships.has('stream-item'), 'relationship key has been normalized');

  const relationship = relationships.get('stream-item')[0];

  assert.equal(relationship.meta.name, 'streamItems', 'relationship name has not been changed');
});
