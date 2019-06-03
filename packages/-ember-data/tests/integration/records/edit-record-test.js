import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import Store from '@ember-data/store';
import Model from '@ember-data/model';
import { attr, hasMany, belongsTo } from '@ember-data/model';
import todo from '../../helpers/todo';

class Person extends Model {
  @hasMany('pet', { inverse: 'owner', async: false })
  pets;
  @hasMany('person', { inverse: 'friends', async: true })
  friends;
  @belongsTo('person', { inverse: 'bestFriend', async: true })
  bestFriend;
  @attr()
  name;
}

class Pet extends Model {
  @belongsTo('person', { inverse: 'pets', async: false })
  owner;
  @attr()
  name;
}

module('Editing a Record', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');
  });

  module('Simple relationship addition case', function() {
    module('Adding a sync belongsTo relationship to a record', function() {
      test('We can add to a record', async function(assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              pets: {
                data: [],
              },
            },
          },
        });

        let pet = store.push({
          data: {
            id: '1',
            type: 'pet',
            attributes: { name: 'Shen' },
            relationships: {
              owner: {
                data: null,
              },
            },
          },
        });

        // check that we are properly configured
        assert.ok(pet.get('owner') === null, 'Precondition: Our owner is null');

        let pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.ok(pet.get('owner') === chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('We can add a new record to a record', async function(assert) {
        let chris = store.createRecord('person', {
          name: 'Chris',
          pets: [],
        });

        let pet = store.push({
          data: {
            id: '1',
            type: 'pet',
            attributes: { name: 'Shen' },
            relationships: {
              owner: {
                data: null,
              },
            },
          },
        });

        // check that we are properly configured
        assert.ok(pet.get('owner') === null, 'Precondition: Our owner is null');

        let pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.ok(pet.get('owner') === chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('We can add a new record to a new record', async function(assert) {
        let chris = store.createRecord('person', {
          name: 'Chris',
          pets: [],
        });

        let pet = store.createRecord('pet', {
          name: 'Shen',
          owner: null,
        });

        // check that we are properly configured
        assert.ok(pet.get('owner') === null, 'Precondition: Our owner is null');

        let pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.ok(pet.get('owner') === chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('We can add to a new record', async function(assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              pets: {
                data: [],
              },
            },
          },
        });

        let pet = store.createRecord('pet', {
          name: 'Shen',
          owner: null,
        });

        // check that we are properly configured
        assert.ok(pet.get('owner') === null, 'Precondition: Our owner is null');

        let pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.ok(pet.get('owner') === chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris
          .get('pets')
          .toArray()
          .map(pet => pet.get('name'));
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('Change parent relationship and unload original parent', async function(assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              pets: {
                data: [{ type: 'pet', id: '3' }, { type: 'pet', id: '4' }],
              },
            },
          },
        });

        let john = store.push({
          data: {
            id: '2',
            type: 'person',
            attributes: { name: 'John' },
            relationships: {
              pets: {
                data: [],
              },
            },
          },
        });

        let shen = store.push({
          data: {
            id: '3',
            type: 'pet',
            attributes: { name: 'Shen' },
            relationships: {
              owner: {
                data: {
                  type: 'person',
                  id: '1',
                },
              },
            },
          },
        });

        let rocky = store.push({
          data: {
            id: '4',
            type: 'pet',
            attributes: { name: 'Rocky' },
            relationships: {
              owner: {
                data: {
                  type: 'person',
                  id: '1',
                },
              },
            },
          },
        });

        assert.ok(shen.get('owner') === chris, 'Precondition: Chris is the current owner');
        assert.ok(rocky.get('owner') === chris, 'Precondition: Chris is the current owner');

        let pets = chris.pets.toArray().map(pet => pet.name);
        assert.deepEqual(pets, ['Shen', 'Rocky'], 'Precondition: Chris has Shen and Rocky as pets');

        shen.set('owner', john);
        assert.ok(shen.get('owner') === john, 'Precondition: John is the new owner of Shen');

        pets = chris.pets.toArray().map(pet => pet.name);
        assert.deepEqual(pets, ['Rocky'], 'Precondition: Chris has Rocky as a pet');

        pets = john.pets.toArray().map(pet => pet.name);
        assert.deepEqual(pets, ['Shen'], 'Precondition: John has Shen as a pet');

        chris.unloadRecord();

        assert.ok(rocky.get('owner') === null, 'Rocky has no owner');
        assert.ok(shen.get('owner') === john, 'John should still be the owner of Shen');

        pets = john.pets.toArray().map(pet => pet.name);
        assert.deepEqual(pets, ['Shen'], 'John still has Shen as a pet');
      });

      todo('Change parent relationship then unload original child', async function(assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              pets: {
                data: [{ type: 'pet', id: '3' }],
              },
            },
          },
        });

        let john = store.push({
          data: {
            id: '2',
            type: 'person',
            attributes: { name: 'John' },
            relationships: {
              pets: {
                data: [{ type: 'pet', id: '4' }],
              },
            },
          },
        });

        let shen = store.push({
          data: {
            id: '3',
            type: 'pet',
            attributes: { name: 'Shen' },
            relationships: {
              owner: {
                data: {
                  type: 'person',
                  id: '1',
                },
              },
            },
          },
        });

        let rocky = store.push({
          data: {
            id: '4',
            type: 'pet',
            attributes: { name: 'Rocky' },
            relationships: {
              owner: {
                data: {
                  type: 'person',
                  id: '2',
                },
              },
            },
          },
        });

        assert.ok(shen.get('owner') === chris, 'Precondition: Chris is the current owner of Shen');
        assert.ok(rocky.get('owner') === john, 'Precondition: John is the current owner of Rocky');

        shen.set('owner', john);
        assert.ok(shen.get('owner') === john, 'Precondition: John is the new owner of Shen');

        let pets = john.pets.toArray().map(pet => pet.name);
        assert.deepEqual(pets, ['Rocky', 'Shen'], 'Precondition: John has Rocky and Shen as pets');

        pets = chris.pets.toArray().map(pet => pet.name);
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        rocky.unloadRecord();

        assert.ok(shen.get('owner') === john, 'John is still the owner of Shen');

        pets = john.pets.toArray().map(pet => pet.name);
        assert.todo.deepEqual(pets, ['Shen'], 'John has Shen as a pet');
      });
    });

    module('Adding an async belongsTo relationship to a record', function() {
      test('We can add to a record', async function(assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              bestFriend: {
                data: null,
              },
            },
          },
        });

        let james = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'James' },
            relationships: {
              bestFriend: {
                data: null,
              },
            },
          },
        });

        // check that we are properly configured
        let chrisBestFriend = await chris.get('bestFriend');
        let jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === null, 'Precondition: Chris has no best friend');
        assert.ok(jamesBestFriend === null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.get('bestFriend');
        jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === james, 'Chris has James as a best friend');
        assert.ok(jamesBestFriend === chris, 'James has Chris as a best friend');
      });

      test('We can add a new record to a record', async function(assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              bestFriend: {
                data: null,
              },
            },
          },
        });

        let james = store.createRecord('person', {
          name: 'James',
          bestFriend: null,
        });

        // check that we are properly configured
        let chrisBestFriend = await chris.get('bestFriend');
        let jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === null, 'Precondition: Chris has no best friend');
        assert.ok(jamesBestFriend === null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.get('bestFriend');
        jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === james, 'Chris has James as a best friend');
        assert.ok(jamesBestFriend === chris, 'James has Chris as a best friend');
      });

      test('We can add a new record to a new record', async function(assert) {
        let chris = store.createRecord('person', {
          name: 'Chris',
          bestFriend: null,
        });

        let james = store.createRecord('person', {
          name: 'James',
          bestFriend: null,
        });

        // check that we are properly configured
        let chrisBestFriend = await chris.get('bestFriend');
        let jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === null, 'Precondition: Chris has no best friend');
        assert.ok(jamesBestFriend === null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.get('bestFriend');
        jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === james, 'Chris has James as a best friend');
        assert.ok(jamesBestFriend === chris, 'James has Chris as a best friend');
      });

      test('We can add to a new record', async function(assert) {
        let chris = store.createRecord('person', {
          name: 'Chris',
          bestFriend: null,
        });

        let james = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'James' },
            relationships: {
              bestFriend: {
                data: null,
              },
            },
          },
        });

        // check that we are properly configured
        let chrisBestFriend = await chris.get('bestFriend');
        let jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === null, 'Precondition: Chris has no best friend');
        assert.ok(jamesBestFriend === null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.get('bestFriend');
        jamesBestFriend = await james.get('bestFriend');

        assert.ok(chrisBestFriend === james, 'Chris has James as a best friend');
        assert.ok(jamesBestFriend === chris, 'James has Chris as a best friend');
      });
    });
  });
});
