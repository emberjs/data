var get = Ember.get;
var HomePlanet, league, SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, Comment, env;
var run = Ember.run;

module("integration/serializer/rest - RESTSerializer", {
  setup: function() {
    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      superVillains: DS.hasMany('superVillain')
    });
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo("homePlanet"),
      evilMinions:   DS.hasMany("evilMinion")
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
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      root: DS.attr('boolean'),
      children: DS.hasMany('comment')
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      comment:        Comment
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('comment');
  },

  teardown: function() {
    env.store.destroy();
  }
});

test("typeForRoot returns always same typeKey even for uncountable multi words keys", function() {
  expect(2);
  Ember.Inflector.inflector.uncountable('words');
  var expectedTypeKey = 'multiWords';
  equal(env.restSerializer.typeForRoot('multi_words'), expectedTypeKey);
  equal(env.restSerializer.typeForRoot('multiWords'), expectedTypeKey);
});

test("extractArray with custom typeForRoot", function() {
  env.restSerializer.typeForRoot = function(root) {
    var camelized = Ember.String.camelize(root);
    return Ember.String.singularize(camelized);
  };

  var jsonHash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}],
    super_villains: [{id: "1", firstName: "Tom", lastName: "Dale", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractArray(env.store, HomePlanet, jsonHash);

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractArray warning with custom typeForRoot", function() {
  var homePlanets;
  env.restSerializer.typeForRoot = function(root) {
    //return some garbage that won"t resolve in the container
    return "garbage";
  };

  var jsonHash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}]
  };

  warns(function(){
    env.restSerializer.extractArray(env.store, HomePlanet, jsonHash);
  }, /Encountered "home_planets" in payload, but no model was found for model name "garbage"/);

  // should not warn if a model is found.
  env.restSerializer.typeForRoot = function(root){
    return Ember.String.camelize(Ember.String.singularize(root));
  };

  jsonHash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}]
  };

  noWarns(function(){
    homePlanets = Ember.A(env.restSerializer.extractArray(env.store, HomePlanet, jsonHash));
  });

  equal(get(homePlanets, "length"), 1);
  equal(get(homePlanets, "firstObject.name"), "Umber");
  deepEqual(get(homePlanets, "firstObject.superVillains"), [1]);
});

test("extractSingle warning with custom typeForRoot", function() {
  var homePlanet;
  env.restSerializer.typeForRoot = function(root) {
    //return some garbage that won"t resolve in the container
    return "garbage";
  };

  var jsonHash = {
    home_planet: {id: "1", name: "Umber", superVillains: [1]}
  };

  warns(Ember.run.bind(null, function(){
    env.restSerializer.extractSingle(env.store, HomePlanet, jsonHash);
  }), /Encountered "home_planet" in payload, but no model was found for model name "garbage"/);

  // should not warn if a model is found.
  env.restSerializer.typeForRoot = function(root){
    return Ember.String.camelize(Ember.String.singularize(root));
  };

  jsonHash = {
    home_planet: {id: "1", name: "Umber", superVillains: [1]}
  };

  noWarns(function(){
    homePlanet = env.restSerializer.extractSingle(env.store, HomePlanet, jsonHash);
  });

  equal(get(homePlanet, "name"), "Umber");
  deepEqual(get(homePlanet, "superVillains"), [1]);
});

test("pushPayload - single record payload - warning with custom typeForRoot", function() {
  var homePlanet;
  var HomePlanetRestSerializer = DS.RESTSerializer.extend({
    typeForRoot: function(root){
      //return some garbage that won"t resolve in the container
      if (root === "home_planet") {
        return "garbage";
      } else {
        return Ember.String.singularize(Ember.String.camelize(root));
      }
    }
  });

  env.container.register("serializer:homePlanet", HomePlanetRestSerializer);

  var jsonHash = {
    home_planet: {id: "1", name: "Umber", superVillains: [1]},
    super_villains: [
      {
        "id": "1",
        "firstName": "Stanley"
      }
    ]
  };

  warns(function(){
    env.store.pushPayload("homePlanet", jsonHash);
  }, /Encountered "home_planet" in payload, but no model was found for model name "garbage"/);


  // assert non-warned records get pushed into store correctly
  var superVillain = env.store.getById("superVillain", "1");
  equal(get(superVillain, "firstName"), "Stanley");

  // Serializers are singletons, so that"s why we use the store which
  // looks at the container to look it up
  env.store.serializerFor("homePlanet").reopen({
    typeForRoot: function(root){
      // should not warn if a model is found.
      return Ember.String.camelize(Ember.String.singularize(root));
    }
  });

  jsonHash = {
    home_planet: {id: "1", name: "Umber", superVillains: [1]},
    super_villains: [
      {
        "id": "1",
        "firstName": "Stanley"
      }
    ]
  };

  noWarns(function(){
    env.store.pushPayload("homePlanet", jsonHash);
    run(function(){
      homePlanet = env.store.getById("homePlanet", "1");
    });
  });

  equal(get(homePlanet, "name"), "Umber");
  deepEqual(get(homePlanet, "superVillains.firstObject.firstName"), "Stanley");
});

test("pushPayload - multiple record payload (extractArray) - warning with custom typeForRoot", function() {
  var homePlanet;
  var HomePlanetRestSerializer = DS.RESTSerializer.extend({
    typeForRoot: function(root){
      //return some garbage that won"t resolve in the container
      if (root === "home_planets") {
        return "garbage";
      } else {
        return Ember.String.singularize(Ember.String.camelize(root));
      }
    }
  });

  env.container.register("serializer:homePlanet", HomePlanetRestSerializer);

  var jsonHash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}],
    super_villains: [
      {
        "id": "1",
        "firstName": "Stanley"
      }
    ]
  };

  warns(function(){
    env.store.pushPayload("homePlanet", jsonHash);
  }, /Encountered "home_planets" in payload, but no model was found for model name "garbage"/);

  // assert non-warned records get pushed into store correctly
  var superVillain = env.store.getById("superVillain", "1");
  equal(get(superVillain, "firstName"), "Stanley");

  // Serializers are singletons, so that"s why we use the store which
  // looks at the container to look it up
  env.store.serializerFor("homePlanet").reopen({
    typeForRoot: function(root){
      // should not warn if a model is found.
      return Ember.String.camelize(Ember.String.singularize(root));
    }
  });

  jsonHash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}],
    super_villains: [
      {
        "id": "1",
        "firstName": "Stanley"
      }
    ]
  };

  noWarns(function(){
    env.store.pushPayload("homePlanet", jsonHash);
    run(function(){
      homePlanet = env.store.getById("homePlanet", "1");
    });
  });

  equal(get(homePlanet, "name"), "Umber");
  deepEqual(get(homePlanet, "superVillains.firstObject.firstName"), "Stanley");
});

test("serialize polymorphicType", function() {
  var tom = env.store.createRecord(YellowMinion,   {name: "Alex", id: "124"});
  var ray = env.store.createRecord(DoomsdayDevice, {evilMinion: tom, name: "DeathRay"});

  var json = env.restSerializer.serialize(ray);

  deepEqual(json, {
    name:  "DeathRay",
    evilMinionType: "yellowMinion",
    evilMinion: "124"
  });
});

test("serialize polymorphicType with decamelized typeKey", function() {
  YellowMinion.typeKey = 'yellow-minion';
  var tom = env.store.createRecord(YellowMinion,   {name: "Alex", id: "124"});
  var ray = env.store.createRecord(DoomsdayDevice, {evilMinion: tom, name: "DeathRay"});

  var json = env.restSerializer.serialize(ray);

  deepEqual(json["evilMinionType"], "yellowMinion");
});

test("normalizePayload is called during extractSingle", function() {
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    normalizePayload: function(payload) {
      return payload.response;
    }
  }));

  var jsonHash = { response: {
    evilMinion: {id: "1", name: "Tom Dale", superVillain: 1},
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  } };

  var applicationSerializer = env.container.lookup('serializer:application');
  var data = applicationSerializer.extractSingle(env.store, EvilMinion, jsonHash);

  equal(data.name, jsonHash.response.evilMinion.name, "normalize reads off the response");

});
test("serialize polymorphic when associated object is null", function() {
  var ray = env.store.createRecord(DoomsdayDevice, {name: "DeathRay"});

  var json = env.restSerializer.serialize(ray);

  deepEqual(json["evilMinionType"], null);
});

test("extractArray can load secondary records of the same type without affecting the query count", function() {
  var jsonHash = {
    comments: [{id: "1", body: "Parent Comment", root: true, children: [2, 3]}],
    _comments: [
      { id: "2", body: "Child Comment 1", root: false },
      { id: "3", body: "Child Comment 2", root: false }
    ]
  };

  var array = env.restSerializer.extractArray(env.store, Comment, jsonHash);

  deepEqual(array, [{
    "id": "1",
    "body": "Parent Comment",
    "root": true,
    "children": [2, 3]
  }]);

  equal(array.length, 1, "The query count is unaffected");

  equal(env.store.recordForId("comment", "2").get("body"), "Child Comment 1", "Secondary records are in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Child Comment 2", "Secondary records are in the store");
});

test("extractSingle loads secondary records with correct serializer", function() {
  var superVillainNormalizeCount = 0;

  env.container.register('serializer:superVillain', DS.RESTSerializer.extend({
    normalize: function() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var jsonHash = {
    evilMinion: {id: "1", name: "Tom Dale", superVillain: 1},
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  };

  env.restSerializer.extractSingle(env.store, EvilMinion, jsonHash);

  equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

test("extractSingle returns null if payload contains null", function() {
  expect(1);

  var jsonHash = {
    evilMinion: null
  };

  var value = env.restSerializer.extractSingle(env.store, EvilMinion, jsonHash);

  equal(value, null, "returned value is null");
});

test("extractArray loads secondary records with correct serializer", function() {
  var superVillainNormalizeCount = 0;

  env.container.register('serializer:superVillain', DS.RESTSerializer.extend({
    normalize: function() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var jsonHash = {
    evilMinions: [{id: "1", name: "Tom Dale", superVillain: 1}],
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  };

  env.restSerializer.extractArray(env.store, EvilMinion, jsonHash);

  equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

test('normalizeHash normalizes specific parts of the payload', function(){
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    normalizeHash: {
      homePlanets: function(hash) {
        hash.id = hash._id;
        delete hash._id;
        return hash;
      }
    }
  }));

  var jsonHash = { homePlanets: [{_id: "1", name: "Umber", superVillains: [1]}] };

  var array = env.restSerializer.extractArray(env.store, HomePlanet, jsonHash);

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);
});

test('normalizeHash works with transforms', function(){
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    normalizeHash: {
      evilMinions: function(hash) {
        hash.condition = hash._condition;
        delete hash._condition;
        return hash;
      }
    }
  }));

  env.container.register('transform:condition', DS.Transform.extend({
    deserialize: function(serialized) {
      if (serialized === 1) {
        return "healing";
      } else {
        return "unknown";
      }
    },
    serialize: function(deserialized) {
      if (deserialized === "healing") {
        return 1;
      } else {
        return 2;
      }
    }
  }));

  EvilMinion.reopen({ condition: DS.attr('condition') });

  var jsonHash = {
    evilMinions: [{id: "1", name: "Tom Dale", superVillain: 1, _condition: 1}]
  };

  var array = env.restSerializer.extractArray(env.store, EvilMinion, jsonHash);

  equal(array[0].condition, "healing");
});

test('normalize should allow for different levels of normalization', function(){
  env.container.register('serializer:application', DS.RESTSerializer.extend({
    attrs: {
      superVillain: 'is_super_villain'
    },
    keyForAttribute: function(attr) {
      return Ember.String.decamelize(attr);
    }
  }));

  var jsonHash = {
    evilMinions: [{id: "1", name: "Tom Dale", is_super_villain: 1}]
  };

  var array = env.restSerializer.extractArray(env.store, EvilMinion, jsonHash);

  equal(array[0].superVillain, 1);
});

test("serializeIntoHash", function() {
  league = env.store.createRecord(HomePlanet, { name: "Umber", id: "123" });
  var json = {};

  env.restSerializer.serializeIntoHash(json, HomePlanet, league);

  deepEqual(json, {
    homePlanet: {
      name: "Umber"
    }
  });
});

test("serializeIntoHash with decamelized typeKey", function() {
  HomePlanet.typeKey = 'home-planet';
  league = env.store.createRecord(HomePlanet, { name: "Umber", id: "123" });
  var json = {};

  env.restSerializer.serializeIntoHash(json, HomePlanet, league);

  deepEqual(json, {
    homePlanet: {
      name: "Umber"
    }
  });
});
