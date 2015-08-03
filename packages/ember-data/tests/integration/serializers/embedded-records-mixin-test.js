var get = Ember.get;
var HomePlanet, SuperVillain, EvilMinion, SecretLab, SecretWeapon, BatCave, Comment,
  league, superVillain, evilMinion, secretWeapon, homePlanet, secretLab, env;
var run = Ember.run;
var LightSaber;

module("integration/embedded_records_mixin - EmbeddedRecordsMixin", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo('home-planet', { inverse: 'villains', async: true }),
      secretLab:       DS.belongsTo('secret-lab', { async: false }),
      secretWeapons:   DS.hasMany('secret-weapon', { async: false }),
      evilMinions:     DS.hasMany('evil-minion', { async: false })
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('super-villain', { inverse: 'homePlanet', async: false })
    });
    SecretLab = DS.Model.extend({
      minionCapacity:  DS.attr('number'),
      vicinity:        DS.attr('string'),
      superVillain:    DS.belongsTo('super-villain', { async: false })
    });
    BatCave = SecretLab.extend({
      infiltrated:     DS.attr('boolean')
    });
    SecretWeapon = DS.Model.extend({
      name:            DS.attr('string'),
      superVillain:    DS.belongsTo('super-villain', { async: false })
    });
    LightSaber = SecretWeapon.extend({
      color:           DS.attr('string')
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('super-villain', { async: false }),
      name:            DS.attr('string')
    });
    Comment = DS.Model.extend({
      body:            DS.attr('string'),
      root:            DS.attr('boolean'),
      children:        DS.hasMany('comment', { inverse: null, async: false })
    });
    env = setupStore({
      superVillain:    SuperVillain,
      homePlanet:      HomePlanet,
      secretLab:       SecretLab,
      batCave:         BatCave,
      secretWeapon:    SecretWeapon,
      lightSaber:      LightSaber,
      evilMinion:      EvilMinion,
      comment:         Comment
    });
    env.store.modelFor('super-villain');
    env.store.modelFor('home-planet');
    env.store.modelFor('secret-lab');
    env.store.modelFor('bat-cave');
    env.store.modelFor('secret-weapon');
    env.store.modelFor('light-saber');
    env.store.modelFor('evil-minion');
    env.store.modelFor('comment');
    env.registry.register('serializer:application', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
    env.registry.register('serializer:-active-model', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
    env.registry.register('adapter:-active-model', DS.ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:-active-model");
    env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("normalizeResponse with embedded objects", function() {
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.container.lookup("serializer:home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "2",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "2", "type": "super-villain" }
          ]
        }
      }
    },
    "included": [
      {
        "id": "2",
        "type": "super-villain",
        "attributes": {
          "firstName": "Tom",
          "lastName": "Dale"
        },
        "relationships": {}
      }
    ]
  });
});

test("normalizeResponse with embedded objects inside embedded objects", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:evil-minion', DS.ActiveModelSerializer);

  var serializer = env.container.lookup("serializer:home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "2",
        first_name: "Tom",
        last_name: "Dale",
        evil_minions: [{
          id: "3",
          name: "Alex"
        }]
      }]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "2", "type": "super-villain" }
          ]
        }
      }
    },
    "included": [{
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "evilMinions": {
          "data": [
            { "id": "3", "type": "evil-minion" }
          ]
        }
      }
    }, {
      "id": "3",
      "type": "evil-minion",
      "attributes": {
        "name": "Alex"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects of same type", function() {
  env.registry.register('adapter:comment', DS.ActiveModelAdapter);
  env.registry.register('serializer:comment', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
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
  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, Comment, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "comment",
      "attributes": {
        "body": "Hello",
        "root": true
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "2", "type": "comment" },
            { "id": "3", "type": "comment" }
          ]
        }
      }
    },
    "included": [{
      "id": "2",
      "type": "comment",
      "attributes": {
        "body": "World",
        "root": false
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "comment",
      "attributes": {
        "body": "Foo",
        "root": false
      },
      "relationships": {}
    }]
  }, "Primary record was correct");
});

test("normalizeResponse with embedded objects inside embedded objects of same type", function() {
  env.registry.register('adapter:comment', DS.ActiveModelAdapter);
  env.registry.register('serializer:comment', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
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
  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, Comment, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "comment",
      "attributes": {
        "body": "Hello",
        "root": true
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "2", "type": "comment" },
            { "id": "3", "type": "comment" }
          ]
        }
      }
    },
    "included": [{
      "id": "2",
      "type": "comment",
      "attributes": {
        "body": "World",
        "root": false
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "4", "type": "comment" }
          ]
        }
      }
    }, {
      "id": "4",
      "type": "comment",
      "attributes": {
        "body": "Another",
        "root": false
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "comment",
      "attributes": {
        "body": "Foo",
        "root": false
      },
      "relationships": {}
    }]
  }, "Primary record was correct");
});

test("normalizeResponse with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', { inverse: null, async: false })
  });

  env.registry.register('adapter:home-planet', DS.ActiveModelAdapter);
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' },
      reformedVillains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer);

  var serializer = env.container.lookup("serializer:home-planet");
  var json_hash = {
    homePlanet: {
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
  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Earth"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" },
            { "id": "3", "type": "super-villain" }
          ]
        },
        "reformedVillains": {
          "data": [
            { "id": "2", "type": "super-villain" },
            { "id": "4", "type": "super-villain" }
          ]
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom"
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "super-villain",
      "attributes": {
        "firstName": "Yehuda"
      },
      "relationships": {}
    }, {
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex"
      },
      "relationships": {}
    }, {
      "id": "4",
      "type": "super-villain",
      "attributes": {
        "firstName": "Erik"
      },
      "relationships": {}
    }]
  }, "Primary hash was correct");
});

test("normalizeResponse with embedded objects", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer);

  var serializer = env.container.lookup("serializer:home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        first_name: "Tom",
        last_name: "Dale"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
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
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects with custom primary key", function() {
  expect(1);
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend({
    primaryKey: 'villain_id'
  }));
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.container.lookup("serializer:home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        villain_id: "2",
        first_name: "Alex",
        last_name: "Baizeau"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "2", "type": "super-villain" }
          ]
        }
      }
    }],
    "included": [{
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex",
        "lastName": "Baizeau"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects with identical relationship and attribute key ", function() {
  expect(1);
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    },
    //Makes the keyForRelationship and keyForAttribute collide.
    keyForRelationship: function(key, type) {
      return this.keyForAttribute(key, type);
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer);

  var serializer = env.container.lookup("serializer:home-planet");

  var json_hash = {
    homePlanets: [{
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

  run(function() {
    array = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
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
        "firstName": "Alex",
        "lastName": "Baizeau"
      },
      "relationships": {}
    }]
  });
});

test("normalizeResponse with embedded objects of same type as primary type", function() {
  env.registry.register('adapter:comment', DS.ActiveModelAdapter);
  env.registry.register('serializer:comment', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
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
  var array;

  run(function() {
    array = serializer.normalizeResponse(env.store, Comment, json_hash, null, 'findAll');
  });

  deepEqual(array, {
    "data": [{
      "id": "1",
      "type": "comment",
      "attributes": {
        "body": "Hello",
        "root": true
      },
      "relationships": {
        "children": {
          "data": [
            { "id": "2", "type": "comment" },
            { "id": "3", "type": "comment" }
          ]
        }
      }
    }],
    "included": [{
      "id": "2",
      "type": "comment",
      "attributes": {
        "body": "World",
        "root": false
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "comment",
      "attributes": {
        "body": "Foo",
        "root": false
      },
      "relationships": {}
    }]
  }, "Primary array is correct");
});

test("normalizeResponse with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', { async: false })
  });

  env.registry.register('adapter:home-planet', DS.ActiveModelAdapter);
  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' },
      reformedVillains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer);

  var serializer = env.container.lookup("serializer:home-planet");
  var json_hash = {
    homePlanets: [{
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

  var json;
  run(function() {
    json = serializer.normalizeResponse(env.store, HomePlanet, json_hash, null, 'findAll');
  });

  deepEqual(json, {
    "data": [{
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Earth"
      },
      "relationships": {
        "reformedVillains": {
          "data": [
            { "id": "2", "type": "super-villain" },
            { "id": "4", "type": "super-villain" }
          ]
        },
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" },
            { "id": "3", "type": "super-villain" }
          ]
        }
      }
    }, {
      "id": "2",
      "type": "home-planet",
      "attributes": {
        "name": "Mars"
      },
      "relationships": {
        "reformedVillains": {
          "data": [
            { "id": "5", "type": "super-villain" },
            { "id": "6", "type": "super-villain" }
          ]
        },
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" },
            { "id": "3", "type": "super-villain" }
          ]
        }
      }
    }],
    "included": [{
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom"
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "super-villain",
      "attributes": {
        "firstName": "Yehuda"
      },
      "relationships": {}
    }, {
      "id": "2",
      "type": "super-villain",
      "attributes": {
        "firstName": "Alex"
      },
      "relationships": {}
    }, {
      "id": "4",
      "type": "super-villain",
      "attributes": {
        "firstName": "Erik"
      },
      "relationships": {}
    }, {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom"
      },
      "relationships": {}
    }, {
      "id": "3",
      "type": "super-villain",
      "attributes": {
        "firstName": "Yehuda"
      },
      "relationships": {}
    }, {
      "id": "5",
      "type": "super-villain",
      "attributes": {
        "firstName": "Peter"
      },
      "relationships": {}
    }, {
      "id": "6",
      "type": "super-villain",
      "attributes": {
        "firstName": "Trek"
      },
      "relationships": {}
    }]
  }, "Primary array was correct");
});

test("serialize supports serialize:false on non-relationship properties", function() {
  var tom;
  run(function() {
    tom = env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", id: '1' });
  });

  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      firstName: { serialize: false }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:super-villain");
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    last_name: "Dale",
    home_planet_id: null,
    secret_lab_id: null
  });
});

test("serialize with embedded objects (hasMany relationship)", function() {
  var tom, league;
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    tom = env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league, id: '1' });
  });

  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:home-planet");

    json = serializer.serialize(league._createSnapshot());
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

test("serialize with embedded objects (unknown hasMany relationship)", function() {
  var league;
  run(function() {
    league = env.store.push('home-planet', { name: "Villain League", id: "123" });
  });

  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer, json;
  warns(function() {
    run(function() {
      serializer = env.container.lookup("serializer:home-planet");
      json = serializer.serialize(league._createSnapshot());
    });
  }, /The embedded relationship 'villains' is undefined for 'home-planet' with id '123'. Please include it in your original payload./);

  deepEqual(json, {
    name: "Villain League",
    villains: []
  });
});

test("serialize with embedded objects (hasMany relationship) supports serialize:false", function() {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    env.store.createRecord('super-villain', { first_name: "Tom", last_name: "Dale", homePlanet: league, id: '1' });
  });

  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { serialize: false }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:home-planet");

    json = serializer.serialize(league._createSnapshot());
  });

  deepEqual(json, {
    name: "Villain League"
  });
});

test("serialize with (new) embedded objects (hasMany relationship)", function() {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    env.store.createRecord('super-villain', { firstName: "Tom", lastName: "Dale", homePlanet: league });
  });

  env.registry.register('serializer:home-planet', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:home-planet");

    json = serializer.serialize(league._createSnapshot());
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
  run(function() {
    superVillain = env.store.createRecord('super-villain', { id: 1, firstName: "Super", lastName: "Villian" });
    evilMinion = env.store.createRecord('evil-minion', { id: 1, name: "Evil Minion", superVillian: superVillain });
    secretWeapon = env.store.createRecord('secret-weapon', { id: 1, name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
    superVillain.get('secretWeapons').pushObject(secretWeapon);
  });

  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { serialize: 'records', deserialize: 'records' },
      secretWeapons: { serialize: 'ids' }
    }
  }));
  var serializer, json;
  run(function() {
    serializer = env.container.lookup("serializer:super-villain");

    json = serializer.serialize(superVillain._createSnapshot());
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
    secret_weapon_ids: ["1"]
  });
});

test("normalizeResponse with embedded object (belongsTo relationship)", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  //env.registry.register('serializer:secret-lab', DS.ActiveModelSerializer);

  var serializer = env.container.lookup("serializer:super-villain");

  var json_hash = {
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
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
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
            { "id": "2", "type": "evil-minion" },
            { "id": "3", "type": "evil-minion" }
          ]
        },
        "homePlanet": {
          "data": { "id": "123", "type": "home-planet" }
        },
        "secretLab": {
          "data": { "id": "101", "type": "secret-lab" }
        },
        "secretWeapons": {
          "data": []
        }
      }
    },
    "included": [{
      "id": "101",
      "type": "secret-lab",
      "attributes": {
        "minionCapacity": 5000,
        "vicinity": "California, USA"
      },
      "relationships": {}
    }]
  });
});

test("serialize with embedded object (belongsTo relationship)", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer, json, tom;
  run(function() {
    serializer = env.container.lookup("serializer:super-villain");

    // records with an id, persisted

    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
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
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    primaryKey: '_id',
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:secret-lab', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    primaryKey: 'crazy_id'
  }));

  var serializer = env.container.lookup("serializer:super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
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
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));

  var serializer = env.container.lookup("serializer:super-villain");

  // records without ids, new
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
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
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'ids' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'id' }
    }
  }));

  var serializer = env.container.lookup("serializer:super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:id in conjunction with deserialize:records", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: 'id', deserialize: 'records' }
    }
  }));

  var serializer = env.container.lookup("serializer:super-villain");

  // records with an id, persisted
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) supports serialize:false", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { serialize: false }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");

  // records with an id, persisted
  var tom, json;
  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id")
  });
});

test("serialize with embedded object (belongsTo relationship) serializes the id by default if no option specified", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin));
  var serializer = env.container.lookup("serializer:super-villain");

  // records with an id, persisted

  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        secretLab: env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" }),
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab_id: get(tom, "secretLab").get("id")
  });
});

test("when related record is not present, serialize embedded record (with a belongsTo relationship) as null", function() {
  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");
  var tom, json;

  run(function() {
    tom = env.store.createRecord(
      'super-villain',
      { firstName: "Tom", lastName: "Dale", id: "1",
        homePlanet: env.store.createRecord('home-planet', { name: "Villain League", id: "123" })
      }
    );
  });

  run(function() {
    json = serializer.serialize(tom._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(tom, "firstName"),
    last_name: get(tom, "lastName"),
    home_planet_id: get(tom, "homePlanet").get("id"),
    secret_lab: null
  });
});

test("normalizeResponse with multiply-nested belongsTo", function() {
  env.registry.register('adapter:evil-minion', DS.ActiveModelAdapter);
  env.registry.register('serializer:evil-minion', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { embedded: 'always' }
    }
  }));

  var serializer = env.container.lookup("serializer:evil-minion");
  var json_hash = {
    evilMinion: {
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
          villain_ids: ["1"]
        }
      }
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, EvilMinion, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "evil-minion",
      "attributes": {
        "name": "Alex"
      },
      "relationships": {
        "superVillain": {
          "data": { "id": "1", "type": "super-villain" }
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
        "evilMinions": {
          "data": [
            { "id": "1", "type": "evil-minion" }
          ]
        },
        "homePlanet": {
          "data": { "id": "1", "type": "home-planet" }
        }
      }
    }, {
      "id": "1",
      "type": "home-planet",
      "attributes": {
        "name": "Umber"
      },
      "relationships": {
        "villains": {
          "data": [
            { "id": "1", "type": "super-villain" }
          ]
        }
      }
    }]
  }, "Primary hash was correct");
});

test("normalizeResponse with polymorphic hasMany", function() {
  SuperVillain.reopen({
    secretWeapons: DS.hasMany("secretWeapon", { polymorphic: true, async: false })
  });

  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapons: { embedded: 'always' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");

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
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findAll');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "secretWeapons": {
          "data": [
            { "id": "1", "type": "light-saber" },
            { "id": "1", "type": "secret-weapon" }
          ]
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "light-saber",
      "attributes": {
        "color": "Red",
        "name": "Tom's LightSaber"
      },
      "relationships": {}
    }, {
      "id": "1",
      "type": "secret-weapon",
      "attributes": {
        "name": "The Death Star"
      },
      "relationships": {}
    }]
  }, "Primary hash was correct");
});

test("normalizeResponse with polymorphic hasMany and custom primary key", function() {
  SuperVillain.reopen({
    secretWeapons: DS.hasMany("secretWeapon", { polymorphic: true, async: false })
  });

  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:light-saber', DS.ActiveModelSerializer.extend({
    primaryKey: 'custom'
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapons: { embedded: 'always' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      secret_weapons: [
        {
          custom: "1",
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
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "id": "1",
      "relationships": {
        "secretWeapons": {
          "data": [
            { "type": "light-saber", "id": "1" },
            { "type": "secret-weapon", "id": "1" }
          ]
        }
      },
      "type": "super-villain"
    },
    "included": [
      {
        "attributes": {
          "color": "Red",
          "name": "Tom's LightSaber"
        },
        "id": "1",
        "relationships": {},
        "type": "light-saber"
      },
      {
        "attributes": {
          "name": "The Death Star"
        },
        "id": "1",
        "relationships": {},
        "type": "secret-weapon"
      }
    ]
  }, "Custom primary key of embedded hasMany is correctly normalized");
});

test("normalizeResponse with polymorphic belongsTo", function() {
  SuperVillain.reopen({
    secretLab: DS.belongsTo("secretLab", { polymorphic: true, async: true })
  });

  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      secret_lab: {
        id: "1",
        type: "bat-cave",
        infiltrated: true
      }
    }
  };

  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "super-villain",
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "relationships": {
        "secretLab": {
          "data": { "id": "1", "type": "bat-cave" }
        }
      }
    },
    "included": [{
      "id": "1",
      "type": "bat-cave",
      "attributes": {
        "infiltrated": true
      },
      "relationships": {}
    }]
  }, "Primary has was correct");
});

test("normalizeResponse with polymorphic belongsTo and custom primary key", function() {
  expect(1);

  SuperVillain.reopen({
    secretLab: DS.belongsTo("secretLab", { polymorphic: true, async: true })
  });

  env.registry.register('adapter:super-villain', DS.ActiveModelAdapter);
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:bat-cave', DS.ActiveModelSerializer.extend({
    primaryKey: 'custom'
  }));
  var serializer = env.container.lookup("serializer:super-villain");

  var json_hash = {
    super_villain: {
      id: "1",
      first_name: "Tom",
      last_name: "Dale",
      secret_lab: {
        custom: "1",
        type: "bat-cave",
        infiltrated: true
      }
    }
  };

  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "attributes": {
        "firstName": "Tom",
        "lastName": "Dale"
      },
      "id": "1",
      "relationships": {
        "secretLab": {
          "data": {
            "id": "1",
            "type": "bat-cave"
          }
        }
      },
      "type": "super-villain"
    },
    "included": [
      {
        "attributes": {
          "infiltrated": true
        },
        "id": "1",
        "relationships": {},
        "type": "bat-cave"
      }
    ]
  }, "Custom primary key is correctly normalized");

});

test("Mixin can be used with RESTSerializer which does not define keyForAttribute", function() {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    secretLab = env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" });
    superVillain = env.store.createRecord('super-villain', {
      id: "1", firstName: "Super", lastName: "Villian", homePlanet: homePlanet, secretLab: secretLab
    });
    secretWeapon = env.store.createRecord('secret-weapon', { id: "1", name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('secretWeapons').pushObject(secretWeapon);
    evilMinion = env.store.createRecord('evil-minion', { id: "1", name: "Evil Minion", superVillian: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
  });

  env.registry.register('serializer:evil-minion', DS.RESTSerializer);
  env.registry.register('serializer:secret-weapon', DS.RESTSerializer);
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { serialize: 'records', deserialize: 'records' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");
  var json;

  run(function() {
    json = serializer.serialize(superVillain._createSnapshot());
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

test("normalize with custom belongsTo primary key", function() {
  env.registry.register('adapter:evil-minion', DS.ActiveModelAdapter);
  env.registry.register('serializer:evil-minion', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', DS.ActiveModelSerializer.extend({
    primaryKey: 'custom'
  }));

  var serializer = env.container.lookup("serializer:evil-minion");
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
  var json;

  run(function() {
    json = serializer.normalizeResponse(env.store, EvilMinion, json_hash, '1', 'findRecord');
  });

  deepEqual(json, {
    "data": {
      "id": "1",
      "type": "evil-minion",
      "attributes": {
        "name": "Alex"
      },
      "relationships": {
        "superVillain": {
          "data": { "id": "1", "type": "super-villain" }
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
      "relationships": {}
    }]
  }, "Primary hash was correct");
});

test("serializing relationships with an embedded and without calls super when not attr not present", function() {
  run(function() {
    homePlanet = env.store.createRecord('home-planet', { name: "Villain League", id: "123" });
    secretLab = env.store.createRecord('secret-lab', { minionCapacity: 5000, vicinity: "California, USA", id: "101" });
    superVillain = env.store.createRecord('super-villain', {
      id: "1", firstName: "Super", lastName: "Villian", homePlanet: homePlanet, secretLab: secretLab
    });
    secretWeapon = env.store.createRecord('secret-weapon', { id: "1", name: "Secret Weapon", superVillain: superVillain });
    superVillain.get('secretWeapons').pushObject(secretWeapon);
    evilMinion = env.store.createRecord('evil-minion', { id: "1", name: "Evil Minion", superVillian: superVillain });
    superVillain.get('evilMinions').pushObject(evilMinion);
  });

  var calledSerializeBelongsTo = false;
  var calledSerializeHasMany = false;

  var Serializer = DS.ActiveModelSerializer.extend({
    serializeBelongsTo: function(snapshot, json, relationship) {
      calledSerializeBelongsTo = true;
      return this._super(snapshot, json, relationship);
    },
    serializeHasMany: function(snapshot, json, relationship) {
      calledSerializeHasMany = true;
      var key = relationship.key;
      var payloadKey = this.keyForRelationship ? this.keyForRelationship(key, "hasMany") : key;
      var relationshipType = snapshot.type.determineRelationshipType(relationship);
      // "manyToOne" not supported in DS.ActiveModelSerializer.prototype.serializeHasMany
      var relationshipTypes = Ember.String.w('manyToNone manyToMany manyToOne');
      if (relationshipTypes.indexOf(relationshipType) > -1) {
        json[payloadKey] = snapshot.hasMany(key, { ids: true });
      }
    }
  });
  env.registry.register('serializer:evil-minion', Serializer);
  env.registry.register('serializer:secret-weapon', Serializer);
  env.registry.register('serializer:super-villain', Serializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { serialize: 'records', deserialize: 'records' }
      // some relationships are not listed here, so super should be called on those
      // e.g. secretWeapons: { serialize: 'ids' }
    }
  }));
  var serializer = env.container.lookup("serializer:super-villain");

  var json;
  run(function() {
    json = serializer.serialize(superVillain._createSnapshot());
  });

  deepEqual(json, {
    first_name: get(superVillain, "firstName"),
    last_name: get(superVillain, "lastName"),
    home_planet_id: "123",
    evil_minions: [{
      id: get(evilMinion, "id"),
      name: get(evilMinion, "name"),
      super_villain_id: "1"
    }],
    secret_lab_id: "101",
    // customized serializeHasMany method to generate ids for "manyToOne" relation
    secret_weapon_ids: ["1"]
  });
  ok(calledSerializeBelongsTo);
  ok(calledSerializeHasMany);
});

test("serializing belongsTo correctly removes embedded foreign key", function() {
  SecretWeapon.reopen({
    superVillain: null
  });
  EvilMinion.reopen({
    secretWeapon: DS.belongsTo('secret-weapon', { async: false }),
    superVillain: null
  });

  run(function() {
    secretWeapon = env.store.createRecord('secret-weapon', { name: "Secret Weapon" });
    evilMinion = env.store.createRecord('evil-minion', { name: "Evil Minion", secretWeapon: secretWeapon });
  });

  env.registry.register('serializer:evil-minion', DS.ActiveModelSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapon: { embedded: 'always' }
    }
  }));

  var serializer = env.container.lookup("serializer:evil-minion");
  var json;

  run(function() {
    json = serializer.serialize(evilMinion._createSnapshot());
  });

  deepEqual(json, {
    name: "Evil Minion",
    secret_weapon: {
      name: "Secret Weapon"
    }
  });
});
