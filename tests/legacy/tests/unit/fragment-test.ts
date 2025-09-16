import { recordIdentifierFor } from '@warp-drive/core';
import type { TestContext } from '@warp-drive/diagnostic/ember';
import { module, setupRenderingTest, test, todo } from '@warp-drive/diagnostic/ember';
import { POST } from '@warp-drive/holodeck/mock';

import { type Name, type NameFragment, NameSchema } from '../-test-store/schemas/name';
import { type Passenger, PassengerSchema } from '../-test-store/schemas/passenger';
import { type Person, PersonSchema } from '../-test-store/schemas/person';
import { type Prefix, PrefixSchema } from '../-test-store/schemas/prefix';
import { type Vehicle, VehicleSchema } from '../-test-store/schemas/vehicle';
import { type Zoo, ZooSchema } from '../-test-store/schemas/zoo';
import type { Store } from '../-test-store/store';
import { createTestStore } from '../-test-store/store';

interface AppTestContext extends TestContext {
  store: Store;
}

module<AppTestContext>('Unit - `Fragment`', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.store = createTestStore(
      {
        schemas: [PersonSchema, NameSchema, PassengerSchema, PrefixSchema, VehicleSchema, ZooSchema],
      },
      this
    );
  });

  test('fragments support toString', function (this: AppTestContext, assert) {
    this.store.push({
      data: {
        type: 'vehicle',
        id: '1',
        attributes: {
          passenger: {
            name: {
              first: 'Loras',
              last: 'Tyrell',
            },
          },
        },
      },
    });

    const vehicle = this.store.peekRecord<Vehicle>('vehicle', '1') as Vehicle;
    const passenger = vehicle.passenger as Passenger;
    const name = passenger.name as Name;

    assert.equal(passenger.toString(), 'Record<vehicle:1 (@lid:vehicle-1)>');
    assert.equal(name.toString(), 'Record<vehicle:1 (@lid:vehicle-1)>');
  });

  test("changes to fragments are indicated in the owner record's `changedAttributes`", function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: {
            first: 'Loras',
            last: 'Tyrell',
          },
        },
      },
    });

    // Open question: is it important to preserve fragmentArrays on fragments
    // getting their value defaulted to `[]` in the json representation in the cache.
    // if so, we should do that via normalization.
    const name = person.name as NameFragment;

    name.set('last', 'Baratheon');

    const [oldName, newName] = person.changedAttributes().name;
    assert.deepEqual(oldName, { first: 'Loras', last: 'Tyrell' }, 'old fragment is indicated in the diff object');
    assert.deepEqual(newName, { first: 'Loras', last: 'Baratheon' }, 'new fragment is indicated in the diff object');
  });

  test('fragmentArrays default to empty arrays on access and can be mutated', async function (this: AppTestContext, assert) {
    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: {
            first: 'Loras',
            last: 'Tyrell',
            // we intentionally left prefixes off
          },
        },
      },
    });

    const person = await this.store.findRecord<Person>('person', '1');
    const { prefixes } = person.name as Name;

    assert.deepEqual(prefixes, [], 'fragment array defaults to an empty array');

    prefixes.push({ name: 'Lord' } as Prefix);

    assert.satisfies(prefixes, [{ name: 'Lord' }], 'new prefix is added to the fragment array');
  });

  test("fragment properties that are set to null are indicated in the owner record's `changedAttributes`", async function (this: AppTestContext, assert) {
    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: {
            first: 'Rob',
            last: 'Stark',
          },
        },
      },
    });

    const person = await this.store.findRecord<Person>('person', '1');
    person.set('name', null);

    const [oldName, newName] = person.changedAttributes().name;
    assert.deepEqual(oldName, { first: 'Rob', last: 'Stark' }, 'old fragment is indicated in the diff object');
    assert.deepEqual(newName, null, 'new fragment is indicated in the diff object');
  });

  test("fragment properties that are initially null are indicated in the owner record's `changedAttributes`", async function (this: AppTestContext, assert) {
    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: null,
        },
      },
    });

    const person = await this.store.findRecord<Person>('person', '1');
    person.set('name', {
      first: 'Rob',
      last: 'Stark',
    });

    const [oldName, newName] = person.changedAttributes().name;
    assert.deepEqual(oldName, null, 'old fragment is indicated in the diff object');
    assert.deepEqual(newName, { first: 'Rob', last: 'Stark' }, 'new fragment is indicated in the diff object');

    const identifier = recordIdentifierFor(person);
    this.store.cache.willCommit(identifier, null);

    const [oldNameAfterWillCommit, newNameAfterWillCommit] = person.changedAttributes().name;
    assert.deepEqual(oldNameAfterWillCommit, null, 'old fragment is indicated in the diff object');
    assert.deepEqual(
      newNameAfterWillCommit,
      { first: 'Rob', last: 'Stark' },
      'new fragment is indicated in the diff object'
    );

    // @ts-expect-error TODO: fix this type error
    this.store.cache.didCommit(identifier, {
      request: {},
      response: new Response(),
      content: {
        data: { type: identifier.type, id: identifier.id!, attributes: {} },
      },
    });

    assert.equal(person.changedAttributes().name, undefined, 'changedAttributes is reset after commit');
  });

  todo(
    "(redux) fragment properties that are initially null are indicated in the owner record's `changedAttributes`",
    function (this: AppTestContext, assert) {
      const person = this.store.push<Person>({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: null,
          },
        },
      });

      person.set('name', {
        first: 'Rob',
        last: 'Stark',
      });

      const [oldName, newName] = person.changedAttributes().name;
      assert.deepEqual(oldName, null, 'old fragment is indicated in the diff object');
      assert.deepEqual(newName, { first: 'Rob', last: 'Stark' }, 'new fragment is indicated in the diff object');

      // what is missing here?

      const [oldNameAfterWillCommit, newNameAfterWillCommit] = person.changedAttributes().name;
      assert.deepEqual(oldNameAfterWillCommit, null, 'old fragment is indicated in the diff object');
      assert.deepEqual(
        newNameAfterWillCommit,
        { first: 'Rob', last: 'Stark' },
        'new fragment is indicated in the diff object'
      );

      this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: { first: 'Rob', last: 'Stark' },
          },
        },
      });

      assert.equal(person.changedAttributes().name, undefined, 'changedAttributes is reset after commit');
    }
  );

  test('changes to attributes can be rolled back', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: {
            first: 'Ramsay',
            last: 'Snow',
          },
        },
      },
    });

    const name = person.name as NameFragment;

    name.set('last', 'Bolton');
    // @ts-expect-error TODO: fix this type error
    name.rollbackAttributes();

    assert.equal(name.last, 'Snow', 'fragment properties are restored');
    assert.notOk(name.hasDirtyAttributes, 'fragment is in clean state');
  });

  test('fragments unloaded/reload w/ relationship', function (this: AppTestContext, assert) {
    // Related to: https://github.com/lytics/ember-data-model-fragments/issues/261

    const pushPerson = () => {
      this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            title: 'Zoo Manager',
          },
        },
      });
      return this.store.peekRecord<Person>('person', '1') as Person;
    };

    const pushZoo = () => {
      this.store.push({
        data: {
          type: 'zoo',
          id: '1',
          attributes: {
            name: 'Cincinnati Zoo',
            star: {
              $type: 'elephant',
              name: 'Sabu',
            },
          },
          relationships: {
            manager: {
              data: { type: 'person', id: '1' },
            },
          },
        },
      });
      return this.store.peekRecord<Zoo>('zoo', '1') as Zoo;
    };

    const person = pushPerson();
    let zoo = pushZoo();

    assert.equal(person.title, 'Zoo Manager', 'Person has the right title');
    assert.equal(
      // @ts-expect-error TODO: figure out if we should be using content here
      zoo.manager.content,
      person,
      'Manager relationship was correctly loaded'
    );
    // TODO: look at this after we enable polymorphism
    // assert.equal(
    //   zoo.star.name,
    //   'Sabu',
    //   'Elephant fragment has the right name.',
    // );
    assert.notOk(person?.isDestroyed, 'Person is no destroyed');
    assert.notOk(zoo?.isDestroyed, 'Zoo is not destroyed');
    // TODO: look at this after we enable polymorphism
    // assert.notOk(zoo.star?.isDestroyed, 'Fragment is not destroyed');

    // Unload the record
    zoo.unloadRecord();

    assert.notOk(person?.isDestroyed, 'Person was not unloaded');

    // Load a new record
    const origZoo = zoo;
    zoo = pushZoo();
    // TODO: look at this after we enable polymorphism
    // zoo.star; // Prime the fragment on the new model

    // Make sure the reloaded record is new and has the right data
    assert.notOk(zoo.isDestroyed, 'Zoo was unloaded');
    // TODO: look at this after we enable polymorphism
    // assert.notOk(zoo.star?.isDestroyed, 'Fragment is now unloaded');
    assert.equal(
      // @ts-expect-error TODO: figure out if we should be using content here
      zoo.manager.content,
      person,
      'Manager relationship was correctly loaded'
    );
    // TODO: look at this after we enable polymorphism
    // assert.equal(
    //   zoo.star.name,
    //   'Sabu',
    //   'Elephant fragment has the right name.',
    // );

    assert.ok(zoo !== origZoo, 'A different instance of the zoo model was loaded');
    // TODO: look at this after we enable polymorphism
    // assert.ok(zoo.star !== origZoo.star, 'Fragments were not reused');
  });

  test('can be created with null', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: null,
        },
      },
    });

    assert.equal(person.name, null);
  });

  test('can be updated to null', function (this: AppTestContext, assert) {
    const person = this.store.push<Person>({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: {
            first: 'Eddard',
            last: 'Stark',
          },
        },
      },
    });

    assert.equal(person.name!.first, 'Eddard');

    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: null,
        },
      },
    });

    assert.equal(person.name, null);
  });

  module<AppTestContext>('fragment bug when initially set to `null`', function (innerHooks) {
    innerHooks.beforeEach(async function () {
      await POST(
        this,
        '/people',
        () => ({
          person: {
            id: '1',
            title: 'Mr.',
            nickName: 'Johnner',
            names: [{ first: 'John', last: 'Doe' }],
            name: {
              first: 'John',
              last: 'Doe',
              prefixes: [{ name: 'Mr.' }, { name: 'Sir' }],
            },
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person: {} }),
        }
      );
    });

    test('`person` fragments/fragment arrays are not initially `null`', async function (this: AppTestContext, assert) {
      const person = this.store.createRecord<Person>('person', {
        title: 'Mr.',
        // @ts-expect-error this is fine
        name: {},
      });

      assert.ok(person.name, 'name is not null');
      assert.ok(person.names, 'names is not null');
      assert.notOk(person.nickName, 'nickName is not set');

      await person.save();

      assert.equal(person.nickName, 'Johnner', 'nickName is correctly loaded');
      assert.satisfies(
        person.name as Name,
        {
          first: 'John',
          last: 'Doe',
          prefixes: [{ name: 'Mr.' }, { name: 'Sir' }],
        },
        'name is correctly loaded'
      );
      assert.satisfies(
        person.names?.slice() as Array<Name>,
        [{ first: 'John', last: 'Doe', prefixes: [] as Array<Prefix> }],
        'names is correct'
      );
    });

    test('`person` fragments/fragment arrays are initially `null`', async function (this: AppTestContext, assert) {
      const person = this.store.createRecord<Person>('person', {
        title: 'Mr.',
        name: null,
        names: null,
      });

      assert.equal(person.names, null, 'names is null');
      assert.notOk(person.nickName, 'nickName is not set');

      await person.save();

      assert.equal(person.nickName, 'Johnner', 'nickName is correctly loaded');
      assert.satisfies(
        person.name as Name,
        {
          first: 'John',
          last: 'Doe',
          prefixes: [{ name: 'Mr.' }, { name: 'Sir' }],
        },
        'name is correctly loaded'
      );
      assert.satisfies(
        person.names?.slice() as Array<Name>,
        [{ first: 'John', last: 'Doe', prefixes: [] as Array<Prefix> }],
        'names is correct'
      );
    });
  });
});
