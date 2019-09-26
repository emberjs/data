import { run } from '@ember/runloop';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import { get } from '@ember/object';
// we intentionally test against the ember-data version here
import Store from 'ember-data/store';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import RESTAdapter from '@ember-data/adapter/rest';
import Adapter from '@ember-data/adapter';

module('integration/multiple_stores - Multiple Stores Tests', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const SuperVillain = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      homePlanet: belongsTo('home-planet', { inverse: 'villains', async: false }),
      evilMinions: hasMany('evil-minion', { async: false }),
    });

    const HomePlanet = Model.extend({
      name: attr('string'),
      villains: hasMany('super-villain', { inverse: 'homePlanet', async: false }),
    });

    const EvilMinion = Model.extend({
      superVillain: belongsTo('super-villain', { async: false }),
      name: attr('string'),
    });

    this.owner.register('model:super-villain', SuperVillain);
    this.owner.register('model:home-planet', HomePlanet);
    this.owner.register('model:evil-minion', EvilMinion);

    this.owner.register('adapter:application', RESTAdapter);
    this.owner.register('serializer:application', RESTSerializer);

    this.owner.register('store:store-a', Store);
    this.owner.register('store:store-b', Store);
  });

  test('should be able to push into multiple stores', function(assert) {
    this.owner.register(
      'adapter:home-planet',
      RESTAdapter.extend({
        shouldBackgroundReloadRecord: () => false,
      })
    );

    let store = this.owner.lookup('service:store');
    let store_a = this.owner.lookup('store:store-a');
    let store_b = this.owner.lookup('store:store-b');

    let home_planet_main = { id: '1', name: 'Earth' };
    let home_planet_a = { id: '1', name: 'Mars' };
    let home_planet_b = { id: '1', name: 'Saturn' };

    run(() => {
      store.push(store.normalize('home-planet', home_planet_main));
      store_a.push(store_a.normalize('home-planet', home_planet_a));
      store_b.push(store_b.normalize('home-planet', home_planet_b));
    });

    return store
      .findRecord('home-planet', 1)
      .then(homePlanet => {
        assert.equal(homePlanet.get('name'), 'Earth');

        return store_a.findRecord('homePlanet', 1);
      })
      .then(homePlanet => {
        assert.equal(homePlanet.get('name'), 'Mars');
        return store_b.findRecord('homePlanet', 1);
      })
      .then(homePlanet => {
        assert.equal(homePlanet.get('name'), 'Saturn');
      });
  });

  test('embedded records should be created in multiple stores', function(assert) {
    this.owner.register(
      'serializer:home-planet',
      RESTSerializer.extend(EmbeddedRecordsMixin, {
        attrs: {
          villains: { embedded: 'always' },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let store_a = this.owner.lookup('store:store-a');
    let store_b = this.owner.lookup('store:store-b');

    let serializer_main = store.serializerFor('home-planet');
    let serializer_a = store_a.serializerFor('home-planet');
    let serializer_b = store_b.serializerFor('home-planet');

    let json_hash_main = {
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
    let json_hash_a = {
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
    let json_hash_b = {
      homePlanet: {
        id: '1',
        name: 'Saturn',
        villains: [
          {
            id: '1',
            firstName: 'Jade',
            lastName: 'John',
          },
        ],
      },
    };
    let json_main, json_a, json_b;

    run(() => {
      json_main = serializer_main.normalizeResponse(
        store,
        store.modelFor('home-planet'),
        json_hash_main,
        1,
        'findRecord'
      );
      store.push(json_main);
      assert.equal(store.hasRecordForId('super-villain', '1'), true, 'superVillain should exist in service:store');
    });

    run(() => {
      json_a = serializer_a.normalizeResponse(store_a, store_a.modelFor('home-planet'), json_hash_a, 1, 'findRecord');
      store_a.push(json_a);
      assert.equal(store_a.hasRecordForId('super-villain', '1'), true, 'superVillain should exist in store:store-a');
    });

    run(() => {
      json_b = serializer_b.normalizeResponse(store_b, store_a.modelFor('home-planet'), json_hash_b, 1, 'findRecord');
      store_b.push(json_b);
      assert.equal(store_b.hasRecordForId('super-villain', '1'), true, 'superVillain should exist in store:store-b');
    });
  });

  test('each store should have a unique instance of the serializers', function(assert) {
    this.owner.register('serializer:home-planet', RESTSerializer.extend({}));

    let store_a = this.owner.lookup('store:store-a');
    let store_b = this.owner.lookup('store:store-b');

    let serializer_a = store_a.serializerFor('home-planet');
    let serializer_b = store_b.serializerFor('home-planet');

    assert.equal(get(serializer_a, 'store'), store_a, "serializer_a's store prop should be sotre_a");
    assert.equal(get(serializer_b, 'store'), store_b, "serializer_b's store prop should be sotre_b");
    assert.notEqual(serializer_a, serializer_b, 'serialier_a and serialier_b should be unique instances');
  });

  test('each store should have a unique instance of the adapters', function(assert) {
    this.owner.register('adapter:home-planet', Adapter.extend({}));

    let store_a = this.owner.lookup('store:store-a');
    let store_b = this.owner.lookup('store:store-b');

    let adapter_a = store_a.adapterFor('home-planet');
    let adapter_b = store_b.adapterFor('home-planet');

    assert.equal(get(adapter_a, 'store'), store_a);
    assert.equal(get(adapter_b, 'store'), store_b);
    assert.notEqual(adapter_a, adapter_b);
  });
});
