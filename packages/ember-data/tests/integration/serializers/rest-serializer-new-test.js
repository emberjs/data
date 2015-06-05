var HomePlanet, SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, Comment, TestSerializer, env;
var run = Ember.run;

module("integration/serializer/rest - RESTSerializer (new API)", {
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
      evilMinion:   DS.belongsTo('evilMinion', { polymorphic: true })
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      root: DS.attr('boolean'),
      children: DS.hasMany('comment', { inverse: null })
    });
    TestSerializer = DS.RESTSerializer.extend({
      isNewSerializerAPI: true
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      comment:        Comment
    });

    //env.registry.register('serializer:application', TestSerializer.extend());

    env.store.modelFor('superVillain');
    env.store.modelFor('homePlanet');
    env.store.modelFor('evilMinion');
    env.store.modelFor('yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('comment');

    env.registry.register('serializer:application', TestSerializer);
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

if (Ember.FEATURES.isEnabled('ds-new-serializer-api')) {

  test("normalizeSingleResponse with custom modelNameFromPayloadKey", function() {
    expect(1);

    env.restNewSerializer.modelNameFromPayloadKey = function(root) {
      var camelized = Ember.String.camelize(root);
      return Ember.String.singularize(camelized);
    };

    var jsonHash = {
      home_planets: [{ id: "1", name: "Umber", superVillains: [1] }],
      super_villains: [{ id: "1", firstName: "Tom", lastName: "Dale", homePlanet: "1" }]
    };
    var array;

    run(function() {
      array = env.container.lookup("serializer:application").normalizeSingleResponse(env.store, HomePlanet, jsonHash, '1', 'find');
    });

    deepEqual(array, {
      data: {
        id: '1',
        type: 'home-planet',
        attributes: {
          name: 'Umber'
        },
        relationships: {
          superVillains: {
            data: [{ id: '1', type: 'super-villain' }]
          }
        }
      },
      included: [{
        id: '1',
        type: 'super-villain',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale'
        },
        relationships: {
          homePlanet: {
            data: { id: '1', type: 'home-planet' }
          }
        }
      }]
    });
  });

  test("normalizeArrayResponse warning with custom modelNameFromPayloadKey", function() {
    var homePlanets;
    env.restNewSerializer.modelNameFromPayloadKey = function(root) {
      //return some garbage that won"t resolve in the container
      return "garbage";
    };

    var jsonHash = {
      home_planets: [{ id: "1", name: "Umber", superVillains: [1] }]
    };

    warns(function() {
      env.restNewSerializer.normalizeArrayResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
    }, /Encountered "home_planets" in payload, but no model was found for model name "garbage"/);

    // should not warn if a model is found.
    env.restNewSerializer.modelNameFromPayloadKey = function(root) {
      return Ember.String.camelize(Ember.String.singularize(root));
    };

    jsonHash = {
      home_planets: [{ id: "1", name: "Umber", superVillains: [1] }]
    };

    noWarns(function() {
      run(function() {
        homePlanets = env.restNewSerializer.normalizeArrayResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
      });
    });

    equal(homePlanets.data.length, 1);
    equal(homePlanets.data[0].attributes.name, "Umber");
    deepEqual(homePlanets.data[0].relationships.superVillains.data, [{ id: '1', type: 'super-villain' }]);
  });

  test("normalizeSingleResponse warning with custom modelNameFromPayloadKey", function() {
    var homePlanet;
    var oldModelNameFromPayloadKey = env.restNewSerializer.modelNameFromPayloadKey;
    env.restNewSerializer.modelNameFromPayloadKey = function(root) {
      //return some garbage that won"t resolve in the container
      return "garbage";
    };

    var jsonHash = {
      home_planet: { id: "1", name: "Umber", superVillains: [1] }
    };

    warns(Ember.run.bind(null, function() {
      run(function() {
        env.restNewSerializer.normalizeSingleResponse(env.store, HomePlanet, jsonHash, '1', 'find');
      });
    }), /Encountered "home_planet" in payload, but no model was found for model name "garbage"/);

    // should not warn if a model is found.
    env.restNewSerializer.modelNameFromPayloadKey = oldModelNameFromPayloadKey;
    jsonHash = {
      home_planet: { id: "1", name: "Umber", superVillains: [1] }
    };

    noWarns(function() {
      run(function() {
        homePlanet = env.restNewSerializer.normalizeSingleResponse(env.store, HomePlanet, jsonHash, 1, 'find');
      });
    });

    equal(homePlanet.data.attributes.name, "Umber");
    deepEqual(homePlanet.data.relationships.superVillains.data, [{ id: '1', type: 'super-villain' }]);
  });

  test("normalizeResponse can load secondary records of the same type without affecting the query count", function() {
    var jsonHash = {
      comments: [{ id: "1", body: "Parent Comment", root: true, children: [2, 3] }],
      _comments: [
        { id: "2", body: "Child Comment 1", root: false },
        { id: "3", body: "Child Comment 2", root: false }
      ]
    };
    var array;

    run(function() {
      array = env.restNewSerializer.normalizeResponse(env.store, Comment, jsonHash, '1', 'find');
    });

    deepEqual(array, {
      "data": {
        "id": "1",
        "type": "comment",
        "attributes": {
          "body": "Parent Comment",
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
          "body": "Child Comment 1",
          "root": false
        },
        "relationships": {}
      }, {
        "id": "3",
        "type": "comment",
        "attributes": {
          "body": "Child Comment 2",
          "root": false
        },
        "relationships": {}
      }]
    });

    // normalizeResponse does not push records to the store
    //equal(env.store.recordForId("comment", "2").get("body"), "Child Comment 1", "Secondary records are in the store");
    //equal(env.store.recordForId("comment", "3").get("body"), "Child Comment 2", "Secondary records are in the store");
  });

  test("normalizeSingleResponse loads secondary records with correct serializer", function() {
    var superVillainNormalizeCount = 0;

    env.registry.register('serializer:super-villain', TestSerializer.extend({
      normalize: function() {
        superVillainNormalizeCount++;
        return this._super.apply(this, arguments);
      }
    }));

    var jsonHash = {
      evilMinion: { id: "1", name: "Tom Dale", superVillain: 1 },
      superVillains: [{ id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1" }]
    };

    run(function() {
      env.restNewSerializer.normalizeSingleResponse(env.store, EvilMinion, jsonHash, '1', 'find');
    });

    equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
  });

  test("normalizeSingleResponse returns null if payload contains null", function() {
    expect(1);

    var jsonHash = {
      evilMinion: null
    };
    var value;

    run(function() {
      value = env.restNewSerializer.normalizeSingleResponse(env.store, EvilMinion, jsonHash, null, 'find');
    });

    deepEqual(value, { data: null, included: [] }, "returned value is null");
  });

  test("normalizeArrayResponse loads secondary records with correct serializer", function() {
    var superVillainNormalizeCount = 0;

    env.registry.register('serializer:super-villain', TestSerializer.extend({
      normalize: function() {
        superVillainNormalizeCount++;
        return this._super.apply(this, arguments);
      }
    }));

    var jsonHash = {
      evilMinions: [{ id: "1", name: "Tom Dale", superVillain: 1 }],
      superVillains: [{ id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1" }]
    };

    run(function() {
      env.restNewSerializer.normalizeArrayResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
    });

    equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
  });

  test('normalizeHash normalizes specific parts of the payload', function() {
    env.registry.register('serializer:application', TestSerializer.extend({
      normalizeHash: {
        homePlanets: function(hash) {
          hash.id = hash._id;
          delete hash._id;
          return hash;
        }
      }
    }));

    var jsonHash = {
      homePlanets: [{ _id: "1", name: "Umber", superVillains: [1] }]
    };
    var array;

    run(function() {
      array = env.restNewSerializer.normalizeArrayResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
    });

    deepEqual(array, {
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
      "included": []
    });

  });

  test('normalizeHash works with transforms', function() {
    env.registry.register('serializer:application', TestSerializer.extend({
      normalizeHash: {
        evilMinions: function(hash) {
          hash.condition = hash._condition;
          delete hash._condition;
          return hash;
        }
      }
    }));

    env.registry.register('transform:condition', DS.Transform.extend({
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
      evilMinions: [{ id: "1", name: "Tom Dale", superVillain: 1, _condition: 1 }]
    };
    var array;

    run(function() {
      array = env.restNewSerializer.normalizeArrayResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
    });

    equal(array.data[0].attributes.condition, "healing");
  });

  test('normalize should allow for different levels of normalization', function() {
    env.registry.register('serializer:application', TestSerializer.extend({
      attrs: {
        superVillain: 'is_super_villain'
      },
      keyForAttribute: function(attr) {
        return Ember.String.decamelize(attr);
      }
    }));

    var jsonHash = {
      evilMinions: [{ id: "1", name: "Tom Dale", is_super_villain: 1 }]
    };
    var array;

    run(function() {
      array = env.restNewSerializer.normalizeArrayResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
    });

    equal(array.data[0].relationships.superVillain.data.id, 1);
  });

}
