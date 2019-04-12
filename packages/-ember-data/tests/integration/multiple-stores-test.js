import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import { get } from '@ember/object';
import Store from '@ember-data/store';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import RESTSerializer, { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import RESTAdapter from '@ember-data/adapter/rest';
import Adapter from '@ember-data/adapter';

let env;

module('integration/multiple_stores - Multiple Stores Tests', {
  beforeEach() {
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

    env = setupStore({});

    let { owner } = env;

    owner.register('model:super-villain', SuperVillain);
    owner.register('model:home-planet', HomePlanet);
    owner.register('model:evil-minion', EvilMinion);

    owner.register('adapter:application', RESTAdapter);
    owner.register('serializer:application', RESTSerializer);

    owner.register('store:store-a', Store);
    owner.register('store:store-b', Store);

    env.store_a = owner.lookup('store:store-a');
    env.store_b = owner.lookup('store:store-b');
  },

  afterEach() {
    run(env.container, 'destroy');
  },
});

test('should be able to push into multiple stores', function(assert) {
  env.owner.register(
    'adapter:home-planet',
    RESTAdapter.extend({
      shouldBackgroundReloadRecord: () => false,
    })
  );

  let home_planet_main = { id: '1', name: 'Earth' };
  let home_planet_a = { id: '1', name: 'Mars' };
  let home_planet_b = { id: '1', name: 'Saturn' };

  run(() => {
    env.store.push(env.store.normalize('home-planet', home_planet_main));
    env.store_a.push(env.store_a.normalize('home-planet', home_planet_a));
    env.store_b.push(env.store_b.normalize('home-planet', home_planet_b));
  });

  return env.store
    .findRecord('home-planet', 1)
    .then(homePlanet => {
      assert.equal(homePlanet.get('name'), 'Earth');

      return env.store_a.findRecord('homePlanet', 1);
    })
    .then(homePlanet => {
      assert.equal(homePlanet.get('name'), 'Mars');
      return env.store_b.findRecord('homePlanet', 1);
    })
    .then(homePlanet => {
      assert.equal(homePlanet.get('name'), 'Saturn');
    });
});

test('embedded records should be created in multiple stores', function(assert) {
  env.owner.register(
    'serializer:home-planet',
    RESTSerializer.extend(EmbeddedRecordsMixin, {
      attrs: {
        villains: { embedded: 'always' },
      },
    })
  );

  let serializer_main = env.store.serializerFor('home-planet');
  let serializer_a = env.store_a.serializerFor('home-planet');
  let serializer_b = env.store_b.serializerFor('home-planet');

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
      env.store,
      env.store.modelFor('home-planet'),
      json_hash_main,
      1,
      'findRecord'
    );
    env.store.push(json_main);
    assert.equal(
      env.store.hasRecordForId('super-villain', '1'),
      true,
      'superVillain should exist in service:store'
    );
  });

  run(() => {
    json_a = serializer_a.normalizeResponse(
      env.store_a,
      env.store_a.modelFor('home-planet'),
      json_hash_a,
      1,
      'findRecord'
    );
    env.store_a.push(json_a);
    assert.equal(
      env.store_a.hasRecordForId('super-villain', '1'),
      true,
      'superVillain should exist in store:store-a'
    );
  });

  run(() => {
    json_b = serializer_b.normalizeResponse(
      env.store_b,
      env.store_a.modelFor('home-planet'),
      json_hash_b,
      1,
      'findRecord'
    );
    env.store_b.push(json_b);
    assert.equal(
      env.store_b.hasRecordForId('super-villain', '1'),
      true,
      'superVillain should exist in store:store-b'
    );
  });
});

test('each store should have a unique instance of the serializers', function(assert) {
  env.owner.register('serializer:home-planet', RESTSerializer.extend({}));

  let serializer_a = env.store_a.serializerFor('home-planet');
  let serializer_b = env.store_b.serializerFor('home-planet');

  assert.equal(
    get(serializer_a, 'store'),
    env.store_a,
    "serializer_a's store prop should be sotre_a"
  );
  assert.equal(
    get(serializer_b, 'store'),
    env.store_b,
    "serializer_b's store prop should be sotre_b"
  );
  assert.notEqual(
    serializer_a,
    serializer_b,
    'serialier_a and serialier_b should be unique instances'
  );
});

test('each store should have a unique instance of the adapters', function(assert) {
  env.owner.register('adapter:home-planet', Adapter.extend({}));

  let adapter_a = env.store_a.adapterFor('home-planet');
  let adapter_b = env.store_b.adapterFor('home-planet');

  assert.equal(get(adapter_a, 'store'), env.store_a);
  assert.equal(get(adapter_b, 'store'), env.store_b);
  assert.notEqual(adapter_a, adapter_b);
});
