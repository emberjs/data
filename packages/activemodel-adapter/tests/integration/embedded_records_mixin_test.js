var get = Ember.get, set = Ember.set;
var HomePlanet, league, SuperVillain, superVillain, EvilMinion, Comment, env;

module("integration/embedded_records_mixin - EmbeddedRecordsMixin", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo("homePlanet"),
      evilMinions:   DS.hasMany("evilMinion")
    });
    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      villains:      DS.hasMany('superVillain')
    });
    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
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
      comment:        Comment
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('comment');
    env.container.register('serializer:application', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
    env.container.register('serializer:ams',         DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
    env.container.register('adapter:ams',    DS.ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:ams");
    env.amsAdapter    = env.container.lookup("adapter:ams");
  },

  teardown: function() {
    env.store.destroy();
  }
});

test("extractSingle with embedded objects", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
  var json_hash = {
    home_planet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }
  };

  var json = serializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Umber",
    villains: ["1"]
  });
  env.store.find("superVillain", 1).then(async(function(minion) {
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractSingle with embedded objects inside embedded objects", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
  var json_hash = {
    home_planet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale",
        evil_minions: [{
          id: "1",
          name: "Alex"
        }]
      }]
    }
  };

  var json = serializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Umber",
    villains: ["1"]
  });
  env.store.find("superVillain", 1).then(async(function(villain) {
    equal(villain.get('firstName'), "Tom");
    equal(villain.get('evilMinions.length'), 1, "Should load the embedded child");
    equal(villain.get('evilMinions.firstObject.name'), "Alex", "Should load the embedded child");
  }));
  env.store.find("evilMinion", 1).then(async(function(minion) {
    equal(minion.get('name'), "Alex");
  }));
});

test("extractSingle with embedded objects of same type", function() {
  env.container.register('adapter:comment', DS.ActiveModelAdapter);
  env.container.register('serializer:comment', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:comment");
  var json_hash = {
    comment: {
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false
      },
      {
        id: "3",
        body: "Foo",
        root: false
      }]
    }
  };
  var json = serializer.extractSingle(env.store, Comment, json_hash);

  deepEqual(json, {
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }, "Primary record was correct");
  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
});

test("extractSingle with embedded objects inside embedded objects of same type", function() {
  env.container.register('adapter:comment', DS.ActiveModelAdapter);
  env.container.register('serializer:comment', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:comment");
  var json_hash = {
    comment: {
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false,
        children: [{
          id: "4",
          body: "Another",
          root: false
        }]
      },
      {
        id: "3",
        body: "Foo",
        root: false
      }]
    }
  };
  var json = serializer.extractSingle(env.store, Comment, json_hash);

  deepEqual(json, {
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }, "Primary record was correct");
  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "4").get("body"), "Another", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "2").get("children.length"), 1, "Should have one embedded record");
  equal(env.store.recordForId("comment", "2").get("children.firstObject.body"), "Another", "Should have one embedded record");
});

test("extractSingle with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain')
  });

  env.container.register('adapter:home_planet', DS.ActiveModelAdapter);
  env.container.register('serializer:home_planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'},
      reformedVillains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:home_planet");
  var json_hash = {
    home_planet: {
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        first_name: "Tom"
      }, {
        id: "3",
        first_name: "Yehuda"
      }],
      reformed_villains: [{
        id: "2",
        first_name: "Alex"
      },{
        id: "4",
        first_name: "Erik"
      }]
    }
  };
  var json = serializer.extractSingle(env.store, HomePlanet, json_hash);

  deepEqual(json, {
    id: "1",
    name: "Earth",
    villains: ["1", "3"],
    reformedVillains: ["2", "4"]
  }, "Primary array was correct");

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "2").get("firstName"), "Alex", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "3").get("firstName"), "Yehuda", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "4").get("firstName"), "Erik", "Secondary records found in the store");
});

test("extractArray with embedded objects", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");

  var json_hash = {
    home_planets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }]
  };

  var array = serializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(array, [{
    id: "1",
    name: "Umber",
    villains: ["1"]
  }]);

  env.store.find("superVillain", 1).then(async(function(minion){
    equal(minion.get('firstName'), "Tom");
  }));
});

test("extractArray with embedded objects of same type as primary type", function() {
  env.container.register('adapter:comment', DS.ActiveModelAdapter);
  env.container.register('serializer:comment', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:comment");

  var json_hash = {
    comments: [{
      id: "1",
      body: "Hello",
      root: true,
      children: [{
        id: "2",
        body: "World",
        root: false
      },
      {
        id: "3",
        body: "Foo",
        root: false
      }]
    }]
  };

  var array = serializer.extractArray(env.store, Comment, json_hash);

  deepEqual(array, [{
    id: "1",
    body: "Hello",
    root: true,
    children: ["2", "3"]
  }], "Primary array is correct");

  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary record found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary record found in the store");
});

test("extractArray with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain')
  });

  env.container.register('adapter:homePlanet', DS.ActiveModelAdapter);
  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'},
      reformedVillains: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
  var json_hash = {
    home_planets: [{
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        first_name: "Tom"
      },{
        id: "3",
        first_name: "Yehuda"
      }],
      reformed_villains: [{
        id: "2",
        first_name: "Alex"
      },{
        id: "4",
        first_name: "Erik"
      }]
    },{
      id: "2",
      name: "Mars",
      villains: [{
        id: "1",
        first_name: "Tom"
      },{
        id: "3",
        first_name: "Yehuda"
      }],
      reformed_villains: [{
        id: "5",
        first_name: "Peter"
      },{
        id: "6",
        first_name: "Trek"
      }]
    }]
  };
  var json = serializer.extractArray(env.store, HomePlanet, json_hash);

  deepEqual(json, [{
    id: "1",
    name: "Earth",
    villains: ["1", "3"],
    reformedVillains: ["2", "4"]
  },{
    id: "2",
    name: "Mars",
    villains: ["1", "3"],
    reformedVillains: ["5", "6"]
  }], "Primary array was correct");

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "2").get("firstName"), "Alex", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "3").get("firstName"), "Yehuda", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "4").get("firstName"), "Erik", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "5").get("firstName"), "Peter", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "6").get("firstName"), "Trek", "Secondary records found in the store");
});

test("serialize with embedded objects", function() {
  league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
  var tom = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league });

  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:homePlanet");

  var json = serializer.serialize(league);

  deepEqual(json, {
    name: "Villain League",
    villains: [{
      id: get(tom, "id"),
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: get(league, "id")
    }]
  });
});