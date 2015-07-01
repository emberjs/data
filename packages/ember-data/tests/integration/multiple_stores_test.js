var env;
var SuperVillain, HomePlanet, EvilMinion;
var run = Ember.run;

module("integration/multiple_stores - Multiple Stores Tests", {
  setup: function() {
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

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("should be able to push into multiple stores", function() {
  env.registry.register('adapter:home-planet', DS.RESTAdapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));

  var home_planet_main = { id: '1', name: 'Earth' };
  var home_planet_a = { id: '1', name: 'Mars' };
  var home_planet_b = { id: '1', name: 'Saturn' };

  run(function() {
    env.store.push(env.store.normalize('home-planet', home_planet_main));
    env.store_a.push(env.store_a.normalize('home-planet', home_planet_a));
    env.store_b.push(env.store_b.normalize('home-planet', home_planet_b));
  });

  run(env.store, 'findRecord', 'home-planet', 1).then(async(function(homePlanet) {
    equal(homePlanet.get('name'), "Earth");
  }));

  run(env.store_a, 'findRecord', 'home-planet', 1).then(async(function(homePlanet) {
    equal(homePlanet.get('name'), "Mars");
  }));

  run(env.store_b, 'findRecord', 'home-planet', 1).then(async(function(homePlanet) {
    equal(homePlanet.get('name'), "Saturn");
  }));

});

test("embedded records should be created in multiple stores", function() {
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer_main = env.store.serializerFor('home-planet');
  var serializer_a = env.store_a.serializerFor('home-planet');
  var serializer_b = env.store_b.serializerFor('home-planet');

  var json_hash_main = {
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
  var json_hash_a = {
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
  var json_hash_b = {
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
  var json_main, json_a, json_b;

  run(function() {
    json_main = serializer_main.normalizeResponse(env.store, env.store.modelFor('home-planet'), json_hash_main, 1, 'findRecord');
    env.store.push(json_main);
    equal(env.store.hasRecordForId('super-villain', "1"), true, "superVillain should exist in service:store");
  });

  run(function() {
    json_a = serializer_a.normalizeResponse(env.store_a, env.store_a.modelFor('home-planet'), json_hash_a, 1, 'findRecord');
    env.store_a.push(json_a);
    equal(env.store_a.hasRecordForId("super-villain", "1"), true, "superVillain should exist in store:store-a");
  });

  run(function() {
    json_b = serializer_b.normalizeResponse(env.store_b, env.store_a.modelFor('home-planet'), json_hash_b, 1, 'findRecord');
    env.store_b.push(json_b);
    equal(env.store_b.hasRecordForId("super-villain", "1"), true, "superVillain should exist in store:store-b");
  });

});
