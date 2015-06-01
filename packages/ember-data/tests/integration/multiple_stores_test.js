var env;
var SuperVillain, HomePlanet, EvilMinion;
var run = Ember.run;

module("integration/multiple_stores - Multiple Stores Tests", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo("homePlanet", { inverse: 'villains' }),
      evilMinions:     DS.hasMany("evilMinion")
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('superVillain', { inverse: 'homePlanet' })
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('superVillain'),
      name:            DS.attr('string')
    });

    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion
    });

    env.registry.register('serializer:application', DS.ActiveModelSerializer);
    env.registry.register('serializer:-active-model', DS.ActiveModelSerializer);
    env.registry.register('adapter:-active-model', DS.ActiveModelAdapter);

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
  env.registry.register('adapter:home-planet', DS.ActiveModelAdapter);
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer);

  var home_planet_main = { id: '1', name: 'Earth' };
  var home_planet_a = { id: '1', name: 'Mars' };
  var home_planet_b = { id: '1', name: 'Saturn' };

  run(env.store, 'push', 'homePlanet', home_planet_main);
  run(env.store_a, 'push', 'homePlanet', home_planet_a);
  run(env.store_b, 'push', 'homePlanet', home_planet_b);

  run(env.store, 'find', 'homePlanet', 1).then(async(function(homePlanet) {
    equal(homePlanet.get('name'), "Earth");
  }));

  run(env.store_a, 'find', 'homePlanet', 1).then(async(function(homePlanet) {
    equal(homePlanet.get('name'), "Mars");
  }));

  run(env.store_b, 'find', 'homePlanet', 1).then(async(function(homePlanet) {
    equal(homePlanet.get('name'), "Saturn");
  }));

});

test("embedded records should be created in multiple stores", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('adapter:home-planet', DS.ActiveModelAdapter);

  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer_main = env.store.serializerFor("homePlanet");
  var serializer_a = env.store_a.serializerFor("homePlanet");
  var serializer_b = env.store_b.serializerFor("homePlanet");

  var json_hash_main = {
    home_planet: {
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }
  };
  var json_hash_a = {
    home_planet: {
      id: "1",
      name: "Mars",
      villains: [{
        id: "1",
        first_name: "James",
        last_name: "Murphy"
      }]
    }
  };
  var json_hash_b = {
    home_planet: {
      id: "1",
      name: "Saturn",
      villains: [{
        id: "1",
        first_name: "Jade",
        last_name: "John"
      }]
    }
  };
  var json_main, json_a, json_b;

  run(function() {
    json_main = serializer_main.extractSingle(env.store, HomePlanet, json_hash_main);
    equal(env.store.hasRecordForId("superVillain", "1"), true, "superVillain should exist in store:application");
  });

  run(function() {
    json_a = serializer_a.extractSingle(env.store_a, HomePlanet, json_hash_a);
    equal(env.store_a.hasRecordForId("superVillain", "1"), true, "superVillain should exist in store:store-a");
  });

  run(function() {
    json_b = serializer_b.extractSingle(env.store_b, HomePlanet, json_hash_b);
    equal(env.store_b.hasRecordForId("superVillain", "1"), true, "superVillain should exist in store:store-b");
  });

});
