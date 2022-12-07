import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';

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

module('Editing a Record', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('model:pet', Pet);
    store = owner.lookup('service:store');
  });

  test('pushedData in the uncommitted state should move a record to committed', async function (assert) {
    const { owner } = this;
    owner.register(
      'model:user',
      class extends Model {
        @attr firstName;
        @attr lastName;
      }
    );
    const store = owner.lookup('service:store');
    const record = store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'Chris', lastName: 'Thoburn' } },
    });
    record.firstName = 'James';
    assert.true(record.hasDirtyAttributes, 'we are dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.updated.uncommitted', 'stateName is correct');
    store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'James', lastName: 'Thoburn' } },
    });
    assert.false(record.hasDirtyAttributes, 'we are not dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'stateName is correct');
    record.firstName = 'Chris';
    record.lastName = 'Youman';
    assert.true(record.hasDirtyAttributes, 'we are dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.updated.uncommitted', 'stateName is correct');
    store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'Chris', lastName: 'Thoburn' } },
    });
    assert.true(record.hasDirtyAttributes, 'we are dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.updated.uncommitted', 'stateName is correct');
    store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'Chris', lastName: 'Youman' } },
    });

    assert.false(record.hasDirtyAttributes, 'we are not dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'stateName is correct');
  });

  test('pushedData in the created.uncommitted state should move a record to committed', async function (assert) {
    const { owner } = this;
    owner.register(
      'model:user',
      class extends Model {
        @attr firstName;
        @attr lastName;
      }
    );
    const store = owner.lookup('service:store');
    const record = store.createRecord('user', { id: '1' });
    record.firstName = 'James';
    assert.true(record.isNew, 'we are new');
    assert.true(record.hasDirtyAttributes, 'we are dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.created.uncommitted', 'stateName is correct');
    store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'James', lastName: 'Thoburn' } },
    });
    assert.false(record.isNew, 'we are no longer new');
    assert.false(record.hasDirtyAttributes, 'we are not dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'stateName is correct');
    record.firstName = 'Chris';
    record.lastName = 'Youman';
    assert.true(record.hasDirtyAttributes, 'we are dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.updated.uncommitted', 'stateName is correct');
    store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'Chris', lastName: 'Thoburn' } },
    });
    assert.true(record.hasDirtyAttributes, 'we are dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.updated.uncommitted', 'stateName is correct');
    store.push({
      data: { type: 'user', id: '1', attributes: { firstName: 'Chris', lastName: 'Youman' } },
    });

    assert.false(record.hasDirtyAttributes, 'we are not dirty');
    assert.strictEqual(record.currentState.stateName, 'root.loaded.saved', 'stateName is correct');
  });

  test('Change parent relationship then unload original child', async function (assert) {
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

    assert.strictEqual(shen.owner, chris, 'Precondition: Chris is the current owner of Shen');
    assert.strictEqual(rocky.owner, john, 'Precondition: John is the current owner of Rocky');

    shen.owner = john;
    assert.strictEqual(shen.owner, john, 'Precondition: John is the new owner of Shen');

    let pets = john.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rocky', 'Shen'], 'Precondition: John has Rocky and Shen as pets');

    pets = chris.pets.map((pet) => pet.name);
    assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

    rocky.unloadRecord();

    assert.strictEqual(shen.owner, john, 'John is still the owner of Shen');

    pets = john.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Shen'], 'John has Shen as a pet');
  });

  module('Simple relationship addition case', function () {
    module('Adding a sync belongsTo relationship to a record', function () {
      test('We can add to a record', async function (assert) {
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
        assert.strictEqual(pet.owner, null, 'Precondition: Our owner is null');

        let pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.strictEqual(pet.owner, chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('We can add a new record to a record', async function (assert) {
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
        assert.strictEqual(pet.owner, null, 'Precondition: Our owner is null');

        let pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.strictEqual(pet.owner, chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('We can add a new record to a new record', async function (assert) {
        let chris = store.createRecord('person', {
          name: 'Chris',
          pets: [],
        });

        let pet = store.createRecord('pet', {
          name: 'Shen',
          owner: null,
        });

        // check that we are properly configured
        assert.strictEqual(pet.owner, null, 'Precondition: Our owner is null');

        let pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.strictEqual(pet.owner, chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('We can add to a new record', async function (assert) {
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
        assert.strictEqual(pet.owner, null, 'Precondition: Our owner is null');

        let pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, [], 'Precondition: Chris has no pets');

        pet.set('owner', chris);

        assert.strictEqual(pet.owner, chris, 'Shen has Chris as an owner');

        // check that the relationship has been established
        pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen'], 'Chris has Shen as a pet');
      });

      test('Change parent relationship and unload original parent', async function (assert) {
        let chris = store.push({
          data: {
            id: '1',
            type: 'person',
            attributes: { name: 'Chris' },
            relationships: {
              pets: {
                data: [
                  { type: 'pet', id: '3' },
                  { type: 'pet', id: '4' },
                ],
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

        assert.strictEqual(shen.owner, chris, 'Precondition: Chris is the current owner');
        assert.strictEqual(rocky.owner, chris, 'Precondition: Chris is the current owner');

        let pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen', 'Rocky'], 'Precondition: Chris has Shen and Rocky as pets');

        shen.set('owner', john);
        assert.strictEqual(shen.owner, john, 'After Update: John is the new owner of Shen');

        pets = chris.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Rocky'], 'After Update: Chris has Rocky as a pet');

        pets = john.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen'], 'After Update: John has Shen as a pet');

        chris.unloadRecord();

        assert.strictEqual(rocky.owner, null, 'After Unload: Rocky has no owner');
        assert.strictEqual(shen.owner, john, 'After Unload: John should still be the owner of Shen');

        pets = john.pets.slice().map((pet) => pet.name);
        assert.deepEqual(pets, ['Shen'], 'After Unload: John still has Shen as a pet');
      });
    });

    module('Adding an async belongsTo relationship to a record', function () {
      test('We can add to a record', async function (assert) {
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
        let chrisBestFriend = await chris.bestFriend;
        let jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, null, 'Precondition: Chris has no best friend');
        assert.strictEqual(jamesBestFriend, null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.bestFriend;
        jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, james, 'Chris has James as a best friend');
        assert.strictEqual(jamesBestFriend, chris, 'James has Chris as a best friend');
      });

      test('We can add a new record to a record', async function (assert) {
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
        let chrisBestFriend = await chris.bestFriend;
        let jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, null, 'Precondition: Chris has no best friend');
        assert.strictEqual(jamesBestFriend, null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.bestFriend;
        jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, james, 'Chris has James as a best friend');
        assert.strictEqual(jamesBestFriend, chris, 'James has Chris as a best friend');
      });

      test('We can add a new record to a new record', async function (assert) {
        let chris = store.createRecord('person', {
          name: 'Chris',
          bestFriend: null,
        });

        let james = store.createRecord('person', {
          name: 'James',
          bestFriend: null,
        });

        // check that we are properly configured
        let chrisBestFriend = await chris.bestFriend;
        let jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, null, 'Precondition: Chris has no best friend');
        assert.strictEqual(jamesBestFriend, null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.bestFriend;
        jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, james, 'Chris has James as a best friend');
        assert.strictEqual(jamesBestFriend, chris, 'James has Chris as a best friend');
      });

      test('We can add to a new record', async function (assert) {
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
        let chrisBestFriend = await chris.bestFriend;
        let jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, null, 'Precondition: Chris has no best friend');
        assert.strictEqual(jamesBestFriend, null, 'Precondition: James has no best friend');

        chris.set('bestFriend', james);

        // check that the relationship has been established
        chrisBestFriend = await chris.bestFriend;
        jamesBestFriend = await james.bestFriend;

        assert.strictEqual(chrisBestFriend, james, 'Chris has James as a best friend');
        assert.strictEqual(jamesBestFriend, chris, 'James has Chris as a best friend');
      });
    });
  });
});
