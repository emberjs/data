var get = Ember.get;
var HomePlanet, SuperVillain, EvilMinion, SecretLab, SecretWeapon, Comment,
  league, superVillain, evilMinion, secretWeapon, homePlanet, secretLab, env;
var indexOf = Ember.EnumerableUtils.indexOf;
var run = Ember.run;
var LightSaber;

module("integration/embedded_records_mixin - EmbeddedRecordsMixin", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo("homePlanet", {inverse: 'villains'}),
      secretLab:       DS.belongsTo("secretLab"),
      secretWeapons:   DS.hasMany("secretWeapon"),
      evilMinions:     DS.hasMany("evilMinion")
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('superVillain', {inverse: 'homePlanet'})
    });
    SecretLab = DS.Model.extend({
      minionCapacity:  DS.attr('number'),
      vicinity:        DS.attr('string'),
      superVillain:    DS.belongsTo('superVillain')
    });
    SecretWeapon = DS.Model.extend({
      name:            DS.attr('string'),
      superVillain:    DS.belongsTo('superVillain')
    });
    LightSaber = SecretWeapon.extend({
      color:           DS.attr('string')
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('superVillain'),
      name:            DS.attr('string')
    });
    Comment = DS.Model.extend({
      body:            DS.attr('string'),
      root:            DS.attr('boolean'),
      children:        DS.hasMany('comment')
    });
    env = setupStore({
      superVillain:    SuperVillain,
      homePlanet:      HomePlanet,
      secretLab:       SecretLab,
      secretWeapon:    SecretWeapon,
      lightSaber:      LightSaber,
      evilMinion:      EvilMinion,
      comment:         Comment
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('secretLab');
    env.store.modelFor('secretWeapon');
    env.store.modelFor('lightSaber');
    env.store.modelFor('evilMinion');
    env.store.modelFor('comment');
    env.container.register('serializer:application', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
    env.container.register('serializer:-active-model',         DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
    env.container.register('adapter:-active-model',    DS.ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:-active-model");
    env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("extractSingle/pushIntoStore with embedded objects", function() {
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
  var json, loaded_record;

  run(function(){
    json = serializer.extractSingle(env.store, HomePlanet, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, HomePlanet, json);
  });
  
  equal(loaded_record.get('name'), "Umber", "loaded_record.name is correct");
  deepEqual(loaded_record.get('villains').mapBy('id'), ["1"], "loaded_record.villains is correct");
  
  run(function(){
    env.store.find("homePlanet", 1).then(function(homePlanet) {
      equal(homePlanet.get('name'), "Umber", "store#find - homePlanet.name is correct");
      deepEqual(homePlanet.get('villains').mapBy('id'), ["1"], "store#find - homePlanet.villains is correct");
    });
  });
  
  run(function(){
    env.store.find("superVillain", 1).then(function(minion) {
      equal(minion.get('firstName'), "Tom");
    });
  });
});

test("extractSingle/pushIntoStore with embedded objects inside embedded objects", function() {
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
  var json, loaded_record;

  run(function(){
    json = serializer.extractSingle(env.store, HomePlanet, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, HomePlanet, json);
  });
  

  equal(loaded_record.get('name'), "Umber", "loaded_record.name is correct");
  deepEqual(loaded_record.get('villains').mapBy('id'), ["1"], "loaded_record.villains is correct");
  
  run(function(){
    env.store.find("homePlanet", 1).then(function(homePlanet) {
      equal(homePlanet.get('name'), "Umber", "store#find - homePlanet.name is correct");
      deepEqual(homePlanet.get('villains').mapBy('id'), ["1"], "store#find - homePlanet.villains is correct");
    });
  });

  run(function(){
    env.store.find("superVillain", 1).then(function(villain) {
      equal(villain.get('firstName'), "Tom");
      equal(villain.get('evilMinions.length'), 1, "Should load the embedded child");
      equal(villain.get('evilMinions.firstObject.name'), "Alex", "Should load the embedded child");
    });
    env.store.find("evilMinion", 1).then(function(minion) {
      equal(minion.get('name'), "Alex");
    });
  });
});

test("extractSingle/pushIntoStore with embedded objects of same type", function() {
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
  var json, loaded_record;
  
  run(function(){
    json = serializer.extractSingle(env.store, Comment, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, Comment, json);
  });
  
  equal(loaded_record.get('body'), "Hello", "loaded_record.body is correct");
  equal(loaded_record.get('root'), true, "loaded_record.root is correct");
  deepEqual(loaded_record.get('children').mapBy('id'), ["2", "3"], "loaded_record.children is correct");
  
  run(function(){
    env.store.find("comment", 1).then(function(comment) {
      equal(comment.get('body'), "Hello", "store#find - comment.body is correct");
      equal(comment.get('root'), true, "store#find - comment.root is correct");
      deepEqual(comment.get('children').mapBy('id'), ["2", "3"], "store#find - comment.children is correct");
    });
  });
  
  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
});

test("extractSingle/pushIntoStore with embedded objects inside embedded objects of same type", function() {
  Comment.reopen({
    //TODO: investigate this bug in more detail
    
    // before pushing the primary record into the store (which was not done
    //  in the previous version of this test) the data looks like this:
    // comment[1].children.length = 2
    // comment[2].children.length = 1
    
    // after pushing the primary record into the store - loaded_record = serializer.pushIntoStore(env.store, Comment, json);
    // the data looks like this:
    // comment[1].children.length = 2
    // comment[2].children.length = 2
    
    // store.js/DS.Store#push
    // -  store.js/setupRelationships
    // - -  relationship.js/Relationship#updateRecordsFromAdapter
    // - - -  relationship.js/ManyRelationship#computeChanges
    // this bug occurs between the start and end of the computeChanges function
    
    // why does Relationship#updateRecordsFromAdapter reference this.computeChanges
    // computeChanges is only defined on ManyRelationship not BelongsTo relationship
    
    //TODO: make this pass without inverse:null (fix related bug)
    children: DS.hasMany('comment',{inverse: null})
  })
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
  var json, loaded_record;
  
  run(function(){
    json = serializer.extractSingle(env.store, Comment, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, Comment, json);
  });


  equal(loaded_record.get('body'), "Hello", "loaded_record.body is correct");
  equal(loaded_record.get('root'), true, "loaded_record.root is correct");
  deepEqual(loaded_record.get('children').mapBy('id'), ["2", "3"], "loaded_record.children is correct");
  
  run(function(){
    env.store.find("comment", 1).then(function(comment) {
      equal(comment.get('body'), "Hello", "store#find - comment.body is correct");
      equal(comment.get('root'), true, "store#find - comment.root is correct");
      deepEqual(comment.get('children').mapBy('id'), ["2", "3"], "store#find - comment.children is correct");
    });
  });
  
  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "4").get("body"), "Another", "Secondary records found in the store");
  equal(env.store.recordForId("comment", "2").get("children.length"), 1, "Should have one embedded record");
  equal(env.store.recordForId("comment", "2").get("children.firstObject.body"), "Another", "Should have one embedded record");
});

test("extractSingle/pushIntoStore with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', {inverse: null})
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
  
  var json,loaded_record;
  
  run(function(){
    json = serializer.extractSingle(env.store, HomePlanet, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, HomePlanet, json);
  });

  equal(loaded_record.get('name'), "Earth", "loaded_record.name is correct");
  deepEqual(loaded_record.get('villains').mapBy('id'), ["1", "3"], "loaded_record.villains is correct");
  deepEqual(loaded_record.get('reformedVillains').mapBy('id'), ["2", "4"], "loaded_record.reformedVillains is correct");
  
  run(function(){
    env.store.find("homePlanet", 1).then(function(homePlanet) {
      equal(homePlanet.get('name'), "Earth", "store#find - homePlanet.name is correct");
      deepEqual(homePlanet.get('villains').mapBy('id'), ["1", "3"], "store#find - homePlanet.villains is correct");
      deepEqual(homePlanet.get('reformedVillains').mapBy('id'), ["2", "4"], "store#find - homePlanet.reformedVillains is correct");
    });
  });

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "2").get("firstName"), "Alex", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "3").get("firstName"), "Yehuda", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "4").get("firstName"), "Erik", "Secondary records found in the store");
});

test("extractArray/pushManyIntoStore with embedded objects", function() {
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
  var array, loaded_records;

  run(function(){
    array = serializer.extractArray(env.store, HomePlanet, json_hash);
    loaded_records = serializer.pushManyIntoStore(env.store, HomePlanet, array);
  });

  equal(loaded_records[0].get('id'), "1", "loaded_record[0].name is correct");
  equal(loaded_records[0].get('name'), "Umber", "loaded_record[0].name is correct");
  deepEqual(loaded_records[0].get('villains').mapBy('id'), ["1"], "loaded_record[0].villains is correct");

  run(function(){
    env.store.find("superVillain", 1).then(function(minion){
      equal(minion.get('firstName'), "Tom");
    });
  });
});

test("extractArray/pushManyIntoStore with embedded objects with custom primary key", function() {
  expect(4);
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend({
    primaryKey: 'villain_id'
  }));
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
        villain_id: "1",
        first_name: "Alex",
        last_name: "Baizeau"
      }]
    }]
  };
  var array, loaded_records;

  run(function(){
    array = serializer.extractArray(env.store, HomePlanet, json_hash);
    loaded_records = serializer.pushManyIntoStore(env.store, HomePlanet, array);
  });

  equal(loaded_records[0].get('id'), "1", "loaded_record[0].name is correct");
  equal(loaded_records[0].get('name'), "Umber", "loaded_record[0].name is correct");
  deepEqual(loaded_records[0].get('villains').mapBy('id'), ["1"], "loaded_record[0].villains is correct");
  
  run(function(){
    return env.store.find("superVillain", 1).then(function(minion){
      env.container.unregister('serializer:superVillain');
      equal(minion.get('firstName'), "Alex");
    });
  });
});
test("extractArray/pushManyIntoStore with embedded objects with identical relationship and attribute key ", function() {
  expect(4);
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    },
    //Makes the keyForRelationship and keyForAttribute collide.
    keyForRelationship: function(key, type) {
      return this.keyForAttribute(key, type);
    }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");

  var json_hash = {
    home_planets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Alex",
        last_name: "Baizeau"
      }]
    }]
  };
  var array;

  run(function(){
    array = serializer.extractArray(env.store, HomePlanet, json_hash);
    loaded_records = serializer.pushManyIntoStore(env.store, HomePlanet, array);
  });
  
  equal(loaded_records[0].get('id'), "1", "loaded_record[0].name is correct");
  equal(loaded_records[0].get('name'), "Umber", "loaded_record[0].name is correct");
  deepEqual(loaded_records[0].get('villains').mapBy('id'), ["1"], "loaded_record[0].villains is correct");

  run(function(){
    env.store.find("superVillain", 1).then(function(minion){
      equal(minion.get('firstName'), "Alex");
    });
  });
});
test("extractArray/pushManyIntoStore with embedded objects of same type as primary type", function() {
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
  var array, loaded_records;

  run(function(){
    array = serializer.extractArray(env.store, Comment, json_hash);
    loaded_records = serializer.pushManyIntoStore(env.store, Comment, array);
  });
  
  equal(loaded_records[0].get('id'), "1", "loaded_records[0].id is correct");
  equal(loaded_records[0].get('body'), "Hello", "loaded_records[0].body is correct");
  equal(loaded_records[0].get('root'), true, "loaded_records[0].root is correct");
  deepEqual(loaded_records[0].get('children').mapBy('id'), ["2","3"], "loaded_records[0].children is correct");

  equal(env.store.recordForId("comment", "2").get("body"), "World", "Secondary record found in the store");
  equal(env.store.recordForId("comment", "3").get("body"), "Foo", "Secondary record found in the store");
});

test("extractArray/pushManyIntoStore with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    //TODO: investigate this bug in more detail
    //TODO: make this pass without inverse:null (fix related bug)
    villains: DS.hasMany('superVillain',{inverse: null}),
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
  var json, loaded_records;
  run(function(){
    json = serializer.extractArray(env.store, HomePlanet, json_hash);
    loaded_records = serializer.pushManyIntoStore(env.store, HomePlanet, json);
  });
  
  equal(loaded_records[0].get('id'), "1", "loaded_records[0].id is correct");
  equal(loaded_records[0].get('name'), "Earth", "loaded_records[0].name is correct");
  deepEqual(loaded_records[0].get('villains').mapBy('id'), ["1", "3"], "loaded_records[0].villains is correct");
  deepEqual(loaded_records[0].get('reformedVillains').mapBy('id'), ["2", "4"], "loaded_records[0].reformedVillains is correct");
  
  equal(loaded_records[1].get('id'), "2", "loaded_records[1].id is correct");
  equal(loaded_records[1].get('name'), "Mars", "loaded_records[1].name is correct");
  deepEqual(loaded_records[1].get('villains').mapBy('id'), ["1", "3"], "loaded_records[1].villains is correct");
  deepEqual(loaded_records[1].get('reformedVillains').mapBy('id'), ["5", "6"], "loaded_records[1].reformedVillains is correct");

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "2").get("firstName"), "Alex", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "3").get("firstName"), "Yehuda", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "4").get("firstName"), "Erik", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "5").get("firstName"), "Peter", "Secondary records found in the store");
  equal(env.store.recordForId("superVillain", "6").get("firstName"), "Trek", "Secondary records found in the store");
});

test("serialize supports serialize:false on non-relationship properties", function() {
  var tom;
  run(function(){
    tom = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", id: '1' });
  });

  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      firstName: {serialize: false}
    }
  }));
  var serializer, json;
  run(function(){
    serializer = env.container.lookup("serializer:superVillain");
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    last_name: "Dale",
    home_planet_id: null,
    secret_lab_id: null
  });
});

test("serialize with embedded objects (hasMany relationship)", function() {
  var tom, league;
  run(function(){
    league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
    tom = env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });
  });

  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    }
  }));

  var serializer, json;
  run(function(){
    serializer = env.container.lookup("serializer:homePlanet");

    json = serializer.serialize(league);
  });

  deepEqual(json, {
    name: "Villain League",
    villains: [{
      id: get(tom, "id"),
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: get(league, "id"),
      secret_lab_id: null
    }]
  });
});

test("serialize with embedded objects (hasMany relationship) supports serialize:false", function() {
  run(function(){
    league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
    env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });
  });

  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {serialize: false}
    }
  }));
  var serializer, json;
  run(function(){
    serializer = env.container.lookup("serializer:homePlanet");

    json = serializer.serialize(league);
  });

  deepEqual(json, {
    name: "Villain League"
  });
});

test("serialize with (new) embedded objects (hasMany relationship)", function() {
  run(function(){
    league = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
    env.store.createRecord(SuperVillain, { firstName: "Tom", lastName: "Dale", homePlanet: league });
  });

  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: {embedded: 'always'}
    }
  }));
  var serializer, json;
  run(function(){
    serializer = env.container.lookup("serializer:homePlanet");

    json = serializer.serialize(league);
  });
  deepEqual(json, {
    name: "Villain League",
    villains: [{
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: get(league, "id"),
      secret_lab_id: null
    }]
  });
});

test("serialize with embedded objects (hasMany relationships, including related objects not embedded)", function() {
  run(function(){
    superVillain = env.store.createRecord(SuperVillain, { id: 1, firstName: "Super", lastName: "Villian" });
    evilMinion = env.store.createRecord(EvilMinion, { id: 1, name: "Evil Minion", superVillian: superVillain });
    secretWeapon = env.store.createRecord(SecretWeapon, { id: 1, name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
    superVillain.get('secretWeapons').pushObject(secretWeapon);
  });

  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: {serialize: 'records', deserialize: 'records'},
      secretWeapons: {serialize: 'ids'}
    }
  }));
  var serializer, json;
  run(function(){
    serializer = env.container.lookup("serializer:superVillain");

    json = serializer.serialize(superVillain);
  });
  deepEqual(json, {
    first_name: get(superVillain, "firstName"),
    last_name: get(superVillain, "lastName"),
    home_planet_id: null,
    evil_minions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      super_villain_id: "1"
    }],
    secret_lab_id: null,
    secret_weapon_ids: [ "1" ]
  });
});

test("extractSingle/pushIntoStore with embedded object (belongsTo relationship)", function() {
  expect(15);
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));
  
  var serializer = env.container.lookup("serializer:superVillain");

  var json_hash = {
    home_planet: [{
      id: "123",
      name: "Villain League"
    }],
    evil_minion: [{
        id: "1",
        name: "Alex"
      },{
        id: "2",
        name: "James"
      },{
        id: "3",
        name: "John"
    }],
    super_villain: {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      home_planet_id: "123",
      evil_minion_ids: ["1", "2", "3"],
      secret_lab: {
        minion_capacity: 5000,
        vicinity: "California, USA",
        id: "101"
      },
      secret_weapon_ids: []
    }
  };
  var json, loaded_record;

  run(function(){
    json = serializer.extractSingle(env.store, SuperVillain, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, SuperVillain, json);
  });
  
  equal(loaded_record.get('firstName'), "Tom", "loaded_record.firstName is correct");
  equal(loaded_record.get('lastName'), "Dale", "loaded_record.lastName is correct");
  equal(loaded_record.get('homePlanet.id'), "123", "loaded_record.homePlanet is correct");
  equal(loaded_record.get('secretLab.id'), "101", "loaded_record.secretLab is correct");

  deepEqual(loaded_record.get('evilMinions').mapBy('id'), ["1", "2", "3"], "loaded_record.evilMinions is correct");
  equal(loaded_record.get('secretWeapons.length'), 0, "loaded_record.secretWeapons is empty"); 
  
  run(function() {
    env.store.find("superVillain", "1").then(function(superVillain) {
      equal(superVillain.get('firstName'), "Tom", "store#find - superVillain.firstName is correct");
      equal(superVillain.get('lastName'), "Dale", "store#find - superVillain.lastName is correct");
      equal(superVillain.get('homePlanet.id'), "123", "store#find - superVillain.homePlanet is correct");
      equal(superVillain.get('secretLab.id'), "101", "store#find - superVillain.secretLab is correct");
    
      deepEqual(superVillain.get('evilMinions').mapBy('id'), ["1", "2", "3"], "store#find - superVillain.evilMinions is correct");
      equal(superVillain.get('secretWeapons.length'), 0, "store#find - superVillain.secretWeapons is empty");   
    });
  });

  run(function(){
    env.store.find("secretLab", 101).then(function(secretLab) {
      equal(secretLab.get('id'), '101');
      equal(secretLab.get('minionCapacity'), 5000);
      equal(secretLab.get('vicinity'), 'California, USA');
    });
  });
});

test("serialize with embedded object (belongsTo relationship)", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));
  var serializer, json, tom;
  run(function(){
    serializer = env.container.lookup("serializer:superVillain");

    // records with an id, persisted

    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: {
      id: get(tom, "secretLab").get("id"),
      minion_capacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (belongsTo relationship) works with different primaryKeys", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    primaryKey: '_id',
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));
  env.container.register('serializer:secretLab', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    primaryKey: 'crazy_id'
  }));

  var serializer = env.container.lookup("serializer:superVillain");

  // records with an id, persisted
  var tom, json;

  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: {
      crazy_id: get(tom, "secretLab").get("id"),
      minion_capacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (belongsTo relationship, new no id)", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:superVillain");

  // records without ids, new
  var tom, json;

  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: {
      minion_capacity: get(tom, "secretLab").get("minionCapacity"),
      vicinity: get(tom, "secretLab").get("vicinity")
    }
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:ids", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {serialize: 'ids'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  // records with an id, persisted
  var tom, json;

  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {serialize: 'id'}
    }
  }));

  var serializer = env.container.lookup("serializer:superVillain");

  // records with an id, persisted
  var tom, json;

  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:false", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {serialize: false}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  // records with an id, persisted
  var tom, json;
  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) serializes the id by default if no option specified", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
  var serializer = env.container.lookup("serializer:superVillain");

  // records with an id, persisted

  var tom, json;

  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("when related record is not present, serialize embedded record (with a belongsTo relationship) as null", function() {
  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");
  var tom, json;

  run(function(){
    tom = env.store.createRecord(
      SuperVillain,
      { firstName: "Tom", lastName: "Dale", id: "1",
        homePlanet: env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" })
      }
    );
  });

  run(function(){
    json = serializer.serialize(tom);
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: null
  });
});

test("extractSingle/pushIntoStore with multiply-nested belongsTo", function() {
  env.container.register('adapter:evilMinion', DS.ActiveModelAdapter);
  env.container.register('serializer:evilMinion', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: {embedded: 'always'}
    }
  }));
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: {embedded: 'always'}
    }
  }));

  var serializer = env.container.lookup("serializer:evilMinion");
  var json_hash = {
    evil_minion: {
      id: "1",
      name: "Alex",
      super_villain: {
        id: "1",
        first_name: "Tom",
        last_name: "Dale",
        evil_minion_ids: ["1"],
        home_planet: {
          id: "1",
          name: "Umber",
          super_villain_ids: ["1"]
        }
      }
    }
  };
  var json, loaded_record;

  run(function(){
    json = serializer.extractSingle(env.store, EvilMinion, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, EvilMinion, json);
  });
  
  equal(loaded_record.get('name'), "Alex", "loaded_record.name is correct");
  equal(loaded_record.get('superVillain.id'), "1", "loaded_record.superVillain.id is correct");
  
  run(function() {
    env.store.find("evilMinion", "1").then(function(evilMinion) {
      equal(evilMinion.get('name'), "Alex", "store#find - evilMinion.name is correct");
      equal(evilMinion.get('superVillain.id'), "1", "store#find - evilMinion.superVillain.id is correct");
    });
  });

  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary record, Tom, found in the steore");
  equal(env.store.recordForId("homePlanet", "1").get("name"), "Umber", "Nested Secondary record, Umber, found in the store");
});

test("extractSingle/pushIntoStore with polymorphic hasMany", function() {
  SuperVillain.reopen({
    secretWeapons: DS.hasMany("secretWeapon", {polymorphic: true})
  });

  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapons: {embedded: 'always'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  var json_hash = {
    super_villain: {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      secret_weapons: [
        {
          id: "1",
          type: "LightSaber",
          name: "Tom's LightSaber",
          color: "Red"
        },
        {
          id: "1",
          type: "SecretWeapon",
          name: "The Death Star"
        }
      ]
    }
  };
  var json, loaded_record;

  run(function(){
    json = serializer.extractSingle(env.store, SuperVillain, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, SuperVillain, json);
  });

  equal(loaded_record.get('firstName'), "Tom", "loaded_record.firstName is correct");
  equal(loaded_record.get('lastName'), "Dale", "loaded_record.lastName is correct");
    
  var secretWeapons = loaded_record.get('secretWeapons').map(function(secretWeapon) {
    return { id: secretWeapon.get('id'), type: secretWeapon.constructor.typeKey };
  });
  
  deepEqual(secretWeapons, [ {id: "1", type: "lightSaber"}, {id: "1", type: "secretWeapon"} ], "loaded_record.secretWeapons is correct");  
  
  run(function() {
    
    env.store.find("superVillain", "1").then(function(superVillain) {
      equal(superVillain.get('firstName'), "Tom", "store#find - superVillain.firstName is correct");
      equal(superVillain.get('lastName'), "Dale", "store#find - superVillain.lastName is correct");
      
      var secretWeapons = superVillain.get('secretWeapons').map(function(secretWeapon) {
        return { id: secretWeapon.get('id'), type: secretWeapon.constructor.typeKey };
      });
      
      deepEqual(secretWeapons, [ {id: "1", type: "lightSaber"}, {id: "1", type: "secretWeapon"} ], "store#find - superVillain.secretWeapons is correct");
    });
  });
  
  equal(env.store.recordForId("secretWeapon", "1").get("name"), "The Death Star", "Embedded polymorphic SecretWeapon found");
  equal(env.store.recordForId("lightSaber", "1").get("name"), "Tom's LightSaber", "Embedded polymorphic LightSaber found");


});

test("Mixin can be used with RESTSerializer which does not define keyForAttribute", function() {
  run(function(){
    homePlanet = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
    secretLab = env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" });
    superVillain = env.store.createRecord(SuperVillain, {
      id: "1", firstName: "Super", lastName: "Villian", homePlanet: homePlanet, secretLab: secretLab
    });
    secretWeapon = env.store.createRecord(SecretWeapon, { id: "1", name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('secretWeapons').pushObject(secretWeapon);
    evilMinion = env.store.createRecord(EvilMinion, { id: "1", name: "Evil Minion", superVillian: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
  });

  env.container.register('serializer:evilMinion', DS.RESTSerializer);
  env.container.register('serializer:secretWeapon', DS.RESTSerializer);
  env.container.register('serializer:superVillain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: {serialize: 'records', deserialize: 'records'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");
  var json;

  run(function(){
    json = serializer.serialize(superVillain);
  });

  deepEqual(json, {
    firstName: get(superVillain, "firstName"),
    lastName: get(superVillain, "lastName"),
    homePlanet: "123",
    evilMinions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      superVillain: "1"
    }],
    secretLab: "101"
    // "manyToOne" relation does not serialize ids
    // sersecretWeapons: ["1"]
  });
});

test("extractSingle/pushIntoStore with custom belongsTo primary key", function() {
  env.container.register('adapter:evilMinion', DS.ActiveModelAdapter);
  env.container.register('serializer:evilMinion', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: {embedded: 'always'}
    }
  }));
  env.container.register('serializer:superVillain', DS.ActiveModelSerializer.extend({
    primaryKey: 'custom'
  }));

  var serializer = env.container.lookup("serializer:evilMinion");
  var json_hash = {
    evil_minion: {
      id: "1",
      name: "Alex",
      super_villain: {
        custom: "1",
        first_name: "Tom",
        last_name: "Dale"
      }
    }
  };
  var json, loaded_record;

  run(function(){
    json = serializer.extractSingle(env.store, EvilMinion, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, EvilMinion, json);
  });
  
  equal(loaded_record.get('name'), "Alex", "loaded_record.name is correct");
  equal(loaded_record.get('superVillain.id'), "1", "loaded_record.superVillain.id is correct");
  
  run(function(){
    env.store.find("evilMinion", 1).then(function(evilMinion) {
      equal(evilMinion.get('name'), "Alex", "store#find - evilMinion.name is correct");
      equal(evilMinion.get('superVillain.id'), "1", "store#find - evilMinion.superVillain.id is correct");
    });
  });
  
  equal(env.store.recordForId("superVillain", "1").get("firstName"), "Tom", "Secondary record, Tom, found in the steore");
});

test("serializing relationships with an embedded and without calls super when not attr not present", function() {
  run(function(){
    homePlanet = env.store.createRecord(HomePlanet, { name: "Villain League", id: "123" });
    secretLab = env.store.createRecord(SecretLab, { minionCapacity: 5000, vicinity: "California, USA", id: "101" });
    superVillain = env.store.createRecord(SuperVillain, {
      id: "1", firstName: "Super", lastName: "Villian", homePlanet: homePlanet, secretLab: secretLab
    });
    secretWeapon = env.store.createRecord(SecretWeapon, { id: "1", name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('secretWeapons').pushObject(secretWeapon);
    evilMinion = env.store.createRecord(EvilMinion, { id: "1", name: "Evil Minion", superVillian: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
  });

  var calledSerializeBelongsTo = false, calledSerializeHasMany = false;

  var Serializer = DS.RESTSerializer.extend({
    serializeBelongsTo: function(record, json, relationship) {
      calledSerializeBelongsTo = true;
      return this._super(record, json, relationship);
    },
    serializeHasMany: function(record, json, relationship) {
      calledSerializeHasMany = true;
      var key = relationship.key;
      var payloadKey = this.keyForRelationship ? this.keyForRelationship(key, "hasMany") : key;
      var relationshipType = record.constructor.determineRelationshipType(relationship);
      // "manyToOne" not supported in DS.RESTSerializer.prototype.serializeHasMany
      var relationshipTypes = Ember.String.w('manyToNone manyToMany manyToOne');
      if (indexOf(relationshipTypes, relationshipType) > -1) {
        json[payloadKey] = get(record, key).mapBy('id');
      }
    }
  });
  env.container.register('serializer:evilMinion', Serializer);
  env.container.register('serializer:secretWeapon', Serializer);
  env.container.register('serializer:superVillain', Serializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: {serialize: 'records', deserialize: 'records'}
      // some relationships are not listed here, so super should be called on those
      // e.g. secretWeapons: {serialize: 'ids'}
    }
  }));
  var serializer = env.container.lookup("serializer:superVillain");

  var json;
  run(function(){
    json = serializer.serialize(superVillain);
  });

  deepEqual(json, {
    firstName: get(superVillain, "firstName"),
    lastName: get(superVillain, "lastName"),
    homePlanet: "123",
    evilMinions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      superVillain: "1"
    }],
    secretLab: "101",
    // customized serializeHasMany method to generate ids for "manyToOne" relation
    secretWeapons: ["1"]
  });
  ok(calledSerializeBelongsTo);
  ok(calledSerializeHasMany);
});


test("embedded records should be created in multiple stores", function() {

  env.container.register('store:primary', DS.Store.extend({ isCustom: true }));
  env.container.register('store:secondary', DS.Store.extend({ isCustom: true }));

  env.primaryStore = env.container.lookup('store:primary');
  env.secondaryStore = env.container.lookup('store:primary');

  env.container.register('adapter:superVillain', DS.ActiveModelAdapter);
  env.container.register('adapter:homePlanet', DS.ActiveModelAdapter);

  env.container.register('serializer:homePlanet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
  attrs: {
    villains: {embedded: 'always'}
  }
  }));

  var serializer = env.container.lookup("serializer:homePlanet");
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
  var loaded_record, loaded_record_primary, loaded_record_secondary;

  run(function(){
    json = serializer.extractSingle(env.store, HomePlanet, json_hash);
    loaded_record = serializer.pushIntoStore(env.store, HomePlanet, json);
  });
  
  equal(env.store.hasRecordForId("superVillain","1"), true, "superVillain should exist in store:main");

  run(function(){
    json_primary = serializer.extractSingle(env.primaryStore, HomePlanet, json_hash_primary);
    loaded_record_primary = serializer.pushIntoStore(env.primaryStore, HomePlanet, json_primary);
  });
  
  equal(env.primaryStore.hasRecordForId("superVillain","1"), true, "superVillain should exist in store:primary");

  run(function(){
    json_secondary = serializer.extractSingle(env.secondaryStore, HomePlanet, json_hash_secondary);
    loaded_record_secondary = serializer.pushIntoStore(env.secondaryStore, HomePlanet, json_secondary);
  });
  
  equal(env.primaryStore.hasRecordForId("superVillain","1"), true, "superVillain should exist in store:secondary");

});