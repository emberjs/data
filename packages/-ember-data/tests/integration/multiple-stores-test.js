// we intentionally test against the ember-data version here
// because the ember-data/store uses DefaultRecordData while @ember-data/store does not
import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Store from '@ember-data/store';

module('integration/multiple_stores - Multiple Stores Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const SuperVillain = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      homePlanet: belongsTo('home-planet', { inverse: 'villains', async: false }),
    });

    const HomePlanet = Model.extend({
      name: attr('string'),
      villains: hasMany('super-villain', { inverse: 'homePlanet', async: false }),
    });

    this.owner.register('model:super-villain', SuperVillain);
    this.owner.register('model:home-planet', HomePlanet);

    this.owner.register('adapter:application', RESTAdapter);
    this.owner.register('serializer:application', RESTSerializer);

    this.owner.register('store:store-a', Store);
    this.owner.register('store:store-b', Store);
  });

  test('should be able to push into multiple stores', async function (assert) {
    this.owner.register(
      'adapter:home-planet',
      RESTAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
      })
    );

    const andromedaStore = this.owner.lookup('service:store');
    const cartwheelStore = this.owner.lookup('store:store-a');
    const cigarStore = this.owner.lookup('store:store-b');

    const earth = { id: '1', name: 'Earth' };
    const mars = { id: '1', name: 'Mars' };
    const saturn = { id: '1', name: 'Saturn' };

    andromedaStore.push(andromedaStore.normalize('home-planet', earth));
    cartwheelStore.push(cartwheelStore.normalize('home-planet', mars));
    cigarStore.push(cigarStore.normalize('home-planet', saturn));

    let homePlanet = await andromedaStore.findRecord('home-planet', '1');

    assert.strictEqual(homePlanet.name, 'Earth');

    homePlanet = await cartwheelStore.findRecord('home-planet', '1');

    assert.strictEqual(homePlanet.name, 'Mars');

    homePlanet = await cigarStore.findRecord('home-planet', '1');

    assert.strictEqual(homePlanet.name, 'Saturn');
  });

  test('embedded records should be created in multiple stores', function (assert) {
    this.owner.register(
      'serializer:home-planet',
      RESTSerializer.extend(EmbeddedRecordsMixin, {
        attrs: {
          villains: { embedded: 'always' },
        },
      })
    );

    const andromedaStore = this.owner.lookup('service:store');
    const cartwheelStore = this.owner.lookup('store:store-a');
    const cigarStore = this.owner.lookup('store:store-b');

    const andromedaSerializer = andromedaStore.serializerFor('home-planet');
    const cartwheelSerializer = cartwheelStore.serializerFor('home-planet');
    const cigarSerializer = cigarStore.serializerFor('home-planet');

    const andromedaJsonPayload = {
      homePlanet: {
        id: '1',
        name: 'Earth',
        villains: [
          {
            id: '1',
            firstName: 'Tom',
            lastName: 'Dale',
          },
        ],
      },
    };
    const cartWheelJsonPayload = {
      homePlanet: {
        id: '1',
        name: 'Mars',
        villains: [
          {
            id: '1',
            firstName: 'James',
            lastName: 'Murphy',
          },
        ],
      },
    };
    const cigarJsonPayload = {
      homePlanet: {
        id: '1',
        name: 'Saturn',
        villains: [
          {
            id: '1',
            firstName: 'Damita',
            lastName: 'Giraldo',
          },
        ],
      },
    };

    const normalizedAndromedaPayload = andromedaSerializer.normalizeResponse(
      andromedaStore,
      andromedaStore.modelFor('home-planet'),
      andromedaJsonPayload,
      '1',
      'findRecord'
    );

    andromedaStore.push(normalizedAndromedaPayload);
    assert.notStrictEqual(
      andromedaStore.peekRecord('super-villain', '1'),
      null,
      'superVillain should exist in service:store'
    );

    const normalizedCartWheelPayload = cartwheelSerializer.normalizeResponse(
      cartwheelStore,
      cartwheelStore.modelFor('home-planet'),
      cartWheelJsonPayload,
      '1',
      'findRecord'
    );

    cartwheelStore.push(normalizedCartWheelPayload);
    assert.notStrictEqual(
      cartwheelStore.peekRecord('super-villain', '1'),
      null,
      'superVillain should exist in store:store-a'
    );

    const normalizedCigarPayload = cigarSerializer.normalizeResponse(
      cigarStore,
      cigarStore.modelFor('home-planet'),
      cigarJsonPayload,
      '1',
      'findRecord'
    );
    cigarStore.push(normalizedCigarPayload);

    assert.notStrictEqual(
      cigarStore.peekRecord('super-villain', '1'),
      null,
      'superVillain should exist in store:store-b'
    );
  });

  test('each store should have a unique instance of the serializers', function (assert) {
    this.owner.register('serializer:home-planet', RESTSerializer.extend({}));

    const andromedaStore = this.owner.lookup('store:store-a');
    const cigarStore = this.owner.lookup('store:store-b');

    const andromedaSerializer = andromedaStore.serializerFor('home-planet');
    const cigarSerializer = cigarStore.serializerFor('home-planet');

    assert.notStrictEqual(
      andromedaSerializer,
      cigarSerializer,
      'andromedaStore and cigarStore should be unique instances'
    );
  });

  test('each store should have a unique instance of the adapters', function (assert) {
    this.owner.register('adapter:home-planet', Adapter.extend({}));

    const andromedaStore = this.owner.lookup('store:store-a');
    const cigarStore = this.owner.lookup('store:store-b');

    const andromedaAdapter = andromedaStore.adapterFor('home-planet');
    const cigarAdapter = cigarStore.adapterFor('home-planet');

    assert.notStrictEqual(andromedaAdapter, cigarAdapter, 'the adapters are unique');
  });
});
