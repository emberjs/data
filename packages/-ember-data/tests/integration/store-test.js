import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';
import Ember from 'ember';

import { module, test } from 'qunit';
import { Promise, resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import RESTAdapter from '@ember-data/adapter/rest';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

const Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car', { async: false }),
});

Person.reopenClass({
  toString() {
    return 'Person';
  },
});

const Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person', { async: false }),
});

Car.reopenClass({
  toString() {
    return 'Car';
  },
});

function ajaxResponse(value) {
  return function (url, verb, hash) {
    return resolve(deepCopy(value));
  };
}

function tap(obj, methodName, callback) {
  let old = obj[methodName];

  let summary = { called: [] };

  obj[methodName] = function () {
    let result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

module('integration/store - destroy', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:car', Car);
    this.owner.register('model:person', Person);

    this.owner.register('adapter:application', DS.Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test("destroying record during find doesn't cause unexpected error (find resolves)", async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    let TestAdapter = DS.Adapter.extend({
      findRecord(store, type, id, snapshot) {
        return new Promise((resolve, reject) => {
          store.unloadAll(type.modelName);
          resolve({
            data: {
              type: 'car',
              id: '1',
              attributes: {},
            },
          });
        });
      },
    });

    this.owner.register('adapter:application', TestAdapter);

    let type = 'car';
    let id = '1';

    try {
      await store.findRecord(type, id);
      assert.ok(true, 'we have no error');
    } catch (e) {
      assert.ok(false, `we should have no error, received: ${e.message}`);
    }
  });

  test("destroying record during find doesn't cause unexpected error (find rejects)", async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    let TestAdapter = DS.Adapter.extend({
      findRecord(store, type, id, snapshot) {
        return new Promise((resolve, reject) => {
          store.unloadAll(type.modelName);
          reject(new Error('Record Was Not Found'));
        });
      },
    });

    this.owner.register('adapter:application', TestAdapter);

    let type = 'car';
    let id = '1';

    try {
      await store.findRecord(type, id);
      assert.ok(false, 'we have no error, but we should');
    } catch (e) {
      assert.strictEqual(e.message, 'Record Was Not Found', `we should have a NotFound error`);
    }
  });

  testInDebug('find calls do not resolve when the store is destroyed', async function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let next;
    let nextPromise = new Promise((resolve) => (next = resolve));
    let TestAdapter = DS.Adapter.extend({
      findRecord() {
        next();
        nextPromise = new Promise((resolve) => {
          next = resolve;
        }).then(() => {
          return {
            data: { type: 'car', id: '1' },
          };
        });
        return nextPromise;
      },
    });

    this.owner.register('adapter:application', TestAdapter);

    // needed for LTS 2.16
    Ember.Test.adapter.exception = (e) => {
      throw e;
    };

    store.shouldTrackAsyncRequests = true;
    store.push = function () {
      assert('The test should have destroyed the store by now', store.isDestroyed);

      throw new Error("We shouldn't be pushing data into the store when it is destroyed");
    };
    let requestPromise = store.findRecord('car', '1');

    await nextPromise;

    assert.throws(() => {
      run(() => store.destroy());
    }, /Async Request leaks detected/);

    next();

    await nextPromise;

    // ensure we allow the internal store promises
    // to flush, potentially pushing data into the store
    await settled();
    assert.ok(true, 'we made it to the end');
    await requestPromise;
    assert.ok(false, 'we should never make it here');
  });

  test('destroying the store correctly cleans everything up', async function (assert) {
    let car, person;
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;

    store.push({
      data: [
        {
          type: 'car',
          id: '1',
          attributes: {
            make: 'BMC',
            model: 'Mini',
          },
          relationships: {
            person: {
              data: { type: 'person', id: '1' },
            },
          },
        },
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            cars: {
              data: [{ type: 'car', id: '1' }],
            },
          },
        },
      ],
    });

    car = store.peekRecord('car', '1');
    person = store.peekRecord('person', '1');

    let personWillDestroy = tap(person, 'willDestroy');
    let carWillDestroy = tap(car, 'willDestroy');
    let carsWillDestroy = tap(car.get('person.cars'), 'willDestroy');

    adapter.query = function () {
      return {
        data: [
          {
            id: '2',
            type: 'person',
            attributes: { name: 'Yehuda' },
          },
        ],
      };
    };

    let adapterPopulatedPeople = await store.query('person', {
      someCrazy: 'query',
    });

    let adapterPopulatedPeopleWillDestroy = tap(adapterPopulatedPeople, 'willDestroy');

    await store.findRecord('person', '2');

    assert.equal(personWillDestroy.called.length, 0, 'expected person.willDestroy to not have been called');
    assert.equal(carWillDestroy.called.length, 0, 'expected car.willDestroy to not have been called');
    assert.equal(carsWillDestroy.called.length, 0, 'expected cars.willDestroy to not have been called');
    assert.equal(
      adapterPopulatedPeopleWillDestroy.called.length,
      0,
      'expected adapterPopulatedPeople.willDestroy to not have been called'
    );
    assert.equal(car.get('person'), person, "expected car's person to be the correct person");
    assert.equal(person.get('cars.firstObject'), car, " expected persons cars's firstRecord to be the correct car");

    store.destroy();

    await settled();

    assert.equal(personWillDestroy.called.length, 1, 'expected person to have received willDestroy once');
    assert.equal(carWillDestroy.called.length, 1, 'expected car to have received willDestroy once');
    assert.equal(carsWillDestroy.called.length, 1, 'expected person.cars to have received willDestroy once');
    assert.equal(
      adapterPopulatedPeopleWillDestroy.called.length,
      1,
      'expected adapterPopulatedPeople to receive willDestroy once'
    );
  });
});

module('integration/store - findRecord', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());
    store = this.owner.lookup('service:store');
    store.shouldTrackAsyncRequests = true;
  });

  test('store#findRecord fetches record from server when cached record is not present', async function (assert) {
    assert.expect(2);

    let adapter = store.adapterFor('application');

    adapter.ajax = ajaxResponse({
      cars: [
        {
          id: '20',
          make: 'BMC',
          model: 'Mini',
        },
      ],
    });

    let cachedRecordIsPresent = store.hasRecordForId('car', '20');

    assert.notOk(cachedRecordIsPresent, 'Car with id=20 should not exist');

    let car = await store.findRecord('car', '20');

    assert.strictEqual(car.get('make'), 'BMC', 'Car with id=20 is now loaded');
  });

  test('store#findRecord returns cached record immediately and reloads record in the background', async function (assert) {
    assert.expect(4);

    let adapter = store.adapterFor('application');

    adapter.shouldReloadRecord = () => false;
    adapter.shouldBackgroundReloadRecord = () => true;

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    adapter.ajax = async () => {
      await resolve();

      return {
        cars: [
          {
            id: '1',
            make: 'BMC',
            model: 'Princess',
          },
        ],
      };
    };

    const promiseCar = store.findRecord('car', '1');
    const car = await promiseCar;

    assert.strictEqual(promiseCar.get('model'), 'Mini', 'promiseCar is from cache');
    assert.strictEqual(car.get('model'), 'Mini', 'car record is returned from cache');

    await settled();

    assert.strictEqual(promiseCar.get('model'), 'Princess', 'promiseCar is updated');
    assert.strictEqual(car.get('model'), 'Princess', 'Updated car record is returned');
  });

  test('store#findRecord { reload: true } ignores cached record and reloads record from server', async function (assert) {
    assert.expect(2);

    const testAdapter = DS.RESTAdapter.extend({
      shouldReloadRecord(store, type, id, snapshot) {
        assert.ok(false, 'shouldReloadRecord should not be called when { reload: true }');
      },
    });

    this.owner.register('adapter:application', testAdapter);

    let adapter = store.adapterFor('application');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    adapter.ajax = ajaxResponse({
      cars: [
        {
          id: '1',
          make: 'BMC',
          model: 'Princess',
        },
      ],
    });

    let cachedCar = store.peekRecord('car', '1');

    assert.strictEqual(cachedCar.get('model'), 'Mini', 'cached car has expected model');

    let car = await store.findRecord('car', '1', { reload: true });

    assert.strictEqual(car.model, 'Princess', 'cached record ignored, record reloaded via server');
  });

  test('store#findRecord { reload: true } ignores cached record and reloads record from server even after previous findRecord', async function (assert) {
    assert.expect(5);

    let calls = 0;

    const testAdapter = DS.JSONAPIAdapter.extend({
      shouldReloadRecord(store, type, id, snapshot) {
        assert.ok(false, 'shouldReloadRecord should not be called when { reload: true }');
      },
      async findRecord() {
        calls++;

        await resolve();

        return {
          data: {
            type: 'car',
            id: '1',
            attributes: {
              make: 'BMC',
              model: calls === 1 ? 'Mini' : 'Princess',
            },
          },
        };
      },
    });

    this.owner.register('adapter:application', testAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let car = await store.findRecord('car', '1');

    assert.strictEqual(calls, 1, 'We made one call to findRecord');
    assert.strictEqual(car.model, 'Mini', 'cached car has expected model');

    let promiseCar = store.findRecord('car', '1', { reload: true });

    assert.strictEqual(promiseCar.get('model'), undefined, `We don't have early access to local data`);

    car = await promiseCar;

    assert.strictEqual(calls, 2, 'We made a second call to findRecord');
    assert.strictEqual(car.get('model'), 'Princess', 'cached record ignored, record reloaded via server');
  });

  test('store#findRecord caches the inflight requests', async function (assert) {
    assert.expect(2);

    let calls = 0;
    let resolveHandler;
    let result = {
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    };

    const testAdapter = DS.JSONAPIAdapter.extend({
      shouldReloadRecord(store, type, id, snapshot) {
        assert.ok(false, 'shouldReloadRecord should not be called when { reload: true }');
      },
      async findRecord() {
        calls++;

        return new Promise((resolve) => {
          resolveHandler = resolve;
        });
      },
    });

    this.owner.register('adapter:application', testAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    let firstPromise, secondPromise;

    run(() => {
      firstPromise = store.findRecord('car', '1');
    });

    run(() => {
      secondPromise = store.findRecord('car', '1');
    });

    assert.strictEqual(calls, 1, 'We made one call to findRecord');

    resolveHandler(result);
    let car1 = await firstPromise;
    let car2 = await secondPromise;

    assert.strictEqual(car1, car2, 'we receive the same car back');
  });

  test('store#findRecord { backgroundReload: false } returns cached record and does not reload in the background', async function (assert) {
    assert.expect(2);

    const testAdapter = DS.RESTAdapter.extend({
      shouldBackgroundReloadRecord() {
        assert.ok(false, 'shouldBackgroundReloadRecord should not be called when { backgroundReload: false }');
      },

      findRecord() {
        assert.ok(false, 'findRecord() should not be called when { backgroundReload: false }');
      },
    });

    this.owner.register('adapter:application', testAdapter);

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    let car = await store.findRecord('car', '1', { backgroundReload: false });

    assert.strictEqual(car.model, 'Mini', 'cached car record is returned');

    car = store.peekRecord('car', '1');

    assert.strictEqual(car.model, 'Mini', 'car record was not reloaded');
  });

  test('store#findRecord { backgroundReload: true } returns cached record and reloads record in background', async function (assert) {
    assert.expect(2);

    const testAdapter = DS.RESTAdapter.extend({
      shouldBackgroundReloadRecord() {
        assert.ok(false, 'shouldBackgroundReloadRecord should not be called when { backgroundReload: true }');
      },
    });

    this.owner.register('adapter:application', testAdapter);

    let adapter = store.adapterFor('application');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    adapter.ajax = async function () {
      await resolve();

      return deepCopy({
        cars: [
          {
            id: '1',
            make: 'BMC',
            model: 'Princess',
          },
        ],
      });
    };

    let carPromise = await store.findRecord('car', '1', { backgroundReload: true });

    assert.strictEqual(carPromise.model, 'Mini', 'cached car record is returned');

    // Wait for internal promise to be resolved and update the record with the upcoming information.
    await settled();

    let car = store.peekRecord('car', '1');

    assert.strictEqual(car.model, 'Princess', 'car record was reloaded');
  });

  test('store#findRecord { backgroundReload: false } is ignored if adapter.shouldReloadRecord is true', async function (assert) {
    assert.expect(2);

    const testAdapter = DS.RESTAdapter.extend({
      shouldReloadRecord() {
        return true;
      },

      shouldBackgroundReloadRecord() {
        assert.ok(false, 'shouldBackgroundReloadRecord should not be called when adapter.shouldReloadRecord = true');
      },
    });

    this.owner.register('adapter:application', testAdapter);

    let adapter = store.adapterFor('application');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    adapter.ajax = async function () {
      await resolve();

      return deepCopy({
        cars: [
          {
            id: '1',
            make: 'BMC',
            model: 'Princess',
          },
        ],
      });
    };

    let car = store.peekRecord('car', '1');

    assert.strictEqual(car.get('model'), 'Mini', 'Car record is initially a Mini');

    car = await store.findRecord('car', '1', { backgroundReload: false });

    assert.strictEqual(car.get('model'), 'Princess', 'Car record is reloaded immediately (not in the background)');
  });

  test('store#findRecord call with `id` of type different than non-empty string or number should trigger an assertion', function (assert) {
    const badValues = ['', undefined, null, NaN, false];

    assert.expect(badValues.length);

    badValues.map((item) => {
      assert.expectAssertion(() => {
        store.findRecord('car', item);
      }, `Expected id to be a string or number, received ${String(item)}`);
    });
  });
});

module('integration/store - findAll', function (hooks) {
  setupTest(hooks);

  test('Using store#findAll with no records triggers a query', async function (assert) {
    assert.expect(2);

    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.ajax = () => {
      return resolve({
        cars: [
          {
            id: '1',
            make: 'BMC',
            model: 'Princess',
          },
          {
            id: '2',
            make: 'BMCW',
            model: 'Isetta',
          },
        ],
      });
    };

    let cars = store.peekAll('car');

    assert.strictEqual(cars.length, 0, 'There is no cars in the store');

    cars = await store.findAll('car');

    assert.strictEqual(cars.length, 2, 'Two car were fetched');
  });

  test('Using store#findAll with existing records performs a query in the background, updating existing records and returning new ones', async function (assert) {
    assert.expect(4);

    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    let resolvefindAll;
    let resolvefindAllPromise = new Promise((resolve) => (resolvefindAll = resolve));

    adapter.ajax = () => {
      resolvefindAll();
      resolvefindAllPromise = new Promise(function (resolve) {
        resolvefindAll = resolve;
      }).then(function () {
        return {
          cars: [
            {
              id: '1',
              make: 'BMC',
              model: 'New Mini',
            },
            {
              id: '2',
              make: 'BMCW',
              model: 'Isetta',
            },
          ],
        };
      });

      return resolvefindAllPromise;
    };

    let cars = store.peekAll('car');

    assert.equal(cars.length, 1, 'There is one car in the store');

    cars = await store.findAll('car');

    assert.equal(cars.length, 1, 'Store resolves with the existing records');

    resolvefindAll();

    await settled();

    cars = store.peekAll('car');

    assert.equal(cars.length, 2, 'There is 2 cars in the store now');

    let mini = cars.findBy('id', '1');

    assert.equal(mini.model, 'New Mini', 'Existing records have been updated');
  });

  test('store#findAll { backgroundReload: false } skips shouldBackgroundReloadAll, returns cached records & does not reload in the background', async function (assert) {
    assert.expect(4);

    let testAdapter = DS.RESTAdapter.extend({
      shouldBackgroundReloadAll() {
        assert.ok(false, 'shouldBackgroundReloadAll should not be called when { backgroundReload: false }');
      },

      findAll() {
        assert.ok(false, 'findAll() should not be called when { backgroundReload: true }');
      },
    });

    this.owner.register('model:car', Car);
    this.owner.register('serializer:application', RESTSerializer.extend());
    this.owner.register('adapter:application', testAdapter);

    let store = this.owner.lookup('service:store');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    let cars = await store.findAll('car', { backgroundReload: false });

    assert.equal(cars.length, 1, 'single cached car record is returned');
    assert.equal(cars.firstObject.model, 'Mini', 'correct cached car record is returned');

    await settled();

    cars = store.peekAll('car');

    assert.equal(cars.length, 1, 'single cached car record is returned again');
    assert.equal(cars.firstObject.model, 'Mini', 'correct cached car record is returned again');
  });

  test('store#findAll { backgroundReload: true } skips shouldBackgroundReloadAll, returns cached records, & reloads in background', async function (assert) {
    assert.expect(5);

    let testAdapter = DS.RESTAdapter.extend({
      shouldBackgroundReloadAll() {
        assert.ok(false, 'shouldBackgroundReloadAll should not be called when { backgroundReload: true }');
      },
    });

    this.owner.register('adapter:application', testAdapter);
    this.owner.register('model:car', Car);
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    adapter.ajax = async () => {
      await resolve();

      return {
        cars: [
          {
            id: '1',
            make: 'BMC',
            model: 'New Mini',
          },
          {
            id: '2',
            make: 'BMCW',
            model: 'Isetta',
          },
        ],
      };
    };

    let cars = await store.findAll('car', { backgroundReload: true });

    assert.equal(cars.length, 1, 'single cached car record is returned');
    assert.equal(cars.firstObject.model, 'Mini', 'correct cached car record is returned');

    await settled();

    // IE11 hack
    cars = store.peekAll('car');
    assert.equal(cars.length, 2, 'multiple cars now in the store');
    assert.equal(cars.firstObject.model, 'New Mini', 'existing record updated correctly');
    assert.equal(cars.lastObject.model, 'Isetta', 'new record added to the store');
  });

  test('store#findAll { backgroundReload: false } is ignored if adapter.shouldReloadAll is true', async function (assert) {
    assert.expect(5);

    let testAdapter = DS.RESTAdapter.extend({
      shouldReloadAll() {
        return true;
      },

      shouldBackgroundReloadAll() {
        assert.ok(false, 'shouldBackgroundReloadAll should not be called when adapter.shouldReloadAll = true');
      },
    });

    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', testAdapter);
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini',
        },
      },
    });

    adapter.ajax = () => {
      return resolve({
        cars: [
          {
            id: '1',
            make: 'BMC',
            model: 'New Mini',
          },
          {
            id: '2',
            make: 'BMCW',
            model: 'Isetta',
          },
        ],
      });
    };

    let cars = store.peekAll('car');

    assert.equal(cars.length, 1, 'one car in the store');
    assert.equal(cars.firstObject.model, 'Mini', 'correct car is in the store');

    cars = await store.findAll('car', { backgroundReload: false });

    assert.equal(cars.length, 2, 'multiple car records are returned');
    assert.equal(cars.firstObject.model, 'New Mini', 'initial car record was updated');
    assert.equal(cars.lastObject.model, 'Isetta', 'second car record was loaded');
  });

  test('store#findAll should eventually return all known records even if they are not in the adapter response', async function (assert) {
    assert.expect(5);

    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    store.push({
      data: [
        {
          type: 'car',
          id: '1',
          attributes: {
            make: 'BMC',
            model: 'Mini',
          },
        },
        {
          type: 'car',
          id: '2',
          attributes: {
            make: 'BMCW',
            model: 'Isetta',
          },
        },
      ],
    });

    let resolvefindAll;
    let resolvefindAllPromise = new Promise((resolve) => (resolvefindAll = resolve));

    adapter.ajax = () => {
      resolvefindAll();
      resolvefindAllPromise = new Promise(function (resolve) {
        resolvefindAll = resolve;
      }).then(function () {
        return {
          cars: [
            {
              id: '1',
              make: 'BMC',
              model: 'New Mini',
            },
          ],
        };
      });

      return resolvefindAllPromise;
    };

    let cars = await store.findAll('car');

    assert.equal(cars.length, 2, 'It returns all cars');

    let mini = cars.findBy('id', '1');
    assert.equal(mini.model, 'Mini', 'Records have not yet been updated');

    resolvefindAll();

    await settled();

    assert.equal(cars.length, 2, 'There are still 2 cars in the store after ajax promise resolves');
    const peeked = store.peekAll('car');
    assert.strictEqual(peeked, cars, 'findAll and peekAll result are the same');

    mini = cars.findBy('id', '1');
    assert.equal(mini.model, 'New Mini', 'Existing records have been updated');
  });

  test('Using store#fetch on an empty record calls find', async function (assert) {
    assert.expect(2);

    this.owner.register('model:car', Car);
    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.ajax = () => {
      return resolve({
        cars: [
          {
            id: '20',
            make: 'BMCW',
            model: 'Mini',
          },
        ],
      });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          cars: {
            data: [{ type: 'car', id: '20' }],
          },
        },
      },
    });

    let car = store.recordForId('car', '20');

    assert.true(car.isEmpty, 'Car with id=20 should be empty');

    car = await store.findRecord('car', '20', { reload: true });

    assert.equal(car.make, 'BMCW', 'Car with id=20 is now loaded');
  });

  test('Using store#adapterFor should not throw an error when looking up the application adapter', function (assert) {
    assert.expect(1);

    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');

    try {
      let applicationAdapter = store.adapterFor('application');

      assert.ok(applicationAdapter);
    } catch (_error) {
      assert.ok(false, 'An error was thrown while looking for application adapter');
    }
  });

  test('Using store#serializerFor should not throw an error when looking up the application serializer', function (assert) {
    assert.expect(1);

    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');

    try {
      let applicationSerializer = store.serializerFor('application');

      assert.ok(applicationSerializer);
    } catch (_error) {
      assert.ok(false, 'An error was thrown while looking for application serializer');
    }
  });
});

module('integration/store - deleteRecord', function (hooks) {
  setupTest(hooks);

  test('Using store#deleteRecord should mark the model for removal', function (assert) {
    assert.expect(2);

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');
    let person;

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });

    person = store.peekRecord('person', '1');

    assert.ok(store.hasRecordForId('person', '1'), 'expected the record to be in the store');

    store.deleteRecord(person);
    assert.ok(person.isDeleted, 'expect person to be isDeleted');
  });

  test('Store should accept a null value for `data`', function (assert) {
    assert.expect(0);

    this.owner.register('adapter:application', RESTAdapter.extend());
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');

    try {
      store.push({ data: null });
    } catch (_error) {
      assert.ok(false, 'push null value for `data` to store throws an error');
    }
  });

  testInDebug('store#findRecord that returns an array should assert', async function (assert) {
    const ApplicationAdapter = DS.JSONAPIAdapter.extend({
      findRecord() {
        return { data: [] };
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register('model:car', Car);

    let store = this.owner.lookup('service:store');

    await assert.expectAssertion(async () => {
      await store.findRecord('car', '1');
    }, /expected the primary data returned from a 'findRecord' response to be an object but instead it found an array/);
  });

  testInDebug(
    'store#didSaveRecord should assert when the response to a save does not include the id',
    async function (assert) {
      this.owner.register('model:car', Car);
      this.owner.register('adapter:application', RESTAdapter.extend());
      this.owner.register('serializer:application', RESTSerializer.extend());

      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');

      adapter.createRecord = function () {
        return {};
      };

      let car = store.createRecord('car');

      await assert.expectAssertion(async () => {
        await car.save();
      }, /Your car record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response./);

      // This is here to transition the model out of the inFlight state to avoid
      // throwing another error when the test context is torn down, which tries
      // to unload the record, which is not allowed when record is inFlight.
      car._internalModel.transitionTo('loaded.saved');
    }
  );
});

module('integration/store - queryRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:car', Car);
    this.owner.register('adapter:application', DS.Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  testInDebug(
    'store#queryRecord should assert when normalized payload of adapter has an array of data',
    async function (assert) {
      let store = this.owner.lookup('service:store');
      let adapter = store.adapterFor('application');
      let serializer = store.serializerFor('application');

      adapter.queryRecord = function () {
        return {
          cars: [{ id: 1 }],
        };
      };

      serializer.normalizeQueryRecordResponse = function () {
        return {
          data: [{ id: 1, type: 'car' }],
        };
      };

      await assert.expectAssertion(async () => {
        await store.queryRecord('car', {});
      }, /Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array./);
    }
  );

  test('The store should trap exceptions that are thrown from adapter#findRecord', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function () {
      throw new Error('Refusing to find record');
    };

    try {
      await store.findRecord('car', '1');
    } catch (error) {
      assert.equal(error.message, 'Refusing to find record');
    }
  });

  test('The store should trap exceptions that are thrown from adapter#findAll', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findAll = function () {
      throw new Error('Refusing to find all records');
    };

    try {
      await store.findAll('car');
    } catch (error) {
      assert.equal(error.message, 'Refusing to find all records');
    }
  });

  test('The store should trap exceptions that are thrown from adapter#query', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function () {
      throw new Error('Refusing to query records');
    };

    try {
      await store.query('car', {});
    } catch (error) {
      assert.equal(error.message, 'Refusing to query records');
    }
  });

  test('The store should trap exceptions that are thrown from adapter#queryRecord', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.queryRecord = function () {
      throw new Error('Refusing to query record');
    };

    try {
      await store.queryRecord('car', {});
    } catch (error) {
      assert.equal(error.message, 'Refusing to query record');
    }
  });

  test('The store should trap exceptions that are thrown from adapter#createRecord', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function () {
      throw new Error('Refusing to serialize');
    };

    try {
      let car = store.createRecord('car');

      await car.save();
    } catch (error) {
      assert.equal(error.message, 'Refusing to serialize');
    }
  });
});
