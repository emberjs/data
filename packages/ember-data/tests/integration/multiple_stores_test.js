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

    env.container.register('serializer:application', DS.ActiveModelSerializer);
    env.container.register('serializer:-active-model', DS.ActiveModelSerializer);
    env.container.register('adapter:-active-model', DS.ActiveModelAdapter);

    env.container.register('store:store-a', DS.Store);
    env.container.register('store:store-b', DS.Store);

    env.store_a = env.container.lookup('store:store-a');
    env.store_b = env.container.lookup('store:store-b');
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("should be able to push into multiple stores", function() {
  env.container.register('adapter:homePlanet', DS.ActiveModelAdapter);
  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer);

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

  env.container.register('store:primary', DS.Store);
  env.container.register('store:secondary', DS.Store);

  env.primaryStore = env.container.lookup('store:primary');
  env.secondaryStore = env.container.lookup('store:secondary');

  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('adapter:homePlanet', DS.ActiveModelAdapter);

  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("homePlanet");
  var serializer_primary = env.primaryStore.serializerFor("homePlanet");
  var serializer_secondary = env.secondaryStore.serializerFor("homePlanet");

  var json_hash = {
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
  var json_hash_primary = {
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
  var json_hash_secondary = {
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
  var json, json_primary, json_secondary;

  run(function() {
    json = serializer.extractSingle(env.store, HomePlanet, json_hash);
    equal(env.store.hasRecordForId("superVillain", "1"), true, "superVillain should exist in store:main");
  });

  run(function() {
    json_primary = serializer_primary.extractSingle(env.primaryStore, HomePlanet, json_hash_primary);
    equal(env.primaryStore.hasRecordForId("superVillain", "1"), true, "superVillain should exist in store:primary");
  });

  run(function() {
    json_secondary = serializer_secondary.extractSingle(env.secondaryStore, HomePlanet, json_hash_secondary);
    equal(env.secondaryStore.hasRecordForId("superVillain", "1"), true, "superVillain should exist in store:secondary");
  });

});
