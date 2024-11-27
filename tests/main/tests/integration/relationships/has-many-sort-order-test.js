import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE } from '@warp-drive/build-config/deprecations';

class User extends Model {
  @attr name;
  @hasMany('pet', { async: false, inverse: 'owner' }) pets;
}
class Pet extends Model {
  @attr name;
  @belongsTo('user', { async: false, inverse: 'pets' }) owner;
}

module('integration/relationships/hasMany - Sort Order', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:user', User);
    this.owner.register('model:pet', Pet);
  });

  test('hasMany reflects sort order from server', async function (assert) {
    const store = this.owner.lookup('service:store');
    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
      // we intentionally order the pets in a different order than the relationship
      // in case there is something around ordering of "seen" when processing the payload
      included: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Fido' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Spot' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '3',
          attributes: { name: 'Rex' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
      ],
    });

    const pets = user.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');
  });

  test('hasMany reflects sort order from server even when belongsTo side is received first', async function (assert) {
    const store = this.owner.lookup('service:store');

    store.push({
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Fido' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Spot' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '3',
          attributes: { name: 'Rex' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
      ],
    });

    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
    });

    const pets = user.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');
  });

  test('hasMany reflects local sort order when changes have been made', async function (assert) {
    const store = this.owner.lookup('service:store');

    const [pet1, pet2, pet3] = store.push({
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Fido' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Spot' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '3',
          attributes: { name: 'Rex' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
      ],
    });

    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
    });

    const pets = user.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');

    user.pets = [pet2, pet1, pet3];

    const locallyReorderedPets = user.pets.map((pet) => pet.name);
    assert.deepEqual(locallyReorderedPets, ['Spot', 'Fido', 'Rex'], 'Pets are in the right order after local reorder');
  });

  test('saving hasMany gives access to the new sort order', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.owner.register(
      'adapter:application',
      class TestAdapter {
        updateRecord(store, type, snapshot) {
          assert.step('updateRecord');
          const serialized = store.serializerFor(type.modelName).serialize(snapshot, { includeId: true });
          assert.step('serialized');
          return Promise.resolve(serialized);
        }
        static create() {
          return new this();
        }
      }
    );
    this.owner.register(
      'serializer:application',
      class TestSerializer {
        normalizeResponse(_, __, payload) {
          return payload;
        }

        serialize(snapshot) {
          const ids = snapshot.hasMany('pets', { ids: true });

          assert.step('serializing');
          assert.deepEqual(ids, ['2', '1', '3'], 'serialize hasMany returns the right order');

          return {
            data: {
              type: snapshot.modelName,
              id: snapshot.id,
              attributes: snapshot.attributes(),
              relationships: {
                pets: { data: ids.map((id) => ({ type: 'pet', id })) },
              },
            },
          };
        }

        static create() {
          return new this();
        }
      }
    );

    const [pet1, pet2, pet3] = store.push({
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Fido' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Spot' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '3',
          attributes: { name: 'Rex' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
      ],
    });

    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
    });

    const pets = user.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');

    user.pets = [pet2, pet1, pet3];

    const locallyReorderedPets = user.pets.map((pet) => pet.name);
    assert.deepEqual(locallyReorderedPets, ['Spot', 'Fido', 'Rex'], 'Pets are in the right order after local reorder');

    await user.save();

    assert.verifySteps(['updateRecord', 'serializing', 'serialized'], 'serialize was called');
  });

  test('hasMany reflects sort order from local changes aeven after new server state is recieved', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.owner.register(
      'adapter:application',
      class TestAdapter {
        updateRecord(store, type, snapshot) {
          assert.step('updateRecord');
          const serialized = store.serializerFor(type.modelName).serialize(snapshot, { includeId: true });
          assert.step('serialized');
          return Promise.resolve(serialized);
        }
        static create() {
          return new this();
        }
      }
    );
    this.owner.register(
      'serializer:application',
      class TestSerializer {
        normalizeResponse(_, __, payload) {
          return payload;
        }

        serialize(snapshot) {
          const ids = snapshot.hasMany('pets', { ids: true });

          assert.step('serializing');
          assert.deepEqual(ids, ['2', '1', '3'], 'serialize hasMany returns the right order');

          return {
            data: {
              type: snapshot.modelName,
              id: snapshot.id,
              attributes: snapshot.attributes(),
              relationships: {
                pets: { data: ids.map((id) => ({ type: 'pet', id })) },
              },
            },
          };
        }

        static create() {
          return new this();
        }
      }
    );

    const [pet1, pet2, pet3] = store.push({
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Fido' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Spot' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '3',
          attributes: { name: 'Rex' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
      ],
    });

    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
    });

    const pets = user.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');

    user.pets = [pet2, pet1, pet3];

    const locallyReorderedPets = user.pets.map((pet) => pet.name);
    assert.deepEqual(locallyReorderedPets, ['Spot', 'Fido', 'Rex'], 'Pets are in the right order after local reorder');

    store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
    });

    const petsAgain = user.pets.map((pet) => pet.name);
    if (DEPRECATE_RELATIONSHIP_REMOTE_UPDATE_CLEARING_LOCAL_STATE) {
      assert.deepEqual(petsAgain, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');
    } else {
      assert.deepEqual(petsAgain, ['Spot', 'Fido', 'Rex'], 'Pets are still in the right order');
    }
  });

  test('when we remove a record and save, the api is alerted', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.owner.register(
      'adapter:application',
      class TestAdapter {
        updateRecord(store, type, snapshot) {
          assert.step('updateRecord');
          const serialized = store.serializerFor(type.modelName).serialize(snapshot, { includeId: true });
          assert.step('serialized');
          return Promise.resolve(serialized);
        }
        static create() {
          return new this();
        }
      }
    );
    this.owner.register(
      'serializer:application',
      class TestSerializer {
        normalizeResponse(_, __, payload) {
          return payload;
        }

        serialize(snapshot) {
          const ids = snapshot.hasMany('pets', { ids: true });

          assert.step('serializing');
          assert.deepEqual(ids, ['2', '3'], 'serialize hasMany returns the right order');

          return {
            data: {
              type: snapshot.modelName,
              id: snapshot.id,
              attributes: snapshot.attributes(),
              relationships: {
                pets: { data: ids.map((id) => ({ type: 'pet', id })) },
              },
            },
          };
        }

        static create() {
          return new this();
        }
      }
    );

    const [pet1, pet2, pet3] = store.push({
      data: [
        {
          type: 'pet',
          id: '1',
          attributes: { name: 'Fido' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '2',
          attributes: { name: 'Spot' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
        {
          type: 'pet',
          id: '3',
          attributes: { name: 'Rex' },
          relationships: { owner: { data: { type: 'user', id: '1' } } },
        },
      ],
    });

    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: { name: 'John' },
        relationships: {
          pets: {
            data: [
              { type: 'pet', id: '3' },
              { type: 'pet', id: '1' },
              { type: 'pet', id: '2' },
            ],
          },
        },
      },
    });

    const pets = user.pets.map((pet) => pet.name);
    assert.deepEqual(pets, ['Rex', 'Fido', 'Spot'], 'Pets are in the right order');

    user.pets = [pet2, pet3];

    const locallyReorderedPets = user.pets.map((pet) => pet.name);
    assert.deepEqual(
      locallyReorderedPets,
      ['Spot', 'Rex'],
      'Pets are in the right order after local reorder and removal'
    );

    await user.save();

    assert.verifySteps(['updateRecord', 'serializing', 'serialized'], 'serialize was called');

    const petsAgain = user.pets.map((pet) => pet.name);
    assert.deepEqual(petsAgain, ['Spot', 'Rex'], 'Pets are in the right order');

    assert.strictEqual(pet1.owner, null, 'pet1 has no owner');
  });
});
