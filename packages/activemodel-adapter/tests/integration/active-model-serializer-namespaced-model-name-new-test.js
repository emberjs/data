var SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, MediocreVillain, TestSerializer, env;
var run = Ember.run;

module("integration/active_model - AMS-namespaced-model-names (new API)", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      evilMinions:   DS.hasMany("evilMinion")
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
    TestSerializer = DS.ActiveModelSerializer.extend({
      isNewSerializerAPI: true
    });
    env = setupStore({
      superVillain:   SuperVillain,
      evilMinion:     EvilMinion,
      'evilMinions/yellowMinion':   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      mediocreVillain: MediocreVillain
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('evilMinion');
    env.store.modelFor('evilMinions/yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('mediocreVillain');
    env.registry.register('serializer:application', TestSerializer);
    env.registry.register('serializer:-active-model', TestSerializer);
    env.registry.register('adapter:-active-model', TestSerializer);
    env.amsSerializer = env.container.lookup("serializer:-active-model");
    env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

if (Ember.FEATURES.isEnabled('ds-new-serializer-api')) {

  test("extractPolymorphic hasMany", function() {
    var json_hash = {
      mediocre_villain: { id: 1, name: "Dr Horrible", evil_minion_ids: [{ type: "EvilMinions::YellowMinion", id: 12 }] },
      "evil-minions/yellow-minion":    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
    };
    var json;

    run(function() {
      json = env.amsSerializer.normalizeResponse(env.store, MediocreVillain, json_hash, '1', 'find');
    });

    deepEqual(json, {
      "data": {
        "id": "1",
        "type": "mediocre-villain",
        "attributes": {
          "name": "Dr Horrible"
        },
        "relationships": {
          "evilMinions": {
            "data": [
              { "id": "12", "type": "evil-minions/yellow-minion" }
            ]
          }
        }
      },
      "included": [{
        "id": "12",
        "type": "evil-minions/yellow-minion",
        "attributes": {
          "name": "Alex"
        },
        "relationships": {}
      }]
    });
  });

  test("extractPolymorphic belongsTo", function() {
    var json_hash = {
      doomsday_device: { id: 1, name: "DeathRay", evil_minion_id: { type: "EvilMinions::YellowMinion", id: 12 } },
      "evil-minions/yellow-minion":    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
    };
    var json;

    run(function() {
      json = env.amsSerializer.normalizeResponse(env.store, DoomsdayDevice, json_hash, '1', 'find');
    });

    deepEqual(json, {
      "data": {
        "id": "1",
        "type": "doomsday-device",
        "attributes": {
          "name": "DeathRay"
        },
        "relationships": {
          "evilMinion": {
            "data": { "id": "12", "type": "evil-minions/yellow-minion" }
          }
        }
      },
      "included": [{
        "id": "12",
        "type": "evil-minions/yellow-minion",
        "attributes": {
          "name": "Alex"
        },
        "relationships": {}
      }]
    });
  });

}
