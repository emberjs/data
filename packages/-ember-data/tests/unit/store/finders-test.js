import { module, test } from 'qunit';
import { defer } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

class Person extends Model {
  @attr('string') updatedAt;
  @attr('string') name;
  @attr('string') firstName;
  @attr('string') lastName;
  @hasMany('dog', { async: true, inverse: null }) dogs;
  @belongsTo('dog', { async: true, inverse: null }) favoriteDog;
}

class Dog extends Model {
  @attr('string') name;
}

module('unit/store/finders', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
    this.owner.register('model:dog', Dog);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    this.store = this.owner.lookup('service:store');
    this.adapter = this.store.adapterFor('application');
  });

  test('findRecord does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'person') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    let storePromise = this.store.findRecord('person', 1);
    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({
      data: { id: '1', type: 'person', attributes: { name: 'John Churchill' } },
    });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });

  test('findMany does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findMany: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'person') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    this.store.findRecord('person', 1);
    let storePromise = this.store.findRecord('person', 2);

    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({
      data: [
        { id: '1', type: 'person', attributes: { name: 'John Churchill' } },
        { id: '2', type: 'person', attributes: { name: 'Louis Joseph' } },
      ],
    });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });

  test('findHasMany does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findHasMany: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'dog') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          dogs: {
            links: {
              related: 'http://exmaple.com/person/1/dogs',
            },
          },
        },
      },
    });

    let storePromise = this.store.peekRecord('person', 1).dogs;
    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({
      data: [
        { id: '1', type: 'dog', attributes: { name: 'Scooby' } },
        { id: '2', type: 'dog', attributes: { name: 'Scrappy' } },
      ],
    });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });

  test('findBelongsTo does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findBelongsTo: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'dog') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    this.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Churchill',
        },
        relationships: {
          favoriteDog: {
            links: {
              related: 'http://exmaple.com/person/1/favorite-dog',
            },
          },
        },
      },
    });

    let storePromise = this.store.peekRecord('person', 1).favoriteDog;

    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({ data: { id: '1', type: 'dog', attributes: { name: 'Scooby' } } });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });

  test('findAll does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findAll: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'person') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    let storePromise = this.store.findAll('person');
    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({
      data: [{ id: '1', type: 'person', attributes: { name: 'John Churchill' } }],
    });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });

  test('query does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        query: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'person') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    let storePromise = this.store.query('person', { first_duke_of_marlborough: true });
    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({
      data: [{ id: '1', type: 'person', attributes: { name: 'John Churchill' } }],
    });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });

  test('queryRecord does not load a serializer until the adapter promise resolves', async function (assert) {
    assert.expect(2);

    let deferedFind = defer();

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        queryRecord: () => deferedFind.promise,
      })
    );

    let serializerLoaded = false;
    let serializerFor = this.store.serializerFor;
    this.store.serializerFor = (modelName) => {
      if (modelName === 'person') {
        serializerLoaded = true;
      }
      return serializerFor.call(this.store, modelName);
    };

    let storePromise = this.store.queryRecord('person', { first_duke_of_marlborough: true });
    assert.false(serializerLoaded, 'serializer is not eagerly loaded');

    deferedFind.resolve({
      data: { id: '1', type: 'person', attributes: { name: 'John Churchill' } },
    });

    await storePromise;

    assert.true(serializerLoaded, 'serializer is loaded');
  });
});
