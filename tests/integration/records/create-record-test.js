import { module, test } from 'qunit';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import { setupTest } from 'ember-qunit';
import Store from 'ember-data/store';
import Model from 'ember-data/model';
import { resolve } from 'rsvp';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

class Person extends Model {
  @hasMany('pet', { inverse: 'owner', async: false })
  pets;
  @belongsTo('person', { inverse: 'bestFriend', async: false })
  bestFriend;
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

  test('creating and saving a record with relationships puts them into the correct state', async function(assert) {
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReload() {
          return false;
        },
        findRecord() {
          assert.ok(false, 'Adapter should not make any findRequests');
        },
        createRecord() {
          return resolve({
            data: {
              type: 'person',
              id: '2',
              attributes: { name: 'Shen' },
              relationships: {
                'best-friend': { // ugh serializer format
                  data: { type: 'person', id: '1' },
                },
              },
            },
          });
        },
      })
    );

    let chris = store.push({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            data: null,
          },
        },
      },
    });

    let shen = store.createRecord('person', {
      name: 'Shen',
      bestFriend: chris,
    });

    // check that we are properly configured
    assert.ok(shen.get('bestFriend') === chris, 'Precondition: Shen has bestFriend as Chris');
    assert.ok(chris.get('bestFriend') === shen, 'Precondition: Chris has Shen as his bestFriend');

    await shen.save();

    // check that the relationship has remained established
    assert.ok(shen.get('bestFriend') === chris, 'Shen bestFriend is still Chris');
    assert.ok(chris.get('bestFriend') === shen, 'Chris still has Shen as bestFriend');
  });
});
