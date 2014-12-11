var get = Ember.get;
var HomePlanet, league, SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, MediocreVillain, env;
var run = Ember.run;

module("integration/active_model - ActiveModelSerializer", {
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
    env.registry.register('serializer:application', DS.ActiveModelSerializer);
    env.registry.register('serializer:-active-model', DS.ActiveModelSerializer);
    env.registry.register('adapter:-active-model', DS.ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:-active-model");
    env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("serialize", function() {
  var tom;
  run(function() {
    league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
    tom           = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league });
  });

  var json = env.amsSerializer.serialize(tom._createSnapshot());

  deepEqual(json, {
    first_name: "Tom",
    last_name: "Dale",
    home_planet_id: get(league, "id")
  });
});

test("serializeIntoHash", function() {
  run(function() {
    league = env.store.createRecord(HomePlanet, { name: "Umber", id: "123" });
  });
  var json = {};

  env.amsSerializer.serializeIntoHash(json, HomePlanet, league._createSnapshot());

  deepEqual(json, {
    home_planet: {
      name: "Umber"
    }
  });
});

test("serializeIntoHash with decamelized types", function() {
  HomePlanet.typeKey = 'home-planet';
  run(function() {
    league = env.store.createRecord(HomePlanet, { name: "Umber", id: "123" });
  });
  var json = {};

  env.amsSerializer.serializeIntoHash(json, HomePlanet, league._createSnapshot());

  deepEqual(json, {
    home_planet: {
      name: "Umber"
    }
  });
});


test("normalize", function() {
  SuperVillain.reopen({
    yellowMinion: DS.belongsTo('yellowMinion')
  });

  var superVillain_hash = { first_name: "Tom", last_name: "Dale", home_planet_id: "123", evil_minion_ids: [1,2] };

  var json = env.amsSerializer.normalize(SuperVillain, superVillain_hash, "superVillain");

  deepEqual(json, {
    firstName: "Tom",
    lastName: "Dale",
    homePlanet: "123",
    evilMinions: [1,2]
  });
});

test("normalize links", function() {
  var home_planet = {
    id: "1",
    name: "Umber",
    links: { super_villains: "/api/super_villians/1" }
  };


  var json = env.amsSerializer.normalize(HomePlanet, home_planet, "homePlanet");

  equal(json.links.superVillains, "/api/super_villians/1", "normalize links");
});

test("extractSingle", function() {
  env.registry.register('adapter:superVillain', DS.ActiveModelAdapter);

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
    json = env.amsSerializer.extractSingle(env.store, HomePlanet, json_hash);
  });

  deepEqual(json, {
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  });

  run(function() {
    env.store.find("superVillain", 1).then(function(minion) {
      equal(minion.get('firstName'), "Tom");
    });
  });
});

test("extractArray", function() {
  env.registry.register('adapter:superVillain', DS.ActiveModelAdapter);
  var array;

  var json_hash = {
    home_planets: [{ id: "1", name: "Umber", super_villain_ids: [1] }],
    super_villains: [{ id: "1", first_name: "Tom", last_name: "Dale", home_planet_id: "1" }]
  };

  run(function() {
    array = env.amsSerializer.extractArray(env.store, HomePlanet, json_hash);
  });

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);

  run(function() {
    env.store.find("superVillain", 1).then(function(minion) {
      equal(minion.get('firstName'), "Tom");
    });
  });
});

test("serialize polymorphic", function() {
  var tom, ray;
  run(function() {
    tom = env.store.createRecord(YellowMinion, { name: "Alex", id: "124" });
    ray = env.store.createRecord(DoomsdayDevice, { evilMinion: tom, name: "DeathRay" });
  });

  var json = env.amsSerializer.serialize(ray._createSnapshot());

  deepEqual(json, {
    name: "DeathRay",
    evil_minion_type: "YellowMinion",
    evil_minion_id: "124"
  });
});

test("serialize polymorphic when type key is not camelized", function() {
  YellowMinion.typeKey = 'yellow-minion';
  var tom, ray;
  run(function() {
    tom = env.store.createRecord(YellowMinion, { name: "Alex", id: "124" });
    ray = env.store.createRecord(DoomsdayDevice, { evilMinion: tom, name: "DeathRay" });
  });

  var json = env.amsSerializer.serialize(ray._createSnapshot());

  deepEqual(json["evil_minion_type"], "YellowMinion");
});

test("serialize polymorphic when associated object is null", function() {
  var ray, json;
  run(function() {
    ray = env.store.createRecord(DoomsdayDevice, { name: "DeathRay" });
    json = env.amsSerializer.serialize(ray._createSnapshot());
  });

  deepEqual(json["evil_minion_type"], null);
});

test("extractPolymorphic hasMany", function() {
  env.registry.register('adapter:yellowMinion', DS.ActiveModelAdapter);
  MediocreVillain.toString   = function() { return "MediocreVillain"; };
  YellowMinion.toString = function() { return "YellowMinion"; };

  var json_hash = {
    mediocre_villain: { id: 1, name: "Dr Horrible", evil_minions: [{ type: "yellow_minion", id: 12 }] },
    evil_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };
  var json;

  run(function() {
    json = env.amsSerializer.extractSingle(env.store, MediocreVillain, json_hash);
  });

  deepEqual(json, {
    "id": 1,
    "name": "Dr Horrible",
    "evilMinions": [{
      type: "yellowMinion",
      id: 12
    }]
  });
});

test("extractPolymorphic", function() {
  env.registry.register('adapter:yellowMinion', DS.ActiveModelAdapter);
  EvilMinion.toString   = function() { return "EvilMinion"; };
  YellowMinion.toString = function() { return "YellowMinion"; };

  var json_hash = {
    doomsday_device: { id: 1, name: "DeathRay", evil_minion: { type: "yellow_minion", id: 12 } },
    evil_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };
  var json;

  run(function() {
    json = env.amsSerializer.extractSingle(env.store, DoomsdayDevice, json_hash);
  });

  deepEqual(json, {
    "id": 1,
    "name": "DeathRay",
    "evilMinion": {
      type: "yellowMinion",
      id: 12
    }
  });
});

test("extractPolymorphic when the related data is not specified", function() {
  var json = {
    doomsday_device: { id: 1, name: "DeathRay" },
    evil_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };

  run(function() {
    json = env.amsSerializer.extractSingle(env.store, DoomsdayDevice, json);
  });

  deepEqual(json, {
    "id": 1,
    "name": "DeathRay",
    "evilMinion": undefined
  });
});

test("extractPolymorphic hasMany when the related data is not specified", function() {
  var json = {
    mediocre_villain: { id: 1, name: "Dr Horrible" }
  };

  run(function() {
    json = env.amsSerializer.extractSingle(env.store, MediocreVillain, json);
  });

  deepEqual(json, {
    "id": 1,
    "name": "Dr Horrible",
    "evilMinions": undefined
  });
});

test("extractPolymorphic does not break hasMany relationships", function() {
  var json = {
    mediocre_villain: { id: 1, name: "Dr. Evil", evil_minions: [] }
  };

  run(function () {
    json = env.amsSerializer.extractSingle(env.store, MediocreVillain, json);
  });

  deepEqual(json, {
    "id": 1,
    "name": "Dr. Evil",
    "evilMinions": []
  });
});
