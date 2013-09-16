var get = Ember.get, set = Ember.set;
var HomePlanet, league, SuperVillain, superVillain, EvilMinion, YellowMinion, DoomsdayDevice, PopularVillain, env;

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
      superVillains: DS.hasMany('superVillain')
    });
    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
    });
    YellowMinion = EvilMinion.extend();
    DoomsdayDevice = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinion:   DS.belongsTo('evilMinion', {polymorphic: true})
    });
    PopularVillain = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinions:  DS.hasMany('evilMinion', {polymorphic: true})
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      popularVillain: PopularVillain
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('popularVillain');
    env.container.register('serializer:ams', DS.ActiveModelSerializer);
    env.container.register('adapter:ams', DS.ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:ams");
    env.amsAdapter    = env.container.lookup("adapter:ams");
  },

  teardown: function() {
    env.store.destroy();
  }
});

test("serialize", function() {
  league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
  var tom           = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league });

  var json = env.amsSerializer.serialize(tom);

  deepEqual(json, {
    first_name:       "Tom",
    last_name:        "Dale",
    home_planet_id: get(league, "id")
  });
});

test("serializeIntoHash", function() {
  league = env.store.createRecord(HomePlanet, { name: "Umber", id: "123" });
  var json = {};

  env.amsSerializer.serializeIntoHash(json, HomePlanet, league);

  deepEqual(json, {
    home_planet: {
      name:   "Umber"
    }
  });
});

test("normalize", function() {
  var superVillain_hash = {first_name: "Tom", last_name: "Dale", home_planet_id: "123", evil_minion_ids: [1,2]};

  var json = env.amsSerializer.normalize(SuperVillain, superVillain_hash, "superVillain");

  deepEqual(json, {
    firstName:      "Tom",
    lastName:       "Dale",
    homePlanet: "123",
    evilMinions:   [1,2]
  });
});

test("extractSingle", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
    home_planet:   {id: "1", name: "Umber", super_villain_ids: [1]},
    super_villains:  [{id: "1", first_name: "Tom", last_name: "Dale", home_planet_id: "1"}]
  };

  var json = env.amsSerializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  });

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractArray", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);

  var json_hash = {
    home_planets: [{id: "1", name: "Umber", super_villain_ids: [1]}],
    super_villains: [{id: "1", first_name: "Tom", last_name: "Dale", home_planet_id: "1"}]
  };

  var array = env.amsSerializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
});

test("serialize polymorphic", function() {
  var tom = env.store.createRecord(YellowMinion,   {name: "Alex", id: "124"});
  var ray = env.store.createRecord(DoomsdayDevice, {evilMinion: tom, name: "DeathRay"});

  var json = env.amsSerializer.serialize(ray);

  deepEqual(json, {
    name:  "DeathRay",
    evil_minion_type: "YellowMinion",
    evil_minion_id: "124"
  });
});

test("extractPolymorphic", function() {
  env.container.register('adapter:yellowMinion', DS.ActiveModelAdapter);
  EvilMinion.toString   = function() { return "EvilMinion"; };
  YellowMinion.toString = function() { return "YellowMinion"; };

  var json_hash = {
    doomsday_device: {id: 1, name: "DeathRay", evil_minion: { type: "yellow_minion", id: 12}},
    evil_minions:    [{id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };

  var json = env.amsSerializer.extractSingle(env.store, DoomsdayDevice, json_hash);

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
  env.container.register('adapter:yellowMinion', DS.ActiveModelAdapter);
  EvilMinion.toString   = function() { return "EvilMinion"; };
  YellowMinion.toString = function() { return "YellowMinion"; };

  var json_hash = {
    doomsday_device: {id: 1, name: "DeathRay"},
    evil_minions:    [{id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };

  var json = env.amsSerializer.extractSingle(env.store, DoomsdayDevice, json_hash);

  deepEqual(json, {
    "id": 1,
    "name": "DeathRay",
    "evilMinion": undefined
  });
});

test("extractPolymorphic does not break hasMany relationships", function() {
  env.container.register('adapter:yellowMinion', DS.ActiveModelAdapter);

  var json_hash = {
    popular_villain: {id: 1, name: "Dr. Evil", evil_minions: []}
  };

  var json = env.amsSerializer.extractSingle(env.store, PopularVillain, json_hash);

  deepEqual(json, {
    "id": 1,
    "name": "Dr. Evil",
    "evilMinions": []
  });
});
