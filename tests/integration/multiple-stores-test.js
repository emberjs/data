import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';

import DS from 'ember-data';

let env;
let SuperVillain, HomePlanet, EvilMinion;

module("integration/multiple_stores - Multiple Stores Tests", {
  setup() {
    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo('home-planet', { inverse: 'villains', async: false }),
      evilMinions:     DS.hasMany('evil-minion', { async: false })
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('super-villain', { inverse: 'homePlanet', async: false })
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('super-villain', { async: false }),
      name:            DS.attr('string')
    });

    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion
    });

    env.registry.register('adapter:application', DS.RESTAdapter);
    env.registry.register('serializer:application', DS.RESTSerializer);

    env.registry.register('store:store-a', DS.Store);
    env.registry.register('store:store-b', DS.Store);

    env.store_a = env.container.lookup('store:store-a');
    env.store_b = env.container.lookup('store:store-b');
  },

  teardown() {
    run(env.store, 'destroy');
  }
});

test("should be able to push into multiple stores", function(assert) {
  env.registry.register('adapter:home-planet', DS.RESTAdapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));

  let home_planet_main = { id: '1', name: 'Earth' };
  let home_planet_a = { id: '1', name: 'Mars' };
  let home_planet_b = { id: '1', name: 'Saturn' };

  run(() => {
    env.store.push(env.store.normalize('home-planet', home_planet_main));
    env.store_a.push(env.store_a.normalize('home-planet', home_planet_a));
    env.store_b.push(env.store_b.normalize('home-planet', home_planet_b));
  });

  return env.store.findRecord('home-planet', 1).then(homePlanet => {
    assert.equal(homePlanet.get('name'), 'Earth');

    return env.store_a.findRecord('homePlanet', 1);
  }).then(homePlanet => {
    assert.equal(homePlanet.get('name'), 'Mars');
    return env.store_b.findRecord('homePlanet', 1);
  }).then(homePlanet => {
    assert.equal(homePlanet.get('name'), 'Saturn');
  });
});

test("embedded records should be created in multiple stores", function(assert) {
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  let serializer_main = env.store.serializerFor('home-planet');
  let serializer_a = env.store_a.serializerFor('home-planet');
  let serializer_b = env.store_b.serializerFor('home-planet');

  let json_hash_main = {
    homePlanet: {
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        firstName: "Tom",
        lastName: "Dale"
      }]
    }
  };
  let json_hash_a = {
    homePlanet: {
      id: "1",
      name: "Mars",
      villains: [{
        id: "1",
        firstName: "James",
        lastName: "Murphy"
      }]
    }
  };
  let json_hash_b = {
    homePlanet: {
      id: "1",
      name: "Saturn",
      villains: [{
        id: "1",
        firstName: "Jade",
        lastName: "John"
      }]
    }
  };
  let json_main, json_a, json_b;

  run(() => {
    json_main = serializer_main.normalizeResponse(env.store, env.store.modelFor('home-planet'), json_hash_main, 1, 'findRecord');
    env.store.push(json_main);
    assert.equal(env.store.hasRecordForId('super-villain', "1"), true, "superVillain should exist in service:store");
  });

  run(() => {
    json_a = serializer_a.normalizeResponse(env.store_a, env.store_a.modelFor('home-planet'), json_hash_a, 1, 'findRecord');
    env.store_a.push(json_a);
    assert.equal(env.store_a.hasRecordForId("super-villain", "1"), true, "superVillain should exist in store:store-a");
  });

  run(() => {
    json_b = serializer_b.normalizeResponse(env.store_b, env.store_a.modelFor('home-planet'), json_hash_b, 1, 'findRecord');
    env.store_b.push(json_b);
    assert.equal(env.store_b.hasRecordForId("super-villain", "1"), true, "superVillain should exist in store:store-b");
  });
});
