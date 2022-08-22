import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';

class Person extends Model {
  @hasMany('pet', { inverse: 'owner', async: false })
  pets;
  @belongsTo('pet', { inverse: 'bestHuman', async: true })
  bestDog;
  @attr()
  name;
}

class Pet extends Model {
  @belongsTo('person', { inverse: 'pets', async: false })
  owner;
  @belongsTo('person', { inverse: 'bestDog', async: false })
  bestHuman;
  @attr()
  name;
}

module('Store.createRecord() coverage', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');
  });

  test("createRecord doesn't crash when setter is involved", async function (assert) {
    class User extends Model {
      @attr() email;

      get name() {
        return this.email ? this.email.substring(0, this.email.indexOf('@')) : '';
      }

      set name(value) {
        this.email = `${value.toLowerCase()}@ember.js`;
      }
    }
    this.owner.register(`model:user`, User);
    const store = this.owner.lookup('service:store');

    const user = store.createRecord('user', { name: 'Robert' });
    assert.strictEqual(user.email, 'robert@ember.js');
  });

  test('unloading a newly created a record with a sync belongsTo relationship', async function (assert) {
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
    assert.strictEqual(pet.owner, chris, 'Precondition: Our owner is Chris');

    let pets = chris.pets.slice().map((pet) => pet.name);
    assert.deepEqual(pets, ['Shen'], 'Precondition: Chris has Shen as a pet');

    pet.unloadRecord();
    await settled();
    assert.strictEqual(pet.owner, null, 'Shen no longer has an owner');
    // check that the relationship has been dissolved
    pets = chris.pets.slice().map((pet) => pet.name);
    assert.deepEqual(pets, [], 'Chris no longer has any pets');
  });

  test('unloading a record with a sync hasMany relationship to a newly created record', async function (assert) {
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
    assert.strictEqual(pet.owner, chris, 'Precondition: Our owner is Chris');

    let pets = chris.pets.slice().map((pet) => pet.name);
    assert.deepEqual(pets, ['Shen'], 'Precondition: Chris has Shen as a pet');
    chris.unloadRecord();
    assert.strictEqual(pet.owner, null, 'Shen no longer has an owner');

    // check that the relationship has been dissolved
    pets = chris.pets.slice().map((pet) => pet.name);
    assert.deepEqual(pets, [], 'Chris no longer has any pets');
  });

  test('creating and saving a record with relationships puts them into the correct state', async function (assert) {
    this.owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, data) {
          return data;
        },
      })
    );
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },
        findRecord() {
          assert.ok(false, 'Adapter should not make any findRecord Requests');
        },
        findBelongsTo() {
          assert.ok(false, 'Adapter should not make any findBelongsTo Requests');
        },
        createRecord() {
          return resolve({
            data: {
              type: 'pet',
              id: '2',
              attributes: { name: 'Shen' },
              relationships: {
                bestHuman: {
                  data: { type: 'person', id: '1' },
                  links: { self: './person', related: './person' },
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
          bestDog: {
            data: null,
            links: { self: './dog', related: './dog' },
          },
        },
      },
    });

    let shen = store.createRecord('pet', {
      name: 'Shen',
      bestHuman: chris,
    });

    let bestHuman = shen.bestHuman;
    let bestDog = await chris.bestDog;

    // check that we are properly configured
    assert.strictEqual(bestHuman, chris, 'Precondition: Shen has bestHuman as Chris');
    assert.strictEqual(bestDog, shen, 'Precondition: Chris has Shen as his bestDog');

    await shen.save();

    bestHuman = shen.bestHuman;
    bestDog = await chris.bestDog;

    // check that the relationship has remained established
    assert.strictEqual(bestHuman, chris, 'Shen bestHuman is still Chris');
    assert.strictEqual(bestDog, shen, 'Chris still has Shen as bestDog');
  });
});
