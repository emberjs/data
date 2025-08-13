import { type TestContext } from '@ember/test-helpers';
import { module, test, todo } from 'qunit';

import { recordIdentifierFor } from '@ember-data/store';

import { type Name, NameSchema } from '../dummy/models/name';
import { type Passenger, PassengerSchema } from '../dummy/models/passenger';
import { type Person, PersonSchema } from '../dummy/models/person';
import { type Prefix, PrefixSchema } from '../dummy/models/prefix';
import { type Vehicle, VehicleSchema } from '../dummy/models/vehicle';
import { type Zoo, ZooSchema } from '../dummy/models/zoo';
import { Store } from '../dummy/services/app-store';
import { setupApplicationTest } from '../helpers';
import Pretender from 'pretender';

interface AppTestContext extends TestContext {
  store: Store;
}

module('Unit - `Fragment`', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function (this: AppTestContext) {
    this.owner.register('service:store', Store);
    this.store = this.owner.lookup('service:store') as Store;
    this.store.schema.registerResources([
      PersonSchema,
      NameSchema,
      PassengerSchema,
      PrefixSchema,
      VehicleSchema,
      ZooSchema,
    ]);
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

    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      passenger.toString(),
      'Record<vehicle:1 (@lid:vehicle-1)>'
    );
    assert.strictEqual(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      name.toString(),
      'Record<vehicle:1 (@lid:vehicle-1)>'
    );
  });

  test("changes to fragments are indicated in the owner record's `changedAttributes`", async function (this: AppTestContext, assert) {
    this.store.push({
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
    const person = await this.store.findRecord<Person>('person', '1');
    const name = person.name as Name;

    name.set('last', 'Baratheon');

    const [oldName, newName] = person.changedAttributes().name!;
    assert.deepEqual(
      oldName,
      { first: 'Loras', last: 'Tyrell' },
      'old fragment is indicated in the diff object'
    );
    assert.deepEqual(
      newName,
      { first: 'Loras', last: 'Baratheon' },
      'new fragment is indicated in the diff object'
    );
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

    assert.propEqual(prefixes, [], 'fragment array defaults to an empty array');

    prefixes.push({ name: 'Lord' } as Prefix);

    assert.propEqual(
      prefixes,
      [{ name: 'Lord' }],
      'new prefix is added to the fragment array'
    );
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

    // @ts-expect-error TODO: fix this type error
    const [oldName, newName] = person.changedAttributes().name;
    assert.deepEqual(
      oldName,
      { first: 'Rob', last: 'Stark' },
      'old fragment is indicated in the diff object'
    );
    assert.deepEqual(
      newName,
      null,
      'new fragment is indicated in the diff object'
    );
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
    assert.deepEqual(
      oldName,
      null,
      'old fragment is indicated in the diff object'
    );
    assert.deepEqual(
      newName,
      { first: 'Rob', last: 'Stark' },
      'new fragment is indicated in the diff object'
    );

    const identifier = recordIdentifierFor(person);
    this.store.cache.willCommit(identifier, null);

    const [oldNameAfterWillCommit, newNameAfterWillCommit] =
      person.changedAttributes().name;
    assert.deepEqual(
      oldNameAfterWillCommit,
      null,
      'old fragment is indicated in the diff object'
    );
    assert.deepEqual(
      newNameAfterWillCommit,
      { first: 'Rob', last: 'Stark' },
      'new fragment is indicated in the diff object'
    );

    this.store.cache.didCommit(identifier, {
      request: {},
      response: new Response(),
      content: {
        data: { type: identifier.type, id: identifier.id!, attributes: {} },
      },
    });

    assert.strictEqual(
      person.changedAttributes().name,
      undefined,
      'changedAttributes is reset after commit'
    );
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

      const [oldName, newName] = person.changedAttributes().name!;
      assert.deepEqual(
        oldName,
        null,
        'old fragment is indicated in the diff object'
      );
      assert.deepEqual(
        newName,
        { first: 'Rob', last: 'Stark' },
        'new fragment is indicated in the diff object'
      );

      // what is missing here?

      const [oldNameAfterWillCommit, newNameAfterWillCommit] =
        person.changedAttributes().name!;
      assert.deepEqual(
        oldNameAfterWillCommit,
        null,
        'old fragment is indicated in the diff object'
      );
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

      assert.strictEqual(
        person.changedAttributes().name,
        undefined,
        'changedAttributes is reset after commit'
      );
    }
  );

  test('changes to attributes can be rolled back', async function (this: AppTestContext, assert) {
    this.store.push({
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

    const person = await this.store.findRecord<Person>('person', '1');
    const name = person.name as Name;

    name.set('last', 'Bolton');
    // @ts-expect-error TODO: fix this type error
    name.rollbackAttributes();

    assert.strictEqual(name.last, 'Snow', 'fragment properties are restored');
    assert.ok(!name.hasDirtyAttributes, 'fragment is in clean state');
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

    assert.ok(
      zoo !== origZoo,
      'A different instance of the zoo model was loaded'
    );
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

    assert.strictEqual(person.name, null);
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

    assert.strictEqual(person.name!.first, 'Eddard');

    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: null,
        },
      },
    });

    assert.strictEqual(person.name, null);
  });

  module('fragment bug when initially set to `null`', function (hooks) {
    let server: Pretender;
    hooks.beforeEach(function () {
      server = new Pretender();
      server.post('/people', () => {
        return [
          200,
          { 'Content-Type': 'application/json' },
          JSON.stringify({
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
        ];
      });
    });

    hooks.afterEach(function () {
      server.shutdown();
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
      assert.propEqual(
        person.name,
        {
          first: 'John',
          last: 'Doe',
          prefixes: [{ name: 'Mr.' }, { name: 'Sir' }],
        },
        'name is correctly loaded'
      );
      assert.propEqual(
        person.names?.slice(),
        [{ first: 'John', last: 'Doe', prefixes: [] }],
        'names is correct'
      );
    });

    test('`person` fragments/fragment arrays are initially `null`', async function (this: AppTestContext, assert) {
      const person = this.store.createRecord<Person>('person', {
        title: 'Mr.',
        name: null,
        names: null,
      });

      assert.strictEqual(person.names, null, 'names is null');
      assert.notOk(person.nickName, 'nickName is not set');

      await person.save();

      assert.equal(person.nickName, 'Johnner', 'nickName is correctly loaded');
      assert.propEqual(
        person.name,
        {
          first: 'John',
          last: 'Doe',
          prefixes: [{ name: 'Mr.' }, { name: 'Sir' }],
        },
        'name is correctly loaded'
      );
      assert.propEqual(
        person.names?.slice(),
        [{ first: 'John', last: 'Doe', prefixes: [] }],
        'names is correct'
      );
    });
  });
});
