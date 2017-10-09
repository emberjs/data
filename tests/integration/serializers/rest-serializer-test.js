import { camelize, decamelize, dasherize } from '@ember/string';
import Inflector, { singularize } from 'ember-inflector';
import { run, bind } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import { module, test } from 'qunit';
import { isEnabled } from 'ember-data/-private';

import DS from 'ember-data';

var HomePlanet, league, SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, Comment, Basket, Container, env;

module("integration/serializer/rest - RESTSerializer", {
  beforeEach() {
    HomePlanet = DS.Model.extend({
      name:          DS.attr('string'),
      superVillains: DS.hasMany('super-villain', { async: false })
    });
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      homePlanet:    DS.belongsTo('home-planet', { async: false }),
      evilMinions:   DS.hasMany('evil-minion', { async: false })
    });
    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('super-villain', { async: false }),
      name:         DS.attr('string'),
      doomsdayDevice: DS.belongsTo('doomsday-device', { async: false })
    });
    YellowMinion = EvilMinion.extend({
      eyes: DS.attr('number')
    });
    DoomsdayDevice = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinion:   DS.belongsTo('evil-minion', { polymorphic: true, async: true })
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      root: DS.attr('boolean'),
      children: DS.hasMany('comment', { inverse: null, async: false })
    });
    Basket = DS.Model.extend({
      type: DS.attr('string'),
      size: DS.attr('number')
    });
    Container = DS.Model.extend({
      type: DS.belongsTo('basket', { async: true }),
      volume: DS.attr('string')
    });
    env = setupStore({
      superVillain:   SuperVillain,
      homePlanet:     HomePlanet,
      evilMinion:     EvilMinion,
      yellowMinion:   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      comment:        Comment,
      basket:         Basket,
      container:      Container
    });
    env.store.modelFor('super-villain');
    env.store.modelFor('home-planet');
    env.store.modelFor('evil-minion');
    env.store.modelFor('yellow-minion');
    env.store.modelFor('doomsday-device');
    env.store.modelFor('comment');
    env.store.modelFor('basket');
    env.store.modelFor('container');
  },

  afterEach() {
    run(env.store, 'destroy');
  }
});

test("modelNameFromPayloadKey returns always same modelName even for uncountable multi words keys", function(assert) {
  assert.expect(2);
  Inflector.inflector.uncountable('words');
  var expectedModelName = 'multi-words';
  assert.equal(env.restSerializer.modelNameFromPayloadKey('multi_words'), expectedModelName);
  assert.equal(env.restSerializer.modelNameFromPayloadKey('multi-words'), expectedModelName);
});

test('normalizeResponse should extract meta using extractMeta', function(assert) {
  env.registry.register("serializer:home-planet", DS.RESTSerializer.extend({
    extractMeta(store, modelClass, payload) {
      let meta = this._super(...arguments);
      meta.authors.push('Tomhuda');
      return meta;
    }
  }));

  var jsonHash = {
    meta: { authors: ['Tomster'] },
    home_planets: [{ id: "1", name: "Umber", superVillains: [1] }]
  };

  var json = env.container.lookup("serializer:home-planet").normalizeResponse(env.store, HomePlanet, jsonHash, null, 'findAll');

  assert.deepEqual(json.meta.authors, ['Tomster', 'Tomhuda']);
});

test("normalizeResponse with custom modelNameFromPayloadKey", function(assert) {
  assert.expect(1);

  env.restSerializer.modelNameFromPayloadKey = function(root) {
    var camelized = camelize(root);
    return singularize(camelized);
  };
  env.registry.register('serializer:home-planet', DS.JSONSerializer);
  env.registry.register('serializer:super-villain', DS.JSONSerializer);

  var jsonHash = {
    home_planets: [{
      id: "1",
      name: "Umber",
      superVillains: [1]
    }],
    super_villains: [{
      id: "1",
      firstName: "Tom",
      lastName: "Dale",
      homePlanet: "1"
    }]
  };
  var array;

  run(function() {
    array = env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, '1', 'findRecord');
  });

  assert.deepEqual(array, {
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

testInDebug("normalizeResponse with type and custom modelNameFromPayloadKey", function(assert) {
  assert.expect(isEnabled("ds-payload-type-hooks") ? 3 : 2);

  var homePlanetNormalizeCount = 0;

  env.restSerializer.modelNameFromPayloadKey = function(root) {
    return "home-planet";
  };

  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend({
    normalize() {
      homePlanetNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var jsonHash = {
    "my-custom-type": [{ id: "1", name: "Umber", type: "my-custom-type" }]
  };
  var array;


  if (isEnabled("ds-payload-type-hooks")) {
    assert.expectDeprecation('You are using modelNameFromPayloadKey to normalize the type for a polymorphic relationship. This is has been deprecated in favor of modelNameFromPayloadType');
  }
  run(function() {
    array = env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, '1', 'findAll');
  });

  assert.deepEqual(array, {
    data: [{
      id: '1',
      type: 'home-planet',
      attributes: {
        name: 'Umber'
      },
      relationships: {}
    }],
    included: []
  });
  assert.equal(homePlanetNormalizeCount, 1, "homePlanet is normalized once");
});

testInDebug("normalizeResponse warning with custom modelNameFromPayloadKey", function(assert) {
  var homePlanet;
  var oldModelNameFromPayloadKey = env.restSerializer.modelNameFromPayloadKey;
  env.registry.register('serializer:super-villain', DS.JSONSerializer);
  env.registry.register('serializer:home-planet', DS.JSONSerializer);
  env.restSerializer.modelNameFromPayloadKey = function(root) {
    //return some garbage that won"t resolve in the container
    return "garbage";
  };

  var jsonHash = {
    home_planet: { id: "1", name: "Umber", superVillains: [1] }
  };

  assert.expectWarning(bind(null, function() {
    run(function() {
      env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, '1', 'findRecord');
    });
  }), /Encountered "home_planet" in payload, but no model was found for model name "garbage"/);

  // should not warn if a model is found.
  env.restSerializer.modelNameFromPayloadKey = oldModelNameFromPayloadKey;
  jsonHash = {
    home_planet: { id: "1", name: "Umber", superVillains: [1] }
  };

  assert.expectNoWarning(function() {
    run(function() {

      homePlanet = env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, 1, 'findRecord');
    });
  });

  assert.equal(homePlanet.data.attributes.name, "Umber");
  assert.deepEqual(homePlanet.data.relationships.superVillains.data, [{ id: '1', type: 'super-villain' }]);
});

testInDebug("normalizeResponse warning with custom modelNameFromPayloadKey", function(assert) {
  var homePlanets;
  env.registry.register('serializer:super-villain', DS.JSONSerializer);
  env.registry.register('serializer:home-planet', DS.JSONSerializer);
  env.restSerializer.modelNameFromPayloadKey = function(root) {
    //return some garbage that won"t resolve in the container
    return "garbage";
  };

  var jsonHash = {
    home_planets: [{ id: "1", name: "Umber", superVillains: [1] }]
  };

  assert.expectWarning(function() {
    env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
  }, /Encountered "home_planets" in payload, but no model was found for model name "garbage"/);

  // should not warn if a model is found.
  env.restSerializer.modelNameFromPayloadKey = function(root) {
    return camelize(singularize(root));
  };

  jsonHash = {
    home_planets: [{ id: "1", name: "Umber", superVillains: [1] }]
  };

  assert.expectNoWarning(function() {
    run(function() {
      homePlanets = env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
    });
  });

  assert.equal(homePlanets.data.length, 1);
  assert.equal(homePlanets.data[0].attributes.name, "Umber");
  assert.deepEqual(homePlanets.data[0].relationships.superVillains.data, [{ id: '1', type: 'super-villain' }]);
});

test("serialize polymorphicType", function(assert) {
  var tom, ray;
  run(function() {
    tom = env.store.createRecord('yellow-minion', { name: "Alex", id: "124" });
    ray = env.store.createRecord('doomsday-device', { evilMinion: tom, name: "DeathRay" });
  });

  var json = env.restSerializer.serialize(ray._createSnapshot());

  assert.deepEqual(json, {
    name:  "DeathRay",
    evilMinionType: "yellowMinion",
    evilMinion: "124"
  });
});

test("serialize polymorphicType with decamelized modelName", function(assert) {
  var tom, ray;
  run(function() {
    tom = env.store.createRecord('yellow-minion', { name: "Alex", id: "124" });
    ray = env.store.createRecord('doomsday-device', { evilMinion: tom, name: "DeathRay" });
  });

  var json = env.restSerializer.serialize(ray._createSnapshot());

  assert.deepEqual(json["evilMinionType"], "yellowMinion");
});

test("serialize polymorphic when associated object is null", function(assert) {
  var ray;
  run(function() {
    ray = env.store.createRecord('doomsday-device', { name: "DeathRay" });
  });

  var json = env.restSerializer.serialize(ray._createSnapshot());

  assert.deepEqual(json["evilMinionType"], null);
});

test("normalizeResponse loads secondary records with correct serializer", function(assert) {
  var superVillainNormalizeCount = 0;

  env.registry.register('serializer:evil-minion', DS.JSONSerializer);
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend({
    normalize() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var jsonHash = {
    evilMinion: { id: "1", name: "Tom Dale", superVillain: 1 },
    superVillains: [{ id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1" }]
  };

  run(function() {
    env.restSerializer.normalizeResponse(env.store, EvilMinion, jsonHash, '1', 'findRecord');
  });

  assert.equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

test("normalizeResponse returns null if payload contains null", function(assert) {
  assert.expect(1);

  var jsonHash = {
    evilMinion: null
  };
  var value;

  run(function() {
    value = env.restSerializer.normalizeResponse(env.store, EvilMinion, jsonHash, null, 'findRecord');
  });

  assert.deepEqual(value, { data: null, included: [] }, "returned value is null");
});

test("normalizeResponse loads secondary records with correct serializer", function(assert) {
  var superVillainNormalizeCount = 0;

  env.registry.register('serializer:evil-minion', DS.JSONSerializer);
  env.registry.register('serializer:super-villain', DS.RESTSerializer.extend({
    normalize() {
      superVillainNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  var jsonHash = {
    evilMinions: [{ id: "1", name: "Tom Dale", superVillain: 1 }],
    superVillains: [{ id: "1", firstName: "Yehuda", lastName: "Katz", homePlanet: "1" }]
  };

  run(function() {
    env.restSerializer.normalizeResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
  });

  assert.equal(superVillainNormalizeCount, 1, "superVillain is normalized once");
});

testInDebug('normalizeHash normalizes specific parts of the payload (DEPRECATED)', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    normalizeHash: {
      homePlanets(hash) {
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
    assert.expectDeprecation(function() {
      array = env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
    }, /`RESTSerializer.normalizeHash` has been deprecated/);
  });

  assert.deepEqual(array, {
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

testInDebug('normalizeHash has been deprecated', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({

    normalizeHash: {
      homePlanets(hash) {
        hash.id = hash._id;
        delete hash._id;
        return hash;
      }
    }
  }));

  var jsonHash = {
    homePlanets: [{ _id: "1", name: "Umber", superVillains: [1] }]
  };

  run(function() {
    assert.expectDeprecation(function() {
      env.restSerializer.normalizeResponse(env.store, HomePlanet, jsonHash, null, 'findAll');
    }, /`RESTSerializer.normalizeHash` has been deprecated/);
  });
});


testInDebug('normalizeHash works with transforms (DEPRECATED)', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    normalizeHash: {
      evilMinions(hash) {
        hash.condition = hash._condition;
        delete hash._condition;
        return hash;
      }
    }
  }));

  env.registry.register('transform:condition', DS.Transform.extend({
    deserialize(serialized) {
      if (serialized === 1) {
        return "healing";
      } else {
        return "unknown";
      }
    },
    serialize(deserialized) {
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
    assert.expectDeprecation(function() {
      array = env.restSerializer.normalizeResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
    }, /`RESTSerializer.normalizeHash` has been deprecated/);
  });

  assert.equal(array.data[0].attributes.condition, "healing");
});

test('normalize should allow for different levels of normalization', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    attrs: {
      superVillain: 'is_super_villain'
    },
    keyForAttribute(attr) {
      return decamelize(attr);
    }
  }));

  var jsonHash = {
    evilMinions: [{ id: "1", name: "Tom Dale", is_super_villain: 1 }]
  };
  var array;

  run(function() {
    array = env.restSerializer.normalizeResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
  });

  assert.equal(array.data[0].relationships.superVillain.data.id, 1);
});

test('normalize should allow for different levels of normalization - attributes', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend({
    attrs: {
      name: 'full_name'
    },
    keyForAttribute(attr) {
      return decamelize(attr);
    }
  }));

  var jsonHash = {
    evilMinions: [{ id: "1", full_name: "Tom Dale" }]
  };
  var array;

  run(function() {
    array = env.restSerializer.normalizeResponse(env.store, EvilMinion, jsonHash, null, 'findAll');
  });

  assert.equal(array.data[0].attributes.name, 'Tom Dale');
});

test("serializeIntoHash", function(assert) {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Umber", id: "123" });
  });
  var json = {};

  env.restSerializer.serializeIntoHash(json, HomePlanet, league._createSnapshot());

  assert.deepEqual(json, {
    homePlanet: {
      name: "Umber"
    }
  });
});

test("serializeIntoHash with decamelized modelName", function(assert) {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Umber", id: "123" });
  });
  var json = {};

  env.restSerializer.serializeIntoHash(json, HomePlanet, league._createSnapshot());

  assert.deepEqual(json, {
    homePlanet: {
      name: "Umber"
    }
  });
});

test('serializeBelongsTo with async polymorphic', function(assert) {
  var evilMinion, doomsdayDevice;
  var json = {};
  var expected = { evilMinion: '1', evilMinionType: 'evilMinion' };

  run(function() {
    evilMinion = env.store.createRecord('evil-minion', { id: 1, name: 'Tomster' });
    doomsdayDevice = env.store.createRecord('doomsday-device', { id: 2, name: 'Yehuda', evilMinion: evilMinion });
  });

  env.restSerializer.serializeBelongsTo(doomsdayDevice._createSnapshot(), json, { key: 'evilMinion', options: { polymorphic: true, async: true } });

  assert.deepEqual(json, expected, 'returned JSON is correct');
});

testInDebug('serializeBelongsTo logs deprecation when old behavior for getting polymorphic type key is used', function(assert) {
  var evilMinion, doomsdayDevice;
  var json = {};
  var expected = { evilMinion: '1', myCustomKeyType: 'evilMinion' };

  env.restSerializer.keyForAttribute = function() {
    return 'myCustomKey';
  };

  run(function() {
    evilMinion = env.store.createRecord('evil-minion', { id: 1, name: 'Tomster' });
    doomsdayDevice = env.store.createRecord('doomsday-device', { id: 2, name: 'Yehuda', evilMinion: evilMinion });
  });

  assert.expectDeprecation(function() {
    env.restSerializer.serializeBelongsTo(doomsdayDevice._createSnapshot(), json, { key: 'evilMinion', options: { polymorphic: true, async: true } });
  }, "The key to serialize the type of a polymorphic record is created via keyForAttribute which has been deprecated. Use the keyForPolymorphicType hook instead.");

  assert.deepEqual(json, expected, 'returned JSON is correct');
});

test('keyForPolymorphicType can be used to overwrite how the type of a polymorphic record is serialized', function(assert) {
  var evilMinion, doomsdayDevice;
  var json = {};
  var expected = { evilMinion: '1', typeForEvilMinion: 'evilMinion' };

  env.restSerializer.keyForPolymorphicType = function() {
    return 'typeForEvilMinion';
  };

  run(function() {
    evilMinion = env.store.createRecord('evil-minion', { id: 1, name: 'Tomster' });
    doomsdayDevice = env.store.createRecord('doomsday-device', { id: 2, name: 'Yehuda', evilMinion: evilMinion });
  });

  env.restSerializer.serializeBelongsTo(doomsdayDevice._createSnapshot(), json, { key: 'evilMinion', options: { polymorphic: true, async: true } });

  assert.deepEqual(json, expected, 'returned JSON is correct');
});

test('keyForPolymorphicType can be used to overwrite how the type of a polymorphic record is looked up for normalization', function(assert) {
  var json = {
    doomsdayDevice: {
      id: '1',
      evilMinion: '2',
      typeForEvilMinion: 'evilMinion'
    }
  };

  var expected = {
    data: {
      type: 'doomsday-device',
      id: '1',
      attributes: {},
      relationships: {
        evilMinion: {
          data: {
            type: 'evil-minion',
            id: '2'
          }
        }
      }
    },
    included: []
  };

  env.restSerializer.keyForPolymorphicType = function() {
    return 'typeForEvilMinion';
  };

  var normalized = env.restSerializer.normalizeResponse(env.store, DoomsdayDevice, json, null, 'findRecord');

  assert.deepEqual(normalized, expected, 'normalized JSON is correct');
});

test('serializeIntoHash uses payloadKeyFromModelName to normalize the payload root key', function(assert) {
  run(function() {
    league = env.store.createRecord('home-planet', { name: "Umber", id: "123" });
  });
  var json = {};
  env.registry.register('serializer:home-planet', DS.RESTSerializer.extend({
    payloadKeyFromModelName(modelName) {
      return dasherize(modelName);
    }
  }));

  let serializer = env.store.serializerFor('home-planet');

  serializer.serializeIntoHash(json, HomePlanet, league._createSnapshot());

  assert.deepEqual(json, {
    'home-planet': {
      name: "Umber"
    }
  });
});

test('normalizeResponse with async polymorphic belongsTo, using <relationshipName>Type', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());
  var store = env.store;
  env.adapter.findRecord = (store, type) => {
    if (type.modelName === 'doomsday-device') {
      return {
        doomsdayDevice: {
          id: 1,
          name: "DeathRay",
          evilMinion: 1,
          evilMinionType: 'yellowMinion'
        }
      };
    }

    assert.equal(type.modelName, 'yellow-minion');

    return {
      yellowMinion: {
        id: 1,
        type: 'yellowMinion',
        name: 'Alex',
        eyes: 3
      }
    };
  };

  run(function() {
    store.findRecord('doomsday-device', 1).then((deathRay) => {
      return deathRay.get('evilMinion');
    }).then((evilMinion) => {
      assert.equal(evilMinion.get('eyes'), 3);
    });
  });
});

test('normalizeResponse with async polymorphic belongsTo', function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());
  var store = env.store;
  env.adapter.findRecord = () => {
    return {
      doomsdayDevices: [{
        id: 1,
        name: "DeathRay",
        links: {
          evilMinion: '/doomsday-device/1/evil-minion'
        }
      }]
    };
  };

  env.adapter.findBelongsTo = () => {
    return {
      evilMinion: {
        id: 1,
        type: 'yellowMinion',
        name: 'Alex',
        eyes: 3
      }
    };
  };
  run(function() {
    store.findRecord('doomsday-device', 1).then((deathRay) => {
      return deathRay.get('evilMinion');
    }).then((evilMinion) => {
      assert.equal(evilMinion.get('eyes'), 3);
    });
  });
});

test('normalizeResponse with async polymorphic hasMany', function(assert) {
  SuperVillain.reopen({ evilMinions: DS.hasMany('evil-minion', { async: true, polymorphic: true }) });
  env.registry.register('serializer:application', DS.RESTSerializer.extend());
  var store = env.store;
  env.adapter.findRecord = () => {
    return {
      superVillains: [{
        id: "1",
        firstName: "Yehuda",
        lastName: "Katz",
        links: {
          evilMinions: '/super-villain/1/evil-minions'
        }
      }]
    };
  };

  env.adapter.findHasMany = () => {
    return {
      evilMinion: [{
        id: 1,
        type: 'yellowMinion',
        name: 'Alex',
        eyes: 3
      }]
    };
  };
  run(function() {
    store.findRecord('super-villain', 1).then((superVillain) => {
      return superVillain.get('evilMinions');
    }).then((evilMinions) => {
      assert.ok(evilMinions.get('firstObject') instanceof YellowMinion);
      assert.equal(evilMinions.get('firstObject.eyes'), 3);
    });
  });
});

test("normalizeResponse can load secondary records of the same type without affecting the query count", function(assert) {
  var jsonHash = {
    comments: [{ id: "1", body: "Parent Comment", root: true, children: [2, 3] }],
    _comments: [
      { id: "2", body: "Child Comment 1", root: false },
      { id: "3", body: "Child Comment 2", root: false }
    ]
  };
  var array;
  env.registry.register('serializer:comment', DS.JSONSerializer);

  run(function() {
    array = env.restSerializer.normalizeResponse(env.store, Comment, jsonHash, '1', 'findRecord');
  });

  assert.deepEqual(array, {
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
});

test("don't polymorphically deserialize base on the type key in payload when a type attribute exist", function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());

  run(function() {
    env.store.push(env.restSerializer.normalizeArrayResponse(env.store, Basket, {
      basket: [
        { type: 'bamboo', size: 10, id: '1' },
        { type: 'yellowMinion', size: 10, id: '65536' }
      ]
    }));
  });

  const normalRecord = env.store.peekRecord('basket', '1');
  assert.ok(normalRecord, "payload with type that doesn't exist");
  assert.strictEqual(normalRecord.get('type'), 'bamboo');
  assert.strictEqual(normalRecord.get('size'), 10);

  const clashingRecord = env.store.peekRecord('basket', '65536');
  assert.ok(clashingRecord, 'payload with type that matches another model name');
  assert.strictEqual(clashingRecord.get('type'), 'yellowMinion');
  assert.strictEqual(clashingRecord.get('size'), 10);
});

test("don't polymorphically deserialize base on the type key in payload when a type attribute exist on a singular response", function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());

  run(function() {
    env.store.push(env.restSerializer.normalizeSingleResponse(env.store, Basket, {
      basket: { type: 'yellowMinion', size: 10, id: '65536' }
    }, '65536'));
  });

  const clashingRecord = env.store.peekRecord('basket', '65536');
  assert.ok(clashingRecord, 'payload with type that matches another model name');
  assert.strictEqual(clashingRecord.get('type'), 'yellowMinion');
  assert.strictEqual(clashingRecord.get('size'), 10);
});


test("don't polymorphically deserialize based on the type key in payload when a relationship exists named type", function(assert) {
  env.registry.register('serializer:application', DS.RESTSerializer.extend());

  env.adapter.findRecord = () => {
    return {
      containers: [{ id: 42, volume: '10 liters', type: 1 }],
      baskets: [{ id: 1, size: 4 }]
    };
  };

  run(function() {
    env.store.findRecord('container', 42).then((container) => {
      assert.strictEqual(container.get('volume'), '10 liters');
      return container.get('type');
    }).then((basket) => {
      assert.ok(basket instanceof Basket);
      assert.equal(basket.get('size'), 4);
    });
  });

});

test('Serializer should respect the attrs hash in links', function(assert) {
  env.registry.register("serializer:super-villain", DS.RESTSerializer.extend({
    attrs: {
      evilMinions: { key: 'my_minions' }
    }
  }));

  var jsonHash = {
    "super-villains": [
      {
        firstName: 'Tom',
        lastName: 'Dale',
        links: {
          my_minions: 'me/minions'
        }
      }
    ]
  };

  var documentHash = env.container.lookup("serializer:super-villain").normalizeSingleResponse(env.store, SuperVillain, jsonHash);

  assert.equal(documentHash.data.relationships.evilMinions.links.related, 'me/minions');
});

// https://github.com/emberjs/data/issues/3805
test('normalizes sideloaded single record so that it sideloads correctly - belongsTo - GH-3805', function(assert) {
  env.registry.register('serializer:evil-minion', DS.JSONSerializer);
  env.registry.register("serializer:doomsday-device", DS.RESTSerializer.extend());
  let payload = {
    doomsdayDevice: {
      id: 1,
      evilMinion: 2
    },
    evilMinion: {
      id: 2,
      doomsdayDevice: 1
    }
  };

  let document = env.store.serializerFor('doomsday-device').normalizeSingleResponse(env.store, DoomsdayDevice, payload);
  assert.equal(document.data.relationships.evilMinion.data.id, 2);
  assert.equal(document.included.length, 1);
  assert.deepEqual(document.included[0], {
    attributes: {},
    id: '2',
    type: 'evil-minion',
    relationships: {
      doomsdayDevice: {
        data: {
          id: '1',
          type: 'doomsday-device'
        }
      }
    }
  });
});

// https://github.com/emberjs/data/issues/3805
test('normalizes sideloaded single record so that it sideloads correctly - hasMany - GH-3805', function(assert) {
  env.registry.register('serializer:super-villain', DS.JSONSerializer);
  env.registry.register("serializer:home-planet", DS.RESTSerializer.extend());
  let payload = {
    homePlanet: {
      id: 1,
      superVillains: [2]
    },
    superVillain: {
      id: 2,
      homePlanet: 1
    }
  };

  let document = env.store.serializerFor('home-planet').normalizeSingleResponse(env.store, HomePlanet, payload);

  assert.equal(document.data.relationships.superVillains.data.length, 1);
  assert.equal(document.data.relationships.superVillains.data[0].id, 2);
  assert.equal(document.included.length, 1);
  assert.deepEqual(document.included[0], {
    attributes: {},
    id: '2',
    type: 'super-villain',
    relationships: {
      homePlanet: {
        data: {
          id: '1',
          type: 'home-planet'
        }
      }
    }
  });
});

if (isEnabled("ds-payload-type-hooks")) {

  test("mapping of payload type can be customized via modelNameFromPayloadType", function(assert) {
    env.restSerializer.modelNameFromPayloadType = function(payloadType) {
      return payloadType.replace("api::v1::", "");
    };

    var jsonHash = {
      doomsdayDevice: {
        id: '1',
        evilMinion: '1',
        evilMinionType: "api::v1::evil-minion"
      }
    };

    assert.expectNoDeprecation();

    let normalized = env.restSerializer.normalizeResponse(env.store, DoomsdayDevice, jsonHash, '1', 'findRecord');

    assert.deepEqual(normalized, {
      data: {
        id: '1',
        type: 'doomsday-device',
        attributes: {},
        relationships: {
          evilMinion: {
            data: {
              id: '1',
              type: 'evil-minion'
            }
          }
        }
      },
      included: []
    });
  });

  test("payload key and payload type can be mapped", function(assert) {
    env.restSerializer.modelNameFromPayloadKey = function(payloadKey) {
      return 'doomsday-device';
    };

    env.restSerializer.modelNameFromPayloadType = function(payloadType) {
      return payloadType.replace("api::v1::", "");
    };

    var jsonHash = {
      "api/models/doomsday-device": {
        id: '1',
        evilMinion: '1',
        evilMinionType: "api::v1::evil-minion"
      }
    };

    assert.expectNoDeprecation();

    let normalized = env.restSerializer.normalizeResponse(env.store, DoomsdayDevice, jsonHash, '1', 'findRecord');

    assert.deepEqual(normalized, {
      data: {
        id: '1',
        type: 'doomsday-device',
        attributes: {},
        relationships: {
          evilMinion: {
            data: {
              id: '1',
              type: 'evil-minion'
            }
          }
        }
      },
      included: []
    });
  });

  test("only overwriting modelNameFromPayloadKey works", function(assert) {
    env.restSerializer.modelNameFromPayloadKey = function(payloadKey) {
      return payloadKey.replace("api/models/", "");
    };

    var jsonHash = {
      "api/models/doomsday-device": {
        id: '1',
        evilMinion: '1',
        evilMinionType: "evil-minion"
      }
    };

    assert.expectNoDeprecation();

    let normalized = env.restSerializer.normalizeResponse(env.store, DoomsdayDevice, jsonHash, '1', 'findRecord');

    assert.deepEqual(normalized, {
      data: {
        id: '1',
        type: 'doomsday-device',
        attributes: {},
        relationships: {
          evilMinion: {
            data: {
              id: '1',
              type: 'evil-minion'
            }
          }
        }
      },
      included: []
    });
  });

  testInDebug("DEPRECATED - mapping of payload type can be customized via modelNameFromPayloadKey", function(assert) {
    env.restSerializer.modelNameFromPayloadKey = function(payloadType) {
      return payloadType.replace("api::v1::", "");
    };

    var jsonHash = {
      doomsdayDevice: {
        id: '1',
        evilMinion: '1',
        evilMinionType: "api::v1::evil-minion"
      }
    };

    assert.expectDeprecation("You are using modelNameFromPayloadKey to normalize the type for a polymorphic relationship. This has been deprecated in favor of modelNameFromPayloadType");

    let normalized = env.restSerializer.normalizeResponse(env.store, DoomsdayDevice, jsonHash, '1', 'findRecord');

    assert.deepEqual(normalized, {
      data: {
        id: '1',
        type: 'doomsday-device',
        attributes: {},
        relationships: {
          evilMinion: {
            data: {
              id: '1',
              type: 'evil-minion'
            }
          }
        }
      },
      included: []
    });
  });

  test("mapping of model name can be customized via payloadTypeFromModelName", function(assert) {
    env.restSerializer.payloadTypeFromModelName = function(modelName) {
      return `api::v1::${modelName}`;
    };

    let tom, ray;
    run(function() {
      tom = env.store.createRecord('yellow-minion', { name: "Alex", id: "124" });
      ray = env.store.createRecord('doomsday-device', { evilMinion: tom, name: "DeathRay" });
    });

    assert.expectNoDeprecation();

    let json = env.restSerializer.serialize(ray._createSnapshot());

    assert.deepEqual(json, {
      name: "DeathRay",
      evilMinion: "124",
      evilMinionType: "api::v1::yellow-minion"
    });
  });

}
