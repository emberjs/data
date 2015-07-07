var HomePlanet, SuperVillain, EvilMinion, SecretLab, SecretWeapon, BatCave, Comment, env;
var run = Ember.run;
var LightSaber;
var TestSerializer;

module("integration/embedded_records_mixin - EmbeddedRecordsMixin (new API)", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:       DS.attr('string'),
      lastName:        DS.attr('string'),
      homePlanet:      DS.belongsTo("homePlanet", { inverse: 'villains', async: true }),
      secretLab:       DS.belongsTo("secretLab", { async: false }),
      secretWeapons:   DS.hasMany("secretWeapon", { async: false }),
      evilMinions:     DS.hasMany("evilMinion", { async: false })
    });
    HomePlanet = DS.Model.extend({
      name:            DS.attr('string'),
      villains:        DS.hasMany('superVillain', { inverse: 'homePlanet', async: false })
    });
    SecretLab = DS.Model.extend({
      minionCapacity:  DS.attr('number'),
      vicinity:        DS.attr('string'),
      superVillain:    DS.belongsTo('superVillain', { async: false })
    });
    BatCave = SecretLab.extend({
      infiltrated:     DS.attr('boolean')
    });
    SecretWeapon = DS.Model.extend({
      name:            DS.attr('string'),
      superVillain:    DS.belongsTo('superVillain', { async: false })
    });
    LightSaber = SecretWeapon.extend({
      color:           DS.attr('string')
    });
    EvilMinion = DS.Model.extend({
      superVillain:    DS.belongsTo('superVillain', { async: false }),
      name:            DS.attr('string')
    });
    Comment = DS.Model.extend({
      body:            DS.attr('string'),
      root:            DS.attr('boolean'),
      children:        DS.hasMany('comment', { inverse: null, async: false })
    });
    TestSerializer = DS.RESTSerializer.extend({
      isNewSerializerAPI: true
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
    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('secretLab');
    env.store.modelFor('batCave');
    env.store.modelFor('secretWeapon');
    env.store.modelFor('lightSaber');
    env.store.modelFor('evilMinion');
    env.store.modelFor('comment');

    env.registry.register('serializer:application', TestSerializer.extend(DS.EmbeddedRecordsMixin));
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("normalizeSingleResponse with embedded objects", function() {
  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:super-villain', TestSerializer.extend());
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "2",
        firstName: "Tom",
        lastName: "Dale"
      }]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeSingleResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
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

test("normalizeSingleResponse with embedded objects inside embedded objects", function() {
  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      evilMinions: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:evil-minion', TestSerializer);

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Umber",
      villains: [{
        id: "2",
        firstName: "Tom",
        lastName: "Dale",
        evilMinions: [{
          id: "3",
          name: "Alex"
        }]
      }]
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeSingleResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
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

test("normalizeSingleResponse with embedded objects of same type", function() {
  env.registry.register('adapter:comment', DS.RESTAdapter);
  env.registry.register('serializer:comment', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("comment");
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
    json = serializer.normalizeSingleResponse(env.store, Comment, json_hash, '1', 'findRecord');
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

test("normalizeSingleResponse with embedded objects inside embedded objects of same type", function() {
  env.registry.register('adapter:comment', DS.RESTAdapter);
  env.registry.register('serializer:comment', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("comment");
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
    json = serializer.normalizeSingleResponse(env.store, Comment, json_hash, '1', 'findRecord');
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

test("normalizeSingleResponse with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', { inverse: null, async: false })
  });

  env.registry.register('adapter:home-planet', DS.RESTAdapter);
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' },
      reformedVillains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer);

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanet: {
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        firstName: "Tom"
      }, {
        id: "3",
        firstName: "Yehuda"
      }],
      reformedVillains: [{
        id: "2",
        firstName: "Alex"
      },{
        id: "4",
        firstName: "Erik"
      }]
    }
  };
  var json;
  run(function() {
    json = serializer.normalizeSingleResponse(env.store, HomePlanet, json_hash, '1', 'findRecord');
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

test("normalizeArrayResponse with embedded objects", function() {
  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer);

  var serializer = env.store.serializerFor("home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        firstName: "Tom",
        lastName: "Dale"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeArrayResponse(env.store, HomePlanet, json_hash, null, 'findAll');
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

test("normalizeArrayResponse with embedded objects with custom primary key", function() {
  expect(1);
  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:super-villain', TestSerializer.extend({
    primaryKey: 'villain_id'
  }));
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        villain_id: "2",
        firstName: "Alex",
        lastName: "Baizeau"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeArrayResponse(env.store, HomePlanet, json_hash, null, 'findAll');
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

test("normalizeArrayResponse with embedded objects with identical relationship and attribute key ", function() {
  expect(1);
  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' }
    },
    //Makes the keyForRelationship and keyForAttribute collide.
    keyForRelationship: function(key, type) {
      return this.keyForAttribute(key, type);
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer);

  var serializer = env.store.serializerFor("home-planet");

  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Umber",
      villains: [{
        id: "1",
        firstName: "Alex",
        lastName: "Baizeau"
      }]
    }]
  };
  var array;

  run(function() {
    array = serializer.normalizeArrayResponse(env.store, HomePlanet, json_hash, null, 'findAll');
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
test("normalizeArrayResponse with embedded objects of same type as primary type", function() {
  env.registry.register('adapter:comment', DS.RESTAdapter);
  env.registry.register('serializer:comment', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      children: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("comment");

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
    array = serializer.normalizeArrayResponse(env.store, Comment, json_hash, null, 'findAll');
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

test("normalizeArrayResponse with embedded objects of same type, but from separate attributes", function() {
  HomePlanet.reopen({
    reformedVillains: DS.hasMany('superVillain', { async: false })
  });

  env.registry.register('adapter:home-planet', DS.RESTAdapter);
  env.registry.register('serializer:home-planet', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      villains: { embedded: 'always' },
      reformedVillains: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer);

  var serializer = env.store.serializerFor("home-planet");
  var json_hash = {
    homePlanets: [{
      id: "1",
      name: "Earth",
      villains: [{
        id: "1",
        firstName: "Tom"
      },{
        id: "3",
        firstName: "Yehuda"
      }],
      reformedVillains: [{
        id: "2",
        firstName: "Alex"
      },{
        id: "4",
        firstName: "Erik"
      }]
    },{
      id: "2",
      name: "Mars",
      villains: [{
        id: "1",
        firstName: "Tom"
      },{
        id: "3",
        firstName: "Yehuda"
      }],
      reformedVillains: [{
        id: "5",
        firstName: "Peter"
      },{
        id: "6",
        firstName: "Trek"
      }]
    }]
  };

  var json;
  run(function() {
    json = serializer.normalizeArrayResponse(env.store, HomePlanet, json_hash, null, 'findAll');
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

test("normalizeSingleResponse with embedded object (belongsTo relationship)", function() {
  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:super-villain', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  //env.registry.register('serializer:secret-lab', TestSerializer);

  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    superVillain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      homePlanet: "123",
      evilMinions: ["1", "2", "3"],
      secretLab: {
        minionCapacity: 5000,
        vicinity: "California, USA",
        id: "101"
      },
      secretWeapons: []
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeSingleResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
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

test("normalizeSingleResponse with multiply-nested belongsTo", function() {
  env.registry.register('adapter:evil-minion', DS.RESTAdapter);
  env.registry.register('serializer:evil-minion', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      homePlanet: { embedded: 'always' }
    }
  }));

  var serializer = env.store.serializerFor("evil-minion");
  var json_hash = {
    evilMinion: {
      id: "1",
      name: "Alex",
      superVillain: {
        id: "1",
        firstName: "Tom",
        lastName: "Dale",
        evilMinions: ["1"],
        homePlanet: {
          id: "1",
          name: "Umber",
          villains: ["1"]
        }
      }
    }
  };
  var json;

  run(function() {
    json = serializer.normalizeSingleResponse(env.store, EvilMinion, json_hash, '1', 'findRecord');
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

test("normalizeSingleResponse with polymorphic hasMany", function() {
  SuperVillain.reopen({
    secretWeapons: DS.hasMany("secretWeapon", { polymorphic: true, async: false })
  });

  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:super-villain', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretWeapons: { embedded: 'always' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    superVillain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      secretWeapons: [
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
    json = serializer.normalizeSingleResponse(env.store, SuperVillain, json_hash, '1', 'findAll');
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

test("normalizeSingleResponse with polymorphic belongsTo", function() {
  SuperVillain.reopen({
    secretLab: DS.belongsTo("secretLab", { polymorphic: true, async: true })
  });

  env.registry.register('adapter:super-villain', DS.RESTAdapter);
  env.registry.register('serializer:super-villain', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      secretLab: { embedded: 'always' }
    }
  }));
  var serializer = env.store.serializerFor("super-villain");

  var json_hash = {
    superVillain: {
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      secretLab: {
        id: "1",
        type: "bat-cave",
        infiltrated: true
      }
    }
  };

  var json;

  run(function() {
    json = serializer.normalizeSingleResponse(env.store, SuperVillain, json_hash, '1', 'findRecord');
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

test("normalize with custom belongsTo primary key", function() {
  env.registry.register('adapter:evil-minion', DS.RESTAdapter);
  env.registry.register('serializer:evil-minion', TestSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      superVillain: { embedded: 'always' }
    }
  }));
  env.registry.register('serializer:super-villain', TestSerializer.extend({
    primaryKey: 'custom'
  }));

  var serializer = env.store.serializerFor("evil-minion");
  var json_hash = {
    evil_minion: {
      id: "1",
      name: "Alex",
      superVillain: {
        custom: "1",
        firstName: "Tom",
        lastName: "Dale"
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
