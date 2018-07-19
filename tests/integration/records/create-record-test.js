import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Store from 'ember-data/store';
import Model from 'ember-data/model';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

class Person extends Model {
  @hasMany('pet', { inverse: 'owner', async: false })
  pets;
  @attr name;
}

class Pet extends Model {
  @belongsTo('person', { inverse: 'pets', async: false })
  owner;
  @attr name;
}

module('Store.createRecord() coverage', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');
  });

  test('unloading a newly created a record with a sync belongsTo relationship', async function(assert) {
    let chris = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          pets: {
            data: [],
          },
        },
      },
    });

    let pet = store.createRecord('pet', {
      name: 'Shen',
      owner: chris,
    });

    // check that we are properly configured
    assert.ok(pet.get('owner') === chris, 'Precondition: Our owner is Chris');

    let pets = chris
      .get('pets')
      .toArray()
      .map(pet => pet.get('name'));
    assert.deepEqual(pets, ['Shen'], 'Precondition: Chris has Shen as a pet');

    pet.unloadRecord();

    assert.ok(pet.get('owner') === null, 'Shen no longer has an owner');

    // check that the relationship has been dissolved
    pets = chris
      .get('pets')
      .toArray()
      .map(pet => pet.get('name'));
    assert.deepEqual(pets, [], 'Chris no longer has any pets');
  });

  test('unloading a record with a sync hasMany relationship to a newly created record', async function(assert) {
    let chris = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          pets: {
            data: [],
          },
        },
      },
    });

    let pet = store.createRecord('pet', {
      name: 'Shen',
      owner: chris,
    });

    // check that we are properly configured
    assert.ok(pet.get('owner') === chris, 'Precondition: Our owner is Chris');

    let pets = chris
      .get('pets')
      .toArray()
      .map(pet => pet.get('name'));
    assert.deepEqual(pets, ['Shen'], 'Precondition: Chris has Shen as a pet');

    chris.unloadRecord();

    assert.ok(pet.get('owner') === null, 'Shen no longer has an owner');

    // check that the relationship has been dissolved
    pets = chris
      .get('pets')
      .toArray()
      .map(pet => pet.get('name'));
    assert.deepEqual(pets, [], 'Chris no longer has any pets');
  });
});
