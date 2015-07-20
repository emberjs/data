const {ActiveModelAdapter, ActiveModelSerializer} = DS;

var HomePlanet, SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, MediocreVillain, TestSerializer, env;
var run = Ember.run;

module("integration/active_model - ActiveModelSerializer (new API)", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo("homePlanet"),
      evilMinions:   DS.hasMany("evilMinion")
    });
    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      superVillains: DS.hasMany('superVillain', { async: true })
    });
    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
    });
    YellowMinion = EvilMinion.extend();
    DoomsdayDevice = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinion:   DS.belongsTo('evilMinion', { polymorphic: true })
    });
    MediocreVillain = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinions:  DS.hasMany('evilMinion', { polymorphic: true })
    });
    TestSerializer = ActiveModelSerializer.extend({
      isNewSerializerAPI: true
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      mediocreVillain: MediocreVillain
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('mediocreVillain');
    env.registry.register('serializer:application', TestSerializer);
    env.registry.register('serializer:-active-model', TestSerializer);
    env.registry.register('adapter:-active-model', ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:-active-model");
    env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

if (Ember.FEATURES.isEnabled('ds-new-serializer-api')) {

  test("normalize", function(assert) {
    SuperVillain.reopen({
      yellowMinion: DS.belongsTo('yellowMinion')
    });

    var superVillain_hash = {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: "123",
      evil_minion_ids: [1, 2]
    };

    var json = env.amsSerializer.normalize(SuperVillain, superVillain_hash, "superVillain");

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "super-villain",
        "attributes": {
          "firstName": "Tom",
          "lastName": "Dale"
        },
        "relationships": {
          "evilMinions": {
            "data": [
              { "id": "1", "type": "evil-minion" },
              { "id": "2", "type": "evil-minion" }
            ]
          },
          "homePlanet": {
            "data": { "id": "123", "type": "home-planet" }
          }
        }
      }
    });
  });

  test("normalize links", function(assert) {
    var home_planet = {
      id: "1",
      name: "Umber",
      links: { super_villains: "/api/super_villians/1" }
    };

    var json = env.amsSerializer.normalize(HomePlanet, home_planet, "homePlanet");

    assert.equal(json.data.relationships.superVillains.links.related, "/api/super_villians/1", "normalize links");
  });

  test("normalizeSingleResponse", function(assert) {
    env.registry.register('adapter:superVillain', ActiveModelAdapter);

    var json_hash = {
      home_planet:   { id: "1", name: "Umber", super_villain_ids: [1] },
      super_villains:  [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale",
        home_planet_id: "1"
      }]
    };

    var json;
    run(function() {
      json = env.amsSerializer.normalizeSingleResponse(env.store, HomePlanet, json_hash, '1', 'find');
    });

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "home-planet",
        "attributes": {
          "name": "Umber"
        },
        "relationships": {
          "superVillains": {
            "data": [
              { "id": "1", "type": "super-villain" }
            ]
          }
        }
      },
      "included": [{
        "id": "1",
        "type": "super-villain",
        "attributes": {
          "firstName": "Tom",
          "lastName": "Dale"
        },
        "relationships": {
          "homePlanet": {
            "data": { "id": "1", "type": "home-planet" }
          }
        }
      }]
    });
  });

  test("normalizeArrayResponse", function(assert) {
    env.registry.register('adapter:superVillain', ActiveModelAdapter);
    var array;

    var json_hash = {
      home_planets: [{ id: "1", name: "Umber", super_villain_ids: [1] }],
      super_villains: [{ id: "1", first_name: "Tom", last_name: "Dale", home_planet_id: "1" }]
    };

    run(function() {
      array = env.amsSerializer.normalizeArrayResponse(env.store, HomePlanet, json_hash, null, 'findAll');
    });

    assert.deepEqual(array, {
      "data": [{
        "id": "1",
        "type": "home-planet",
        "attributes": {
          "name": "Umber"
        },
        "relationships": {
          "superVillains": {
            "data": [
              { "id": "1", "type": "super-villain" }
            ]
          }
        }
      }],
      "included": [{
        "id": "1",
        "type": "super-villain",
        "attributes": {
          "firstName": "Tom",
          "lastName": "Dale"
        },
        "relationships": {
          "homePlanet": {
            "data": { "id": "1", "type": "home-planet" }
          }
        }
      }]
    });
  });

  test("extractPolymorphic hasMany", function(assert) {
    env.registry.register('adapter:yellowMinion', ActiveModelAdapter);
    MediocreVillain.toString   = function() { return "MediocreVillain"; };
    YellowMinion.toString = function() { return "YellowMinion"; };

    var json_hash = {
      mediocre_villain: { id: 1, name: "Dr Horrible", evil_minion_ids: [{ type: "yellow_minion", id: 12 }] },
      yellow_minions:    [{ id: 12, name: "Alex" }]
    };
    var json;

    run(function() {
      json = env.amsSerializer.normalizeResponse(env.store, MediocreVillain, json_hash, '1', 'find');
    });

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "mediocre-villain",
        "attributes": {
          "name": "Dr Horrible"
        },
        "relationships": {
          "evilMinions": {
            "data": [
              { "id": "12", "type": "yellow-minion" }
            ]
          }
        }
      },
      "included": [{
        "id": "12",
        "type": "yellow-minion",
        "attributes": {
          "name": "Alex"
        },
        "relationships": {}
      }]
    });
  });

  test("extractPolymorphic belongsTo", function(assert) {
    env.registry.register('adapter:yellowMinion', ActiveModelAdapter);
    EvilMinion.toString   = function() { return "EvilMinion"; };
    YellowMinion.toString = function() { return "YellowMinion"; };

    var json_hash = {
      doomsday_device: { id: 1, name: "DeathRay", evil_minion_id: { type: "yellow_minion", id: 12 } },
      yellow_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
    };
    var json;

    run(function() {
      json = env.amsSerializer.normalizeResponse(env.store, DoomsdayDevice, json_hash, '1', 'find');
    });

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "doomsday-device",
        "attributes": {
          "name": "DeathRay"
        },
        "relationships": {
          "evilMinion": {
            "data": { "id": "12", "type": "yellow-minion" }
          }
        }
      },
      "included": [{
        "id": "12",
        "type": "yellow-minion",
        "attributes": {
          "name": "Alex"
        },
        "relationships": {}
      }]
    });
  });

  test("extractPolymorphic when the related data is not specified", function(assert) {
    var json = {
      doomsday_device: { id: 1, name: "DeathRay" },
      evil_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
    };

    run(function() {
      json = env.amsSerializer.normalizeResponse(env.store, DoomsdayDevice, json, '1', 'find');
    });

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "doomsday-device",
        "attributes": {
          "name": "DeathRay"
        },
        "relationships": {}
      },
      "included": [{
        "id": "12",
        "type": "evil-minion",
        "attributes": {
          "name": "Alex"
        },
        "relationships": {}
      }]
    });
  });

  test("extractPolymorphic hasMany when the related data is not specified", function(assert) {
    var json = {
      mediocre_villain: { id: 1, name: "Dr Horrible" }
    };

    run(function() {
      json = env.amsSerializer.normalizeResponse(env.store, MediocreVillain, json, '1', 'find');
    });

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "mediocre-villain",
        "attributes": {
          "name": "Dr Horrible"
        },
        "relationships": {}
      },
      "included": []
    });
  });

  test("extractPolymorphic does not break hasMany relationships", function(assert) {
    var json = {
      mediocre_villain: { id: 1, name: "Dr. Evil", evil_minion_ids: [] }
    };

    run(function () {
      json = env.amsSerializer.normalizeResponse(env.store, MediocreVillain, json, '1', 'find');
    });

    assert.deepEqual(json, {
      "data": {
        "id": "1",
        "type": "mediocre-villain",
        "attributes": {
          "name": "Dr. Evil"
        },
        "relationships": {
          "evilMinions": {
            "data": []
          }
        }
      },
      "included": []
    });
  });

}
