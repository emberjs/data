var get = Ember.get, set = Ember.set;
var HomePlanet, league, SuperVillain, superVillain, EvilMinion, YellowMinion, DoomsdayDevice, Comment, env;

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

test("extractArray with custom typeForRoot", function() {
  env.restSerializer.typeForRoot = function(root) {
    var camelized = Ember.String.camelize(root);
    return Ember.String.singularize(camelized);
  };

  var json_hash = {
    home_planets: [{id: "1", name: "Umber", superVillains: [1]}],
    super_villains: [{id: "1", firstName: "Tom", lastName: "Dale", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(array, [{
    "id": "1",
    "name": "Umber",
    "superVillains": [1]
  }]);

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
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

test("extractArray can load secondary records of the same type without affecting the query count", function() {
  var json_hash = {
    comments: [{id: "1", body: "Parent Comment", root: true, children: [2, 3]}],
    _comments: [
      { id: "2", body: "Child Comment 1", root: false },
      { id: "3", body: "Child Comment 2", root: false }
    ]
  };

  var array = env.restSerializer.extractArray(env.store, Comment, json_hash);

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

  var json_hash = {
    evilMinion: {id: "1", name: "Tom Dale", superVillain: 1},
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractSingle(env.store, EvilMinion, json_hash);

  equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

test("extractArray loads secondary records with correct serializer", function() {
  var superVillainNormalizeCount = 0;

  env.container.register('serializer:superVillain', DS.RESTSerializer.extend({
    normalize: function() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var json_hash = {
    evilMinions: [{id: "1", name: "Tom Dale", superVillain: 1}],
    superVillains: [{id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1"}]
  };

  var array = env.restSerializer.extractArray(env.store, EvilMinion, json_hash);

  equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});
